const WaterService = require("../services/providerClients/waterService");
const { sendSuccess, sendError, ResponseCodes } = require("../utils/responseUtil");
const { parseHubtelCallback } = require("../utils/hubtelCallback");

class WaterController {
  static async buyWater(req, res) {
    try {
      const result = await WaterService.buyWater(req.body, req.headers);

      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "Water purchase failed"
        );
      }

      return sendSuccess(res, result.data, "Water purchase initiated successfully");
    } catch (error) {
      return sendError(
        res,
        ResponseCodes.SERVER_ERROR,
        "Failed to process water purchase",
        error.message
      );
    }
  }

  // 🔹 Handle Hubtel Callback (Reusable)
 static async handleCallback(req, res) {
    try {
      const rawCallback = req.body;

      console.log("[WaterController] raw Hubtel callback:", rawCallback);

      // Parse and shape the callback data
      const parsed = parseHubtelCallback(rawCallback);

       const result = await WaterService.workOnCallback(parsed);
      
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

module.exports = WaterController;
