
function parseHubtelCallback(body) {
  if (!body) {
    throw new Error("Callback payload is empty");
  }

  const responseCode = body.ResponseCode || null;
  const data = body.Data || {};

  return {
    raw: body,
    responseCode,
    success: responseCode === "0000",
    transactionId: data.TransactionId || null,
    clientReference: data.ClientReference || null,
    amount: data.Amount || null,
    charges: data.Charges || null,
    externalTransactionId: data.ExternalTransactionId || null,
    description: data.Description || null,
    meta: data.Meta || {},
  };
}

module.exports = { parseHubtelCallback };
