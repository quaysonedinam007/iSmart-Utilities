const utilityService = require('../services/utilityService');
const { sendSuccess, sendError, ResponseCodes } = require("../utils/responseUtil");

class UtilityController {
    /**
     * Purchase Electricity
     * POST /api/utilities/electricity
     */
    async purchaseElectricity(req, res) {
        try {
            const { customerId, amount, meterNumber, meterType, providerId, idempotencyKey, phoneNumber } = req.body;

            // Validation
            if (!customerId || !amount || !meterNumber || !meterType || !providerId || !phoneNumber) {
                return sendError(
                    res,
                    ResponseCodes.BAD_REQUEST,
                    "Missing required fields: customerId, amount, meterNumber, meterType, providerId, phoneNumber"
                );
            }

            const result = await utilityService.purchaseElectricity(
                customerId,
                parseFloat(amount),
                meterNumber,
                meterType,
                providerId,
                idempotencyKey,
                phoneNumber
            );

            return sendSuccess(res, result, "Electricity purchase initiated successfully");
        } catch (error) {
            return sendError(
                res,
                ResponseCodes.SERVER_ERROR,
                "Failed to process electricity purchase",
                error.message
            );
        }
    }

    /**
     * Purchase Water
     * POST /api/utilities/water
     */
    async purchaseWater(req, res) {
        try {
            const { customerId, amount, accountNumber, providerId, idempotencyKey } = req.body;

            if (!customerId || !amount || !accountNumber || !providerId) {
                return sendError(
                    res,
                    ResponseCodes.BAD_REQUEST,
                    "Missing required fields: customerId, amount, accountNumber, providerId"
                );
            }

            const result = await utilityService.purchaseWater(
                customerId,
                parseFloat(amount),
                accountNumber,
                providerId,
                idempotencyKey
            );

            return sendSuccess(res, result, "Water bill payment initiated successfully");
        } catch (error) {
            return sendError(
                res,
                ResponseCodes.SERVER_ERROR,
                "Failed to process water bill payment",
                error.message
            );
        }
    }

    /**
     * Purchase Data Bundle
     * POST /api/utilities/data-bundle
     */
    async purchaseDataBundle(req, res) {
        try {
            const { customerId, amount, phoneNumber, bundleType, providerId, idempotencyKey, providerCode } = req.body;

            if (!customerId || !amount || !phoneNumber || !bundleType || (!providerId && !providerCode)) {
                return sendError(
                    res,
                    ResponseCodes.BAD_REQUEST,
                    "Missing required fields: customerId, amount, phoneNumber, bundleType, and either providerId or providerCode"
                );
            }

            const result = await utilityService.purchaseDataBundle(
                customerId,
                parseFloat(amount),
                phoneNumber,
                bundleType,
                providerId,
                idempotencyKey,
                providerCode
            );

            return sendSuccess(res, result, "Data bundle purchase initiated successfully");
        } catch (error) {
            return sendError(
                res,
                ResponseCodes.SERVER_ERROR,
                "Failed to process data bundle purchase",
                error.message
            );
        }
    }

    async purchaseBroadband(req, res) {
        try {
            const { customerId, amount, phoneNumber, bundleType, providerId, idempotencyKey, providerCode } = req.body;

            if (!customerId || !amount || !phoneNumber || !bundleType || (!providerId && !providerCode)) {
                return sendError(
                    res,
                    ResponseCodes.BAD_REQUEST,
                    "Missing required fields: customerId, amount, phoneNumber, bundleType, and either providerId or providerCode"
                );
            }

            const result = await utilityService.purchaseBroadbandBundle(
                customerId,
                parseFloat(amount),
                phoneNumber,
                bundleType,
                providerId,
                idempotencyKey,
                providerCode
            );

            return sendSuccess(res, result, "Broadband purchase initiated successfully");
        } catch (error) {
            return sendError(
                res,
                ResponseCodes.SERVER_ERROR,
                "Failed to process broadband purchase",
                error.message
            );
        }
    }

