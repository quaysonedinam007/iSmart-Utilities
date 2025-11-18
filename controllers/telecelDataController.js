const TelecelDataService = require("../services/providerClients/telecelDataService");
const { sendSuccess, sendError, ResponseCodes } = require("../utils/responseUtil");
const { parseHubtelCallback } = require("../utils/hubtelCallback");

class TelecelDataController {
  static async queryBundles(req, res) {
    try {
      const { destination } = req.query;
      if (!destination) {
        return sendError(
          res,
          ResponseCodes.BAD_REQUEST,
          "Missing required query parameter: destination"
        );
      }

      const result = await TelecelDataService.queryBundles(destination);

      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "Telecel data bundle query failed"
        );
      }

      return sendSuccess(res, result.data, "Telecel data bundles fetched successfully");
    } catch (error) {
      return sendError(
        res,
        ResponseCodes.SERVER_ERROR,
        "Failed to query Telecel data bundles",
        error.message
      );
    }
  }

  static async buyBundle(req, res) {
    try {
      const result = await TelecelDataService.buyBundle(req.body, req.headers);

      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "Telecel data purchase failed"
        );
      }

      return sendSuccess(res, result.data, "Telecel data purchase initiated successfully");
    } catch (error) {
      return sendError(
        res,
        ResponseCodes.SERVER_ERROR,
        "Failed to process Telecel data purchase",
        error.message
      );
    }
  }

  static async handleCallback(req, res) {
    try {
      const rawCallback = req.body;
      const parsed = parseHubtelCallback(rawCallback);
      const result = await TelecelDataService.handleCallback(parsed);

      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "Callback handling failed"
        );
      }

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

module.exports = TelecelDataController;
