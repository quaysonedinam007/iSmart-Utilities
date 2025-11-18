const prisma = require("../../config/db");
const { randomUUID } = require("crypto");
const HubtelHandler = require("../../utils/hubtelHandler");

class TelecelDataService {
  static TELECEL_DATA_SERVICE_ID = "fa27127ba039455da04a2ac8a1613e00";

  static async queryBundles(destination) {
    if (!destination) {
      return {
        success: false,
        status: 400,
        message: "Destination (phone number) is required"
      };
    }

    try {
      const hubtel = new HubtelHandler();
      const url = hubtel.buildCommissionServiceUrl(TelecelDataService.TELECEL_DATA_SERVICE_ID);
      const response = await hubtel.client.get(url, { params: { destination } });
      const body = response.data || {};
      const bundles = Array.isArray(body.Data)
        ? body.Data.map((item) => ({
            display: item?.Display || null,
            value: item?.Value || null,
            amount: item?.Amount ?? null
          }))
        : [];

      return {
        success: true,
        data: {
          responseCode: body.ResponseCode || null,
          message: body.Message || null,
          label: body.Label || null,
          bundles
        }
      };
    } catch (error) {
      console.error("[TelecelDataService] queryBundles error:", error?.response?.data || error.message);
      return {
        success: false,
        status: error.response?.status || 500,
        message:
          error.response?.data?.Message ||
          error.response?.data?.message ||
          error.message ||
          "Failed to query Telecel data bundles"
      };
    }
  }