    /**
     * Purchase Cable TV Subscription
     * POST /api/utilities/cable-tv
     */
    async purchaseCableTV(req, res) {
        try {
            const { customerId, amount, smartCardNumber, packageType, providerId, idempotencyKey } = req.body;

            if (!customerId || !amount || !smartCardNumber || !packageType || !providerId) {
                return sendError(
                    res,
                    ResponseCodes.BAD_REQUEST,
                    "Missing required fields: customerId, amount, smartCardNumber, packageType, providerId"
                );
            }

            const result = await utilityService.purchaseCableTV(
                customerId,
                parseFloat(amount),
                smartCardNumber,
                packageType,
                providerId,
                idempotencyKey
            );

            return sendSuccess(res, result, "Cable TV subscription initiated successfully");
        } catch (error) {
            return sendError(
                res,
                ResponseCodes.SERVER_ERROR,
                "Failed to process cable TV subscription",
                error.message
            );
        }
    }

    /**
     * Purchase Airtime
     * POST /api/utilities/airtime
     */
    async purchaseAirtime(req, res) {
        try {
            const { customerId, amount, phoneNumber, providerId, idempotencyKey, providerCode } = req.body;

            if (!customerId || !amount || !phoneNumber || (!providerId && !providerCode)) {
                return sendError(
                    res,
                    ResponseCodes.BAD_REQUEST,
                    "Missing required fields: customerId, amount, phoneNumber, and either providerId or providerCode"
                );
            }

            const result = await utilityService.purchaseAirtime(
                customerId,
                parseFloat(amount),
                phoneNumber,
                providerId,
                idempotencyKey,
                providerCode
            );

            return sendSuccess(res, result, "Airtime purchase initiated successfully");
        } catch (error) {
            return sendError(
                res,
                ResponseCodes.SERVER_ERROR,
                "Failed to process airtime purchase",
                error.message
            );
        }
    }

    async listProviders(req, res) {
        try {
            const { channel = 'MOBILE', utility } = req.query;
            const data = await utilityService.listProviders(channel, utility);
            return sendSuccess(res, data, 'Providers fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to fetch providers', error.message);
        }
    }

    async listBundles(req, res) {
        try {
            const { providerId } = req.params;
            const data = await utilityService.listBundles(providerId);
            return sendSuccess(res, data, 'Bundles fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to fetch bundles', error.message);
        }
    }

    async hubtelCallback(req, res) {
        try {
            const payload = req.body;
            const providerRef = payload?.TransactionId || payload?.reference || null;
            const status = (payload?.Status || '').toUpperCase();
            const DISBURSEMENTS_ENABLED = String(process.env.DISBURSEMENTS_ENABLED || 'true').toLowerCase() !== 'false';

            const prisma = require('../config/db');

            // If flag is off, find utility by reference for anchoring provider_responses
            const utilForAnchor = !DISBURSEMENTS_ENABLED && payload?.Reference
                ? await prisma.utilities.findFirst({ where: { reference: payload.Reference } })
                : null;

            await prisma.provider_responses.create({
                data: {
                    aggregate_type: DISBURSEMENTS_ENABLED ? 'DISBURSEMENT' : 'UTILITY',
                    aggregate_id: DISBURSEMENTS_ENABLED ? (payload?.DisbursementId || null) : (utilForAnchor?.id || null),
                    provider: 'HUBTEL',
                    provider_conversation_id: providerRef,
                    status,
                    raw_response: payload
                }
            });

            if (DISBURSEMENTS_ENABLED) {
                const disb = await prisma.disbursements.findFirst({
                    where: {
                        OR: [
                            { provider_ref: providerRef },
                            { reference: payload?.Reference || null }
                        ]
                    }
                });

                if (disb) {
                    await prisma.disbursements.update({
                        where: { id: disb.id },
                        data: { status }
                    });

                    await prisma.transactions.update({
                        where: { id: disb.transaction_id },
                        data: {
                            status: status === 'SUCCESS' ? 'SUCCESS' : status === 'FAILED' ? 'FAILED' : 'PROCESSING'
                        }
                    });

                    await prisma.utilities.updateMany({
                        where: { reference: disb.reference },
                        data: { status }
                    });
                } else if (payload?.Reference) {
                    await prisma.utilities.updateMany({
                        where: { reference: payload.Reference },
                        data: { status }
                    });
                }
            } else {
                // Flag disabled: update utilities and transactions by reference only
                if (payload?.Reference) {
                    await prisma.utilities.updateMany({
                        where: { reference: payload.Reference },
                        data: { status }
                    });
                    const tx = await prisma.transactions.findFirst({ where: { reference: payload.Reference } });
                    if (tx) {
                        await prisma.transactions.update({
                            where: { id: tx.id },
                            data: { status: status === 'SUCCESS' ? 'SUCCESS' : status === 'FAILED' ? 'FAILED' : 'PROCESSING' }
                        });
                    }
                }
            }

            return res.status(200).json({ ok: true });
        } catch (e) {
            // Always 200 to prevent retry storms; log server-side
            return res.status(200).json({ ok: true });
        }
    }

