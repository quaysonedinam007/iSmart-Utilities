const TelecelBroadbandService = require("../services/providerClients/telecelBroadbandService");
const { sendSuccess, sendError, ResponseCodes } = require("../utils/responseUtil");
const { parseHubtelCallback } = require("../utils/hubtelCallback");

class TelecelBroadbandController {
  static async buyTelecelBroadband(req, res) {
    try {
      const result = await TelecelBroadbandService.buyTelecelBroadband(req.body, req.headers);

      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "Telecel broadband purchase failed"
        );
      }

      return sendSuccess(res, result.data, "Telecel broadband purchase initiated successfully");
    } catch (error) {
      return sendError(
        res,
        ResponseCodes.SERVER_ERROR,
        "Failed to process Telecel broadband purchase",
        error.message
      );
    }
  }

  // 🔹 Handle Hubtel Callback (Reusable)
 static async handleCallback(req, res) {
    try {
      const rawCallback = req.body;

      console.log("[TelecelBroadbandController] raw Hubtel callback:", rawCallback);

      // Parse and shape the callback data
      const parsed = parseHubtelCallback(rawCallback);

       const result = await TelecelBroadbandService.workOnCallback(parsed);
      
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

module.exports = TelecelBroadbandController;