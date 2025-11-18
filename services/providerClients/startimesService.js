const prisma = require("../../config/db.js");
const { randomUUID } = require("crypto");
const HubtelHandler = require("../../utils/hubtelHandler");



class StartimesService {
  static STARTIMES_SERVICE_ID = "6598652d34ea4112949c93c079c501ce";

  /**
   * payload = { Destination, Amount, ClientReference, CallbackUrl, Extradata }
   * headers = { x-user-id, service_id }
   */
  static async buyStartimes(payload, headers) {
    const { ["x-user-id"]: customer_id, service_id } = headers;

    const { Destination, Amount, ClientReference, CallbackUrl, Extradata } =
      payload;

    if (
      !Destination ||
      !Amount ||
      !ClientReference ||
      !CallbackUrl ||
      !Extradata?.bundle
    ) {
      return {
        success: false,
        status: 400,
        message: "Missing required parameters",
      };
    }

    // 1️⃣ Get wallet
    const wallet = await prisma.wallet.findFirst({
      where: { user_id: customer_id},
    });

    if (!wallet) {
      return {
        success: false,
        status: 404,
        message: "Wallet not found",
      };
    }

    const balanceBefore = wallet.balance;
    if (balanceBefore < Amount) {
      return {
        success: false,
        status: 400,
        message: "Insufficient wallet balance",
      };
    }

    // 2️⃣ Generate reference + idempotency
    const reference = ClientReference || `ST-${Date.now()}`;
    const idempotency = randomUUID();;

    // 3️⃣ Perform wallet deduction + create 2 records atomically
    const result = await prisma.$transaction(async (tx) => {
      // 3a. Create utility record
      const utility = await tx.utilities.create({
        data: {
          amount: Amount,
          user_id: customer_id,
          user_type: "CUSTOMER",
          service_id: service_id,
          request_details: payload,
          reference,
          callback_url: CallbackUrl,
          channel: "WALLET",
          status: "PENDING",
        },
      });

      // 3b. Create transaction record
      const txn = await tx.transactions.create({
        data: {
          customer_id,
          transaction_type: "DEBIT",
          reference,
          idempotency_key: idempotency,
          wallet_address: wallet.wallet_address,
          amount: Amount,
          currency: "GHS",
          channel: "WALLET",
          status: "PENDING",
          description: "Startimes subscription purchase",
          balance_before: balanceBefore,
          balance_after: balanceBefore - Amount,
          related_service_id: utility.id,
          service_id: service_id,
          system_reference: `CTS-${Date.now()}`,
          user_type: "CUSTOMER",
          service_type: "cable tv subscription",
        },
      });

      // 3c. Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceBefore - Amount,
        },
      });

      return { utility, txn, updatedWallet };
    });

    // 4️⃣ Send request to Hubtel after creating records
    const hubtel = new HubtelHandler();

    const hubtelResponse = await hubtel.sendCommissionRequest(
      StartimesService.STARTIMES_SERVICE_ID,
      payload
    );

    return {
      success: true,
      message: "StarTimes subscription purchase initiated",
      data: {
        wallet: result.updatedWallet,
        utility: result.utility,
        transaction: result.txn,
        hubtel: hubtelResponse,
      },
    };
  }

  static async workOnCallback(callback) {
    const {
      success,
      clientReference,
      amount,
      description,
      transactionId,
      externalTransactionId,
      charges,
      meta
    } = callback;

    try {
      // 🟦 1. Find utility record by reference
      const utility = await prisma.utilities.findUnique({
        where: { reference: clientReference }
      });

      if (!utility) {
        return {
          success: false,
          status: 404,
          message: `Utility record with reference ${clientReference} not found`
        };
      }

      // 🟦 2. Update utility status
      const utilityStatus = success ? "SUCCESS" : "FAILED";
      await prisma.utilities.update({
        where: { id: utility.id },
        data: {
          status: utilityStatus,
          updated_at: new Date()
        }
      });

      // 🟦 3. Find related transaction
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

      // 🟦 4. If success, mark transaction SUCCESS
      if (success) {
        await prisma.transactions.update({
          where: { id: transaction.id },
          data: {
            status: "SUCCESS",
            updated_at: new Date()
          }
        });
      } else {
        // 🟦 5. If failed, mark transaction FAILED and credit user balance
        const wallet = await prisma.wallet.findFirst({
          where: { user_id: transaction.customer_id }
        });

        if (!wallet) {
          return {
            success: false,
            status: 404,
            message: `Wallet for user ${transaction.customer_id} not found`
          };
        }

        const newBalance = Number(wallet.balance) + Number(amount);

        // Update wallet
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBalance }
        });

        // Mark transaction FAILED
        await prisma.transactions.update({
          where: { id: transaction.id },
          data: { status: "FAILED", updated_at: new Date() }
        });

        // Create a refund transaction
        await prisma.transactions.create({
          data: {
            id: randomUUID(),
            customer_id: transaction.customer_id,
            transaction_type: "CREDIT",
            reference: `REFUND-${clientReference}`,
            wallet_address: wallet.wallet_address,
            amount: amount,
            balance_before: wallet.balance,
            service_type: "cable tv subscription",
            balance_after: newBalance,
            channel: "WALLET",
            related_service_id: utility.id,
            service_id: transaction.service_id,
            description: `Refund for failed Startimes subsccription purchase: ${description}`,
            status: "SUCCESS",
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }

      return { success: true, message: "Callback processed successfully" };
    } catch (error) {
      console.error("Error processing callback:", error);
      return { success: false, status: 500, message: error.message };
    }
  }
}

module.exports =  StartimesService;
