const MtnAirtimeService = require("../services/providerClients/mtnAirtimeService");
const { sendSuccess, sendError, ResponseCodes } = require("../utils/responseUtil");
const { parseHubtelCallback } = require("../utils/hubtelCallback");

class MtnAirtimeController {
  static async buyMtnAirtime(req, res) {
    try {
      const result = await MtnAirtimeService.buyMtnAirtime(req.body, req.headers);

      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "MTN airtime purchase failed"
        );
      }

      return sendSuccess(res, result.data, "MTN airtime purchase initiated successfully");
    } catch (error) {
      return sendError(
        res,
        ResponseCodes.SERVER_ERROR,
        "Failed to process MTN airtime purchase",
        error.message
      );
    }
  }

  // 🔹 Handle Hubtel Callback (Reusable)
 static async handleCallback(req, res) {
    try {
      const rawCallback = req.body;

      console.log("[MtnAirtimeController] raw Hubtel callback:", rawCallback);

      // Parse and shape the callback data
      const parsed = parseHubtelCallback(rawCallback);

       const result = await MtnAirtimeService.workOnCallback(parsed);
      
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

module.exports = MtnAirtimeController;