    async queryElectricity(req, res) {
        try {
            const { phoneNumber, providerId, providerCode } = req.query;
            if (!phoneNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing phoneNumber and either providerId or providerCode');
            }
            const data = await utilityService.queryElectricityByPhone(providerId, providerCode, phoneNumber);
            return sendSuccess(res, data, 'ECG meter details fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to query ECG meter', error.message);
        }
    }

    async queryGwclMeter(req, res) {
        try {
            const { meterNumber, phoneNumber, providerId, providerCode } = req.query;
            if (!meterNumber || !phoneNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing meterNumber, phoneNumber and either providerId or providerCode');
            }
            const data = await utilityService.queryGwclMeter(providerId, providerCode, meterNumber, phoneNumber);
            return sendSuccess(res, data, 'GWCL meter details fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to query GWCL meter', error.message);
        }
    }

    async queryDataBundles(req, res) {
        try {
            const { phoneNumber, providerId, providerCode } = req.query;
            if (!phoneNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing phoneNumber and either providerId or providerCode');
            }
            const data = await utilityService.queryDataBundlesByPhone(providerId, providerCode, phoneNumber);
            return sendSuccess(res, data, 'Data bundles fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to query data bundles', error.message);
        }
    }

    async queryBroadbandBundles(req, res) {
        try {
            const { phoneNumber, providerId, providerCode } = req.query;
            if (!phoneNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing phoneNumber and either providerId or providerCode');
            }
            const data = await utilityService.queryBroadbandBundlesByPhone(providerId, providerCode, phoneNumber);
            return sendSuccess(res, data, 'Broadband bundles fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to query broadband bundles', error.message);
        }
    }

    // Telecel Data
    async queryTelecelData(req, res) {
        try {
            const { phoneNumber, providerId, providerCode } = req.query;
            if (!phoneNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing phoneNumber and either providerId or providerCode');
            }
            const data = await utilityService.queryTelecelDataBundles(providerId, providerCode, phoneNumber);
            return sendSuccess(res, data, 'Telecel data bundles fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to query Telecel data bundles', error.message);
        }
    }

    async purchaseTelecelData(req, res) {
        try {
            const { customerId, amount, phoneNumber, bundleType, providerId, idempotencyKey, providerCode } = req.body;
            if (!customerId || !amount || !phoneNumber || !bundleType || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing required fields: customerId, amount, phoneNumber, bundleType, and either providerId or providerCode');
            }
            const result = await utilityService.purchaseTelecelData(customerId, parseFloat(amount), phoneNumber, bundleType, providerId, idempotencyKey, providerCode);
            return sendSuccess(res, result, 'Telecel data purchase initiated successfully');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to process Telecel data purchase', error.message);
        }
    }

    // Telecel Broadband
    async queryTelecelBroadband(req, res) {
        try {
            const { landlineNumber, providerId, providerCode } = req.query;
            if (!landlineNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing landlineNumber and either providerId or providerCode');
            }
            const data = await utilityService.queryTelecelBroadband(providerId, providerCode, landlineNumber);
            return sendSuccess(res, data, 'Telecel broadband account details fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to query Telecel broadband', error.message);
        }
    }

