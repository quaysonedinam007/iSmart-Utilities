const ElectricityService = require("../services/electricityService");
const { sendSuccess, sendError, ResponseCodes } = require("../utils/responseUtil");
const { parseHubtelCallback } = require("../utils/hubtelCallback");

class ElectricityController {
  static async buyElectricity(req, res) {
    try {
      const result = await ElectricityService.buyElectricity(req.body, req.headers);

      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "Electricity purchase failed"
        );
      }

      return sendSuccess(res, result.data, "Electricity purchase initiated successfully");
    } catch (error) {
      return sendError(
        res,
        ResponseCodes.SERVER_ERROR,
        "Failed to process electricity purchase",
        error.message
      );
    }
  }

  // 🔹 Handle Hubtel Callback (Reusable)
 static async handleCallback(req, res) {
    try {
      const rawCallback = req.body;

      // Parse and shape the callback data
      const parsed = parseHubtelCallback(rawCallback);

       const result = await ElectricityService.workOnCallback(parsed);
      
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

module.exports = ElectricityController;