  static async buyBundle(payload, headers) {
    const { Destination, Amount, ClientReference, CallbackUrl, BundleValue } = payload || {};
    const { customer_id, service_id } = headers || {};

    if (!customer_id || !service_id) {
      return {
        success: false,
        status: 400,
        message: "Missing required headers: customer_id and service_id"
      };
    }

    if (!Destination || !BundleValue || !CallbackUrl) {
      return {
        success: false,
        status: 400,
        message: "Destination, BundleValue and CallbackUrl are required"
      };
    }

    const amountNumber = Number(Amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return {
        success: false,
        status: 400,
        message: "Amount must be a positive number"
      };
    }

    const reference = ClientReference || `TDAT-${Date.now()}`;
    const idempotency = randomUUID();

    try {
      const wallet = await prisma.wallet.findFirst({ where: { user_id: customer_id } });
      if (!wallet) {
        return { success: false, status: 404, message: "Wallet not found" };
      }

      if (Number(wallet.balance) < amountNumber) {
        return { success: false, status: 400, message: "Insufficient wallet balance" };
      }

      const result = await prisma.$transaction(async (tx) => {
        const utility = await tx.utilities.create({
          data: {
            amount: amountNumber,
            user_id: customer_id,
            user_type: "CUSTOMER",
            service_id,
            request_details: payload,
            reference,
            callback_url: CallbackUrl,
            channel: "WALLET",
            status: "PENDING"
          }
        });

        const txn = await tx.transactions.create({
          data: {
            customer_id,
            transaction_type: "DEBIT",
            reference,
            idempotency_key: idempotency,
            wallet_address: wallet.wallet_address,
            amount: amountNumber,
            currency: "GHS",
            channel: "WALLET",
            status: "PENDING",
            description: `Telecel data purchase for ${Destination}`,
            balance_before: wallet.balance,
            balance_after: Number(wallet.balance) - amountNumber,
            related_service_id: utility.id,
            service_id,
            system_reference: `DATT-${Date.now()}`,
            user_type: "CUSTOMER",
            service_type: "data bundle"
          }
        });

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: Number(wallet.balance) - amountNumber
          }
        });

        return { utility, txn, updatedWallet };
      });

      const requestBody = {
        Destination,
        Amount: amountNumber,
        CallbackUrl,
        ClientReference: reference,
        Extradata: { Bundle: String(BundleValue) }
      };

      const hubtel = new HubtelHandler();
      const hubtelResponse = await hubtel.sendCommissionRequest(
        TelecelDataService.TELECEL_DATA_SERVICE_ID,
        requestBody
      );

      if (!hubtelResponse.success) {
        await TelecelDataService.#markFailure(reference, amountNumber, service_id, customer_id, hubtelResponse.message);
        return {
          success: false,
          status: hubtelResponse.status || 502,
          message:
            typeof hubtelResponse.message === "string"
              ? hubtelResponse.message
              : "Hubtel data purchase failed"
        };
      }

      return {
        success: true,
        data: {
          wallet: result.updatedWallet,
          utility: result.utility,
          transaction: result.txn,
          hubtel: hubtelResponse.data
        }
      };
    } catch (error) {
      console.error("[TelecelDataService] buyBundle error:", error);
      await TelecelDataService.#markFailure(reference, amountNumber, service_id, customer_id, error.message);
      return {
        success: false,
        status: 500,
        message: error.message || "Failed to initiate Telecel data purchase"
      };
    }
  }

  static async handleCallback(callback) {
    const {
      success,
      clientReference,
      amount,
      description,
      transactionId,
      externalTransactionId
    } = callback || {};

    if (!clientReference) {
      return { success: false, status: 400, message: "Callback missing clientReference" };
    }

    try {
      const utility = await prisma.utilities.findUnique({ where: { reference: clientReference } });
      if (!utility) {
        return {
          success: false,
          status: 404,
          message: `Utility record with reference ${clientReference} not found`
        };
      }

      await prisma.utilities.update({
        where: { id: utility.id },
        data: {
          status: success ? "SUCCESS" : "FAILED",
          updated_at: new Date()
        }
      });

      const transaction = await prisma.transactions.findFirst({
        where: { related_service_id: utility.id }
      });

      if (!transaction) {
        return {
          success: false,
          status: 404,
          message: `Transaction linked to utility ${utility.id} not found`
        };
      }

      if (success) {
        await prisma.transactions.update({
          where: { id: transaction.id },
          data: {
            status: "SUCCESS",
            updated_at: new Date(),
            provider_reference: transactionId || null,
            external_reference: externalTransactionId || null
          }
        });
      } else {
        await TelecelDataService.#refundTransaction(transaction, amount, description);
      }

      return { success: true, message: "Callback processed successfully" };
    } catch (error) {
      console.error("[TelecelDataService] handleCallback error:", error);
      return { success: false, status: 500, message: error.message };
    }
  }

  static async #refundTransaction(transaction, amount, description) {
    const wallet = await prisma.wallet.findFirst({ where: { user_id: transaction.customer_id } });
    if (!wallet) {
      throw new Error(`Wallet for user ${transaction.customer_id} not found`);
    }

    const refundAmount = Number(amount) || Number(transaction.amount);
    const newBalance = Number(wallet.balance) + refundAmount;

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance }
    });

    await prisma.transactions.update({
      where: { id: transaction.id },
      data: {
        status: "FAILED",
        updated_at: new Date()
      }
    });

    await prisma.transactions.create({
      data: {
        id: randomUUID(),
        customer_id: transaction.customer_id,
        transaction_type: "CREDIT",
        reference: `REFUND-${transaction.reference}`,
        wallet_address: wallet.wallet_address,
        amount: refundAmount,
        balance_before: wallet.balance,
        service_type: "data bundle",
        balance_after: newBalance,
        channel: "WALLET",
        related_service_id: transaction.related_service_id,
        service_id: transaction.service_id,
        description: description || "Refund for failed Telecel data purchase",
        status: "SUCCESS",
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  static async #markFailure(reference, amount, serviceId, customerId, errorMessage) {
    if (!reference || !serviceId || !customerId || !Number.isFinite(amount)) {
      return;
    }

    try {
      const utility = await prisma.utilities.findFirst({ where: { reference } });
      const transaction = utility
        ? await prisma.transactions.findFirst({ where: { related_service_id: utility.id } })
        : null;

      if (utility) {
        await prisma.utilities.update({
          where: { id: utility.id },
          data: { status: "FAILED", updated_at: new Date() }
        });
      }

      if (transaction) {
        await this.#refundTransaction(transaction, amount, errorMessage || "Telecel data request failed");
      }
    } catch (error) {
      console.error("[TelecelDataService] markFailure error:", error);
    }
  }
}

module.exports = TelecelDataService;