    async purchaseTelecelBroadband(req, res) {
        try {
            const { customerId, amount, landlineNumber, broadbandNumber, providerId, idempotencyKey, providerCode } = req.body;
            if (!customerId || !amount || !landlineNumber || !broadbandNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing required fields: customerId, amount, landlineNumber, broadbandNumber, and either providerId or providerCode');
            }
            const result = await utilityService.purchaseTelecelBroadband(customerId, parseFloat(amount), landlineNumber, broadbandNumber, providerId, idempotencyKey, providerCode);
            return sendSuccess(res, result, 'Telecel broadband top-up initiated successfully');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to process Telecel broadband top-up', error.message);
        }
    }

    // AT Data
    async queryAtData(req, res) {
        try {
            const { phoneNumber, providerId, providerCode } = req.query;
            if (!phoneNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing phoneNumber and either providerId or providerCode');
            }
            const data = await utilityService.queryAtDataBundles(providerId, providerCode, phoneNumber);
            return sendSuccess(res, data, 'AT data bundles fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to query AT data bundles', error.message);
        }
    }

    async queryMtnData(req, res) {
        try {
            const { phoneNumber } = req.query;
            if (!phoneNumber) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing phoneNumber');
            }
            const data = await utilityService.queryMtnDataBundles(phoneNumber);
            return sendSuccess(res, data, 'MTN data bundles fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to query MTN data bundles', error.message);
        }
    }

    async purchaseAtData(req, res) {
        try {
            const { customerId, amount, phoneNumber, bundleType, providerId, idempotencyKey, providerCode } = req.body;
            if (!customerId || !amount || !phoneNumber || !bundleType || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing required fields: customerId, amount, phoneNumber, bundleType, and either providerId or providerCode');
            }
            const result = await utilityService.purchaseAtData(customerId, parseFloat(amount), phoneNumber, bundleType, providerId, idempotencyKey, providerCode);
            return sendSuccess(res, result, 'AT data purchase initiated successfully');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to process AT data purchase', error.message);
        }
    }

    async purchaseMtnData(req, res) {
        try {
            const { customerId, amount, phoneNumber, bundleType, idempotencyKey } = req.body;
            if (!customerId || !amount || !phoneNumber || !bundleType) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing required fields: customerId, amount, phoneNumber, bundleType');
            }
            const result = await utilityService.purchaseMtnData(customerId, parseFloat(amount), phoneNumber, bundleType, idempotencyKey);
            return sendSuccess(res, result, 'MTN data purchase initiated successfully');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to process MTN data purchase', error.message);
        }
    }

    async purchaseTelecelAirtime(req, res) {
        try {
            const { customerId, amount, phoneNumber, idempotencyKey } = req.body;
            if (!customerId || !amount || !phoneNumber) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing required fields: customerId, amount, phoneNumber');
            }
            const result = await utilityService.purchaseAirtime(customerId, parseFloat(amount), phoneNumber, null, idempotencyKey, 'TELECEL_AIRTIME');
            return sendSuccess(res, result, 'Telecel airtime purchase initiated successfully');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to process Telecel airtime purchase', error.message);
        }
    }

    async purchaseMtnAirtime(req, res) {
        try {
            const { customerId, amount, phoneNumber, idempotencyKey } = req.body;
            if (!customerId || !amount || !phoneNumber) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing required fields: customerId, amount, phoneNumber');
            }
            const result = await utilityService.purchaseAirtime(customerId, parseFloat(amount), phoneNumber, null, idempotencyKey, 'MTN_AIRTIME');
            return sendSuccess(res, result, 'MTN airtime purchase initiated successfully');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to process MTN airtime purchase', error.message);
        }
    }

    async purchaseAtAirtime(req, res) {
        try {
            const { customerId, amount, phoneNumber, idempotencyKey } = req.body;
            if (!customerId || !amount || !phoneNumber) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing required fields: customerId, amount, phoneNumber');
            }
            const result = await utilityService.purchaseAirtime(customerId, parseFloat(amount), phoneNumber, null, idempotencyKey, 'AT_AIRTIME');
            return sendSuccess(res, result, 'AT airtime purchase initiated successfully');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to process AT airtime purchase', error.message);
        }
    }

    // Cable TV providers via commissionservices (DSTV/GoTV/StarTimes)
    async dstvQuery(req, res) {
        try {
            const { accountNumber, providerId, providerCode } = req.query;
            if (!accountNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing accountNumber and either providerId or providerCode');
            }
            const data = await utilityService.dstvQuery(providerId, providerCode, accountNumber);
            return sendSuccess(res, data, 'DSTV account details fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to query DSTV account', error.message);
        }
    }

    async dstvPay(req, res) {
        try {
            const { customerId, amount, accountNumber, providerId, idempotencyKey, providerCode } = req.body;
            if (!customerId || !amount || !accountNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing required fields: customerId, amount, accountNumber, and either providerId or providerCode');
            }
            const result = await utilityService.dstvPay(customerId, parseFloat(amount), accountNumber, providerId, idempotencyKey, providerCode);
            return sendSuccess(res, result, 'DSTV payment initiated successfully');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to process DSTV payment', error.message);
        }
    }

    async gotvQuery(req, res) {
        try {
            const { accountNumber, providerId, providerCode } = req.query;
            if (!accountNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing accountNumber and either providerId or providerCode');
            }
            const data = await utilityService.gotvQuery(providerId, providerCode, accountNumber);
            return sendSuccess(res, data, 'GoTV account details fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to query GoTV account', error.message);
        }
    }

    async gotvPay(req, res) {
        try {
            const { customerId, amount, accountNumber, providerId, idempotencyKey, providerCode } = req.body;
            if (!customerId || !amount || !accountNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing required fields: customerId, amount, accountNumber, and either providerId or providerCode');
            }
            const result = await utilityService.gotvPay(customerId, parseFloat(amount), accountNumber, providerId, idempotencyKey, providerCode);
            return sendSuccess(res, result, 'GoTV payment initiated successfully');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to process GoTV payment', error.message);
        }
    }

    async startimesQuery(req, res) {
        try {
            const { accountNumber, providerId, providerCode } = req.query;
            if (!accountNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing accountNumber and either providerId or providerCode');
            }
            const data = await utilityService.startimesQuery(providerId, providerCode, accountNumber);
            return sendSuccess(res, data, 'StarTimes account details fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to query StarTimes account', error.message);
        }
    }

    async startimesPay(req, res) {
        try {
            const { customerId, amount, accountNumber, providerId, idempotencyKey, providerCode } = req.body;
            if (!customerId || !amount || !accountNumber || (!providerId && !providerCode)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Missing required fields: customerId, amount, accountNumber, and either providerId or providerCode');
            }
            const result = await utilityService.startimesPay(customerId, parseFloat(amount), accountNumber, providerId, idempotencyKey, providerCode);
            return sendSuccess(res, result, 'StarTimes payment initiated successfully');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to process StarTimes payment', error.message);
        }
    }

    async transactionStatus(req, res) {
        try {
            const { posSalesId } = req.params;
            const { clientReference, hubtelTransactionId, networkTransactionId } = req.query;
            if (!posSalesId || (!clientReference && !hubtelTransactionId && !networkTransactionId)) {
                return sendError(res, ResponseCodes.BAD_REQUEST, 'Provide posSalesId and at least one of clientReference, hubtelTransactionId or networkTransactionId');
            }
            const data = await utilityService.checkTxnStatus(posSalesId, { clientReference, hubtelTransactionId, networkTransactionId });
            return sendSuccess(res, data, 'Transaction status fetched');
        } catch (error) {
            return sendError(res, ResponseCodes.SERVER_ERROR, 'Failed to fetch transaction status', error.message);
        }
    }
}

module.exports = new UtilityController();
