const MtnBroadbandService = require("../services/providerClients/mtnBroadbandService");
const { sendSuccess, sendError, ResponseCodes } = require("../utils/responseUtil");
const { parseHubtelCallback } = require("../utils/hubtelCallback");

class MtnBroadbandController {
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

      const result = await MtnBroadbandService.queryBundles(destination);

      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "MTN Broadband bundle query failed"
        );
      }

      return sendSuccess(res, result.data, "MTN broadband bundles fetched successfully");
    } catch (error) {
      return sendError(
        res,
        ResponseCodes.SERVER_ERROR,
        "Failed to query MTN broadband bundles",
        error.message
      );
    }
  }

  static async buyBundle(req, res) {
    try {
      const result = await MtnBroadbandService.buyBundle(req.body, req.headers);

      if (!result.success) {
        return sendError(
          res,
          result.status || ResponseCodes.BAD_REQUEST,
          result.message || "MTN broadband purchase failed"
        );
      }

      return sendSuccess(res, result.data, "MTN broadband purchase initiated successfully");
    } catch (error) {
      return sendError(
        res,
        ResponseCodes.SERVER_ERROR,
        "Failed to process MTN broadband purchase",
        error.message
      );
    }
  }

  static async handleCallback(req, res) {
    try {
      const rawCallback = req.body;
      const parsed = parseHubtelCallback(rawCallback);
      const result = await MtnBroadbandService.handleCallback(parsed);

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

module.exports = MtnBroadbandController;
