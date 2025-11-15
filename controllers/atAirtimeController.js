const ATAirtimeService = require("../services/providerClients/atAirtimeService");
const { sendSuccess, sendError, ResponseCodes } = require("../utils/responseUtil");
const { parseHubtelCallback } = require("../utils/hubtelCallback");

class ATAirtimeController {
  static async buyATAirtime(req, res) {
    try {
      const result = await ATAirtimeService.buyATAirtime(req.body, req.headers);

      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "AT airtime purchase failed"
        );
      }

      return sendSuccess(res, result.data, "AT airtime purchase initiated successfully");
    } catch (error) {
      return sendError(
        res,
        ResponseCodes.SERVER_ERROR,
        "Failed to process AT airtime purchase",
        error.message
      );
    }
  }

  // 🔹 Handle Hubtel Callback (Reusable)
 static async handleCallback(req, res) {
    try {
      const rawCallback = req.body;

      console.log("[ATAirtimeController] raw Hubtel callback:", rawCallback);

      // Parse and shape the callback data
      const parsed = parseHubtelCallback(rawCallback);

       const result = await ATAirtimeService.workOnCallback(parsed);
      
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

module.exports = ATAirtimeController;