const TelecelAirtimeService = require("../services/providerClients/telecelAirtimeService");
const { sendSuccess, sendError, ResponseCodes } = require("../utils/responseUtil");
const { parseHubtelCallback } = require("../utils/hubtelCallback");

class TelecelAirtimeController {
  static async buyTelecelAirtime(req, res) {
    try {
      const result = await TelecelAirtimeService.buyTelecelAirtime(req.body, req.headers);

      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "Telecel airtime purchase failed"
        );
      }

      return sendSuccess(res, result.data, "Telecel airtime purchase initiated successfully");
    } catch (error) {
      return sendError(
        res,
        ResponseCodes.SERVER_ERROR,
        "Failed to process telecel airtime purchase",
        error.message
      );
    }
  }

  // 🔹 Handle Hubtel Callback (Reusable)
 static async handleCallback(req, res) {
    try {
      const rawCallback = req.body;

      console.log("[TelecelAirtimeController] raw Hubtel callback:", rawCallback);

      // Parse and shape the callback data
      const parsed = parseHubtelCallback(rawCallback);

       const result = await TelecelAirtimeService.workOnCallback(parsed);
      
      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "callback handling failed"
        );
      }

    

      // Always acknowledge Hubtel immediately
      return res.json({ status: "ok" });
    } catch (error) {
      return sendError(
        res,
        ResponseCodes.SERVER_ERROR,
        "Callback processing failed",
        error.message
      );
    }
  }
}

module.exports = TelecelAirtimeController;