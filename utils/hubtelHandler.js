const axios = require('axios');

class HubtelHandler {
  constructor() {
    this.baseUrl = process.env.HUBTEL_COMM_SERVICE_URL;
    this.hubTelPrepaidDepositId = process.env.HUBTEL_PREPAID_DEPOSIT_ID;
    this.appId = process.env.HUBTEL_APP_ID;
    this.apiKey = process.env.HUBTEL_API_KEY;

    if (!this.hubTelPrepaidDepositId) {
      throw new Error("Missing HUBTEL_PREPAID_DEPOSIT_ID in env");
    }
    if (!this.appId || !this.apiKey) {
      throw new Error("Missing HUBTEL_APP_ID or HUBTEL_API_KEY");
    }

    
    this.client = axios.create({
      baseURL: `${this.baseUrl}/${this.hubTelPrepaidDepositId}`,
      timeout: 30000,
      headers: {
        Authorization: this.getBasicAuthHeader(),
        "Content-Type": "application/json"
      }
    });
  }

  /**
   * 🔐 Generate Basic Auth header
   */
  getBasicAuthHeader() {
    const credentials = `${this.appId}:${this.apiKey}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  /**
   * 🏗 Build Commission Service URL
   * Example → https://cs.hubtel.com/commissionservices/2023202/{serviceId}
   */
  buildCommissionServiceUrl(serviceId) {
    return `${this.baseUrl}/${this.hubTelPrepaidDepositId}/${serviceId}`;
  }

  /**
   *  Make Commission Request
   * Client calls this first to create the commission transaction
   */
  async sendCommissionRequest(serviceId, payload) {
    const url = this.buildCommissionServiceUrl(serviceId);

    try {
      const response = await this.client.post(url, payload);
      return { success: true, data: response.data };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data || err.message,
        status: err.response?.status || 500
      };
    }
  }

  /**
   * 🔄 Mandatory Status Check
   * After 5 minutes if merchant gets no callback
   */
  async checkCommissionStatus(serviceId) {
    try {
      const response = await this.client.get(`/${serviceId}/status`);
      return { success: true, data: response.data };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data || err.message,
        status: err.response?.status || 500
      };
    }
  }

  
}

// Export a singleton instance
module.exports = HubtelHandler;
