const prisma = require("../config/db");

/**
 * Lookup utility records and related data by recipientId header
 * This function searches for records in utilities/transactions/wallet tables
 * using the recipientId value (typically the customer/user ID)
 * 
 * @param {Object} headers - Express request headers object
 * @returns {Promise<Object>} Object containing utility, transaction, wallet, and customer data
 * @returns {Object.success} Boolean indicating if record was found
 * @returns {Object.utility} The utility record if found
 * @returns {Object.transaction} The related transaction record if found
 * @returns {Object.wallet} The customer's wallet if found
 * @returns {Object.customer} The customer record if found
 * @returns {Object.message} Message describing the result
 * @returns {Object.status} HTTP status code
 */
async function lookupRecordByRecipientId(headers) {
  try {
    const recipientId = headers["recipientid"]; // Express converts headers to lowercase

    if (!recipientId) {
      return {
        success: false,
        status: 400,
        message: "Missing required header: recipientId",
      };
    }

    // 🔍 1. Try to find wallet and customer by recipientId (user_id)
    const wallet = await prisma.wallet.findFirst({
      where: { user_id: recipientId },
    });

    if (wallet) {
      const customer = await prisma.customers.findUnique({
        where: { id: recipientId },
      });

      // 🔍 2. Find latest utility/transaction for this user
      const transaction = await prisma.transactions.findFirst({
        where: { customer_id: recipientId },
        orderBy: { created_at: "desc" },
        take: 1,
      });

      const utility = transaction
        ? await prisma.utilities.findFirst({
            where: { id: transaction.related_service_id },
          })
        : null;

      return {
        success: true,
        status: 200,
        message: "Record found by recipientId",
        utility,
        transaction,
        wallet,
        customer,
        lookupType: "RECIPIENT_ID",
      };
    }

    // 🔍 3. No record found
    return {
      success: false,
      status: 404,
      message: `No wallet/customer found for recipientId: ${recipientId}`,
    };
  } catch (error) {
    console.error("Error looking up record by recipientId:", error);
    return {
      success: false,
      status: 500,
      message: "Error looking up record",
      error: error.message,
    };
  }
}

module.exports = {
  lookupRecordByRecipientId,
};
