const axios = require('axios');

class HubtelClient {
    constructor({ baseUrl, clientId, clientSecret }) {
        this.http = axios.create({
            baseURL: (baseUrl || '').replace(/\/+$/g, ''),
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' },
            auth: { username: clientId, password: clientSecret }
        });

        this.statusHttp = axios.create({
            baseURL: (process.env.HUBTEL_TXN_STATUS_BASE_URL || 'https://api-txnstatus.hubtel.com').replace(/\/+$/g, ''),
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async purchaseAirtime({ amount, phoneNumber, operator }) {
        const resp = await this.http.post('/v1/airtime/purchase', {
            Amount: Number(amount),
            PhoneNumber: phoneNumber,
            Operator: operator
        });
        return resp.data;
    }

    async purchaseData({ amount, phoneNumber, bundleCode, operator }) {
        const resp = await this.http.post('/v1/data/purchase', {
            Amount: Number(amount),
            PhoneNumber: phoneNumber,
            Operator: operator,
            BundleCode: bundleCode
        });
        return resp.data;
    }

    async purchaseAirtimeCommissionService({ prepaidDepositId, serviceId, destination, amount, callbackUrl, clientReference }) {
        const path = `/commissionservices/${encodeURIComponent(prepaidDepositId)}/${encodeURIComponent(serviceId)}`;
        const payload = {
            Destination: destination,
            Amount: Number(amount),
            CallbackUrl: callbackUrl,
            ClientReference: clientReference
        };
        const resp = await this.http.post(path, payload);
        return resp.data;
    }

    async queryEcgMeter({ prepaidDepositId, serviceId, destination }) {
        const path = `/commissionservices/${encodeURIComponent(prepaidDepositId)}/${encodeURIComponent(serviceId)}`;
        const resp = await this.http.get(path, { params: { destination } });
        return resp.data;
    }

    async purchaseElectricityTopup({ prepaidDepositId, serviceId, destination, amount, callbackUrl, clientReference, meterNumber }) {
        const path = `/commissionservices/${encodeURIComponent(prepaidDepositId)}/${encodeURIComponent(serviceId)}`;
        const payload = {
            Destination: destination,
            Amount: Number(amount),
            CallbackUrl: callbackUrl,
            ClientReference: clientReference,
            Extradata: { Bundle: String(meterNumber) }
        };
        const resp = await this.http.post(path, payload);
        return resp.data;
    }

    async queryDataBundles({ prepaidDepositId, serviceId, destination }) {
        const path = `/commissionservices/${encodeURIComponent(prepaidDepositId)}/${encodeURIComponent(serviceId)}`;
        const resp = await this.http.get(path, { params: { destination } });
        return resp.data;
    }

    async purchaseDataBundleTopup({ prepaidDepositId, serviceId, destination, amount, callbackUrl, clientReference, bundleValue }) {
        const path = `/commissionservices/${encodeURIComponent(prepaidDepositId)}/${encodeURIComponent(serviceId)}`;
        const payload = {
            Destination: destination,
            Amount: Number(amount),
            CallbackUrl: callbackUrl,
            ClientReference: clientReference,
            Extradata: { Bundle: String(bundleValue) }
        };
        const resp = await this.http.post(path, payload);
        return resp.data;
    }

    async purchaseCommission({ prepaidDepositId, serviceId, destination, amount, callbackUrl, clientReference, extradata }) {
        const path = `/commissionservices/${encodeURIComponent(prepaidDepositId)}/${encodeURIComponent(serviceId)}`;
        const payload = {
            Destination: destination,
            Amount: Number(amount),
            CallbackUrl: callbackUrl,
            ClientReference: clientReference
        };
        if (extradata && typeof extradata === 'object') {
            payload.Extradata = extradata;
        }
        const resp = await this.http.post(path, payload);
        return resp.data;
    }

    async checkTransactionStatus({ posSalesId, clientReference, hubtelTransactionId, networkTransactionId }) {
        const path = `/transactions/${encodeURIComponent(posSalesId)}/status`;
        const resp = await this.statusHttp.get(path, {
            params: {
                clientReference,
                hubtelTransactionId,
                networkTransactionId
            }
        });
        return resp.data;
    }
}

module.exports = HubtelClient;


