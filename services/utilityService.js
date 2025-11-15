 const prisma = require('../config/db');
 const { randomUUID } = require('crypto');

class UtilityService {
    async resolveProvider({ providerId, providerCode, channel }) {
        const where = providerId
            ? { id: providerId, active: true, channel }
            : { code: providerCode, active: true, channel };

        const provider = await prisma.payment_providers.findFirst({ where });
        if (!provider) {
            throw new Error('Provider not found or inactive for the requested channel');
        }
        return provider;
    }
    async queryTelecelDataBundles(providerId, providerCode, phoneNumber) {
        if (!phoneNumber || (!providerId && !providerCode)) {
            throw new Error('Missing required fields: phoneNumber and either providerId or providerCode');
        }

        const provider = await this.resolveProvider({ providerId, providerCode, channel: 'MOMO' });
        const cfg = provider?.config || {};

        const HubtelClient = require('./providerClients/hubtelClient');
        const hubtel = new HubtelClient({
            baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
            clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
            clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
        });

        const serviceId = cfg.services?.TELECEL_DATA?.serviceId || 'fa27127ba039455da04a2ac8a1613e00';
        const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;

        const resp = await hubtel.queryDataBundles({
            prepaidDepositId,
            serviceId,
            destination: phoneNumber
        });

        await prisma.provider_responses.create({
            data: {
                aggregate_type: 'QUERY',
                aggregate_id: provider.id,
                provider: 'HUBTEL',
                provider_conversation_id: null,
                status: resp?.ResponseCode || 'PENDING',
                raw_response: resp
            }
        });

        const bundles = Array.isArray(resp?.Data)
            ? resp.Data.map(x => ({
                display: x?.Display || null,
                value: x?.Value || null,
                amount: x?.Amount ?? null
            }))
            : [];

        return {
            responseCode: resp?.ResponseCode || null,
            message: resp?.Message || null,
            label: resp?.Label || null,
            bundles
        };
    }

    async purchaseTelecelData(customerId, amount, phoneNumber, bundleType, providerId, idempotencyKey, providerCode) {
        return this.purchaseDataBundle(customerId, amount, phoneNumber, bundleType, providerId, idempotencyKey, providerCode);
    }

    async queryTelecelBroadband(providerId, providerCode, landlineNumber) {
        if (!landlineNumber || (!providerId && !providerCode)) {
            throw new Error('Missing required fields: landlineNumber and either providerId or providerCode');
        }

        const provider = await this.resolveProvider({ providerId, providerCode, channel: 'MOMO' });
        const cfg = provider?.config || {};

        const HubtelClient = require('./providerClients/hubtelClient');
        const hubtel = new HubtelClient({
            baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
            clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
            clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
        });

        const serviceId = cfg.services?.TELECEL_BROADBAND?.serviceId || 'b9a1aa246ba748f9ba01ca4cdbb3d1d3';
        const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;

        const resp = await hubtel.queryDataBundles({
            prepaidDepositId,
            serviceId,
            destination: landlineNumber
        });

        await prisma.provider_responses.create({
            data: {
                aggregate_type: 'QUERY',
                aggregate_id: provider.id,
                provider: 'HUBTEL',
                provider_conversation_id: null,
                status: resp?.ResponseCode || 'PENDING',
                raw_response: resp
            }
        });

        return {
            responseCode: resp?.ResponseCode || null,
            message: resp?.Message || null,
            label: resp?.Label || null,
            data: Array.isArray(resp?.Data) ? resp.Data : []
        };
    }

    async purchaseTelecelBroadband(customerId, amount, landlineNumber, broadbandNumber, providerId, idempotencyKey, providerCode) {
        if (!customerId || !amount || !landlineNumber || !broadbandNumber || (!providerId && !providerCode)) {
            throw new Error('Missing required fields: customerId, amount, landlineNumber, broadbandNumber, and either providerId or providerCode');
        }

        if (amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        if (idempotencyKey) {
            const existingTransaction = await prisma.transactions.findUnique({ where: { idempotency_key: idempotencyKey } });
            if (existingTransaction) return existingTransaction;
        }

        const reference = this.generateReference('TEL_BB');
        const transactionType = 'DEBIT';
        const serviceType = 'TELECEL_BROADBAND';

        const wallet = await prisma.wallet.findFirst({ where: { user_id: customerId, user_type: 'customer' } });
        if (!wallet) throw new Error('Customer wallet not found');
        if (wallet.balance < amount) throw new Error('Insufficient wallet balance');

        const provider = await this.resolveProvider({ providerId, providerCode, channel: 'MOBILE' });
        const transaction = await prisma.transactions.create({
            data: {
                customer_id: customerId,
                transaction_type: transactionType,
                reference,
                idempotency_key: idempotencyKey,
                wallet_address: wallet.wallet_address,
                amount,
                currency: wallet.currency || 'GHS',
                status: 'PENDING',
                description: `Telecel Broadband top-up for ${landlineNumber}`,
                balance_before: wallet.balance,
                balance_after: wallet.balance - amount,
                service_type: serviceType,
                user_type: 'CUSTOMER'
            }
        });

        await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: wallet.balance - amount, updated_at: new Date() } });

        const disbursement = await prisma.disbursements.create({
            data: {
                reference,
                transaction_id: transaction.id,
                channel: 'MOMO',
                amount,
                currency: wallet.currency || 'GHS',
                status: 'PENDING',
                provider_id: provider.id,
                payment_details: JSON.stringify({
                    phone_number: landlineNumber,
                    broadband_number: broadbandNumber,
                    utility_type: 'TELECEL_BROADBAND',
                    provider_code: provider.code || null
                }),
                disburse_type: 'TELECEL_BROADBAND',
                customer_id: customerId
            }
        });

        await prisma.transactions.update({ where: { id: transaction.id }, data: { status: 'PENDING' } });

        try {
            const cfg = provider?.config || {};
            const HubtelClient = require('./providerClients/hubtelClient');
            const hubtel = new HubtelClient({
                baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
                clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
                clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
            });

            const serviceId = cfg.services?.TELECEL_BROADBAND?.serviceId || 'b9a1aa246ba748f9ba01ca4cdbb3d1d3';
            const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;
            const callbackBase = process.env.PUBLIC_BASE_URL || process.env.HUBTEL_CALLBACK_BASE_URL;
            if (!callbackBase) throw new Error('Missing PUBLIC_BASE_URL or HUBTEL_CALLBACK_BASE_URL for Hubtel callback');
            const callbackUrl = `${String(callbackBase).replace(/\/$/, '')}/api/utilities/hubtel/callback`;
            const fixedAmount = Number(Number(amount).toFixed(2));

            const hubtelResp = await hubtel.purchaseCommission({
                prepaidDepositId,
                serviceId,
                destination: landlineNumber,
                amount: fixedAmount,
                callbackUrl,
                clientReference: reference,
                extradata: { Bundle: String(broadbandNumber) }
            });

            await prisma.provider_responses.create({
                data: {
                    aggregate_type: 'DISBURSEMENT',
                    aggregate_id: disbursement.id,
                    provider: 'HUBTEL',
                    provider_conversation_id: hubtelResp?.TransactionId || hubtelResp?.reference || null,
                    status: hubtelResp?.Status || 'PENDING',
                    raw_response: hubtelResp
                }
            });
            await prisma.disbursements.update({ where: { id: disbursement.id }, data: { status: 'PENDING', provider_ref: hubtelResp?.Data?.TransactionId || hubtelResp?.TransactionId || null } });
            await prisma.transactions.update({ where: { id: transaction.id }, data: { status: 'PROCESSING' } });
            await prisma.utilities.updateMany({ where: { reference: reference }, data: { status: 'PENDING' } });
        } catch (err) {
            await prisma.provider_responses.create({ data: { aggregate_type: 'DISBURSEMENT', aggregate_id: disbursement.id, provider: 'HUBTEL', status: 'FAILED', raw_response: { error: err.message } } });
            await prisma.disbursements.update({ where: { id: disbursement.id }, data: { status: 'FAILED', error_message: err.message } });
            await prisma.transactions.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
            await prisma.utilities.updateMany({ where: { reference: reference }, data: { status: 'FAILED' } });
            throw new Error(`Hubtel telecel broadband request failed: ${err.message}`);
        }

        return { transaction, disbursement, reference, landlineNumber, broadbandNumber, amount, status: 'PROCESSING' };
    }

    async queryMtnDataBundles(phoneNumber) {
        // Convenience wrapper for MTN data bundles using providerCode
        return this.queryDataBundlesByPhone(null, 'MTN_DATA', phoneNumber);
    }

    async purchaseMtnData(customerId, amount, phoneNumber, bundleType, idempotencyKey) {
        // Convenience wrapper for MTN data bundle purchase using providerCode
        return this.purchaseDataBundle(customerId, amount, phoneNumber, bundleType, null, idempotencyKey, 'MTN_DATA');
    }

    async payBill(customerId, amount, accountNumber, providerId, idempotencyKey, providerCode, serviceKey, defaultServiceId, descriptionPrefix) {
        if (!customerId || !amount || !accountNumber || (!providerId && !providerCode)) {
            throw new Error('Missing required fields: customerId, amount, accountNumber, and either providerId or providerCode');
        }

        if (amount <= 0) throw new Error('Amount must be greater than 0');

        if (idempotencyKey) {
            const existingTransaction = await prisma.transactions.findUnique({ where: { idempotency_key: idempotencyKey } });
            if (existingTransaction) return existingTransaction;
        }

        const reference = this.generateReference(serviceKey);
        const transactionType = 'DEBIT';
        const serviceType = serviceKey;

        const wallet = await prisma.wallet.findFirst({ where: { user_id: customerId, user_type: 'customer' } });
        if (!wallet) throw new Error('Customer wallet not found');
        if (wallet.balance < amount) throw new Error('Insufficient wallet balance');

        const provider = await this.resolveProvider({ providerId, providerCode, channel: 'MOMO' });
        const transaction = await prisma.transactions.create({
            data: {
                customer_id: customerId,
                transaction_type: transactionType,
                reference,
                idempotency_key: idempotencyKey,
                wallet_address: wallet.wallet_address,
                amount,
                currency: wallet.currency || 'GHS',
                status: 'PENDING',
                description: `${descriptionPrefix} ${accountNumber}`,
                balance_before: wallet.balance,
                balance_after: wallet.balance - amount,
                service_type: serviceType,
                user_type: 'CUSTOMER'
            }
        });

        await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: wallet.balance - amount, updated_at: new Date() } });

        const disbursement = await prisma.disbursements.create({
            data: {
                reference,
                transaction_id: transaction.id,
                channel: 'MOMO',
                amount,
                currency: wallet.currency || 'GHS',
                status: 'PENDING',
                provider_id: provider.id,
                payment_details: JSON.stringify({
                    account_number: accountNumber,
                    utility_type: serviceKey,
                    provider_code: provider.code || null
                }),
                disburse_type: serviceKey,
                customer_id: customerId
            }
        });

        await prisma.transactions.update({ where: { id: transaction.id }, data: { status: 'PENDING' } });

        try {
            const cfg = provider?.config || {};
            const HubtelClient = require('./providerClients/hubtelClient');
            const hubtel = new HubtelClient({
                baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
                clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
                clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
            });

            const serviceId = (cfg.services?.[serviceKey]?.serviceId) || defaultServiceId;
            const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;
            const callbackBase = process.env.PUBLIC_BASE_URL || process.env.HUBTEL_CALLBACK_BASE_URL;
            if (!callbackBase) throw new Error('Missing PUBLIC_BASE_URL or HUBTEL_CALLBACK_BASE_URL for Hubtel callback');
            const callbackUrl = `${String(callbackBase).replace(/\/$/, '')}/api/utilities/hubtel/callback`;
            const fixedAmount = Number(Number(amount).toFixed(2));

            // Create utilities record prior to provider call and link transaction
            const utility = await prisma.utilities.create({
                data: {
                    amount: fixedAmount,
                    user_id: customerId,
                    user_type: 'CUSTOMER',
                    service_id: provider.id,
                    request_details: JSON.stringify({
                        account_number: accountNumber,
                        utility_type: serviceKey,
                        provider_id: provider.id,
                        provider_code: provider.code || null
                    }),
                    status: 'PENDING',
                    reference: reference,
                    callback_url: callbackUrl
                }
            });
            await prisma.transactions.update({ where: { id: transaction.id }, data: { related_service_id: utility.id } });

            const hubtelResp = await hubtel.purchaseCommission({
                prepaidDepositId,
                serviceId,
                destination: accountNumber,
                amount: fixedAmount,
                callbackUrl,
                clientReference: reference
            });

            await prisma.provider_responses.create({
                data: {
                    aggregate_type: 'DISBURSEMENT',
                    aggregate_id: disbursement.id,
                    provider: 'HUBTEL',
                    provider_conversation_id: hubtelResp?.TransactionId || hubtelResp?.reference || null,
                    status: hubtelResp?.Status || 'PENDING',
                    raw_response: hubtelResp
                }
            });
            await prisma.disbursements.update({ where: { id: disbursement.id }, data: { status: 'PENDING', provider_ref: hubtelResp?.Data?.TransactionId || hubtelResp?.TransactionId || null } });
            await prisma.transactions.update({ where: { id: transaction.id }, data: { status: 'PROCESSING' } });
            await prisma.utilities.updateMany({ where: { reference: reference }, data: { status: 'PENDING' } });
        } catch (err) {
            await prisma.provider_responses.create({ data: { aggregate_type: 'DISBURSEMENT', aggregate_id: disbursement.id, provider: 'HUBTEL', status: 'FAILED', raw_response: { error: err.message } } });
            await prisma.disbursements.update({ where: { id: disbursement.id }, data: { status: 'FAILED', error_message: err.message } });
            await prisma.transactions.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
            await prisma.utilities.updateMany({ where: { reference: reference }, data: { status: 'FAILED' } });
            throw new Error(`Hubtel bill payment request failed: ${err.message}`);
        }
        return { transaction, disbursement, reference, accountNumber, amount, status: 'PROCESSING' };
    }

    async dstvQuery(providerId, providerCode, accountNumber) {
        return this.queryBillAccount(providerId, providerCode, accountNumber, 'DSTV', '297a96656b5846ad8b00d5d41b256ea7');
    }
    async dstvPay(customerId, amount, accountNumber, providerId, idempotencyKey, providerCode) {
        return this.payBill(customerId, amount, accountNumber, providerId, idempotencyKey, providerCode, 'DSTV', '297a96656b5846ad8b00d5d41b256ea7', 'DSTV bill payment for');
    }

    async gotvQuery(providerId, providerCode, accountNumber) {
        return this.queryBillAccount(providerId, providerCode, accountNumber, 'GOTV', 'e6ceac7f3880435cb30b048e9617eb41');
    }
    async gotvPay(customerId, amount, accountNumber, providerId, idempotencyKey, providerCode) {
        return this.payBill(customerId, amount, accountNumber, providerId, idempotencyKey, providerCode, 'GOTV', 'e6ceac7f3880435cb30b048e9617eb41', 'GoTV bill payment for');
    }

    async startimesQuery(providerId, providerCode, accountNumber) {
        return this.queryBillAccount(providerId, providerCode, accountNumber, 'STARTIMES', '6598652d34ea4112949c93c079c501ce');
    }
    async startimesPay(customerId, amount, accountNumber, providerId, idempotencyKey, providerCode) {
        return this.payBill(customerId, amount, accountNumber, providerId, idempotencyKey, providerCode, 'STARTIMES', '6598652d34ea4112949c93c079c501ce', 'StarTimes bill payment for');
    }

    async checkTxnStatus(posSalesId, { clientReference, hubtelTransactionId, networkTransactionId }) {
        const HubtelClient = require('./providerClients/hubtelClient');
        const hubtel = new HubtelClient({ baseUrl: process.env.HUBTEL_BASE_URL, clientId: process.env.HUBTEL_CLIENT_ID, clientSecret: process.env.HUBTEL_CLIENT_SECRET });
        return hubtel.checkTransactionStatus({ posSalesId, clientReference, hubtelTransactionId, networkTransactionId });
    }
    

    async listProviders(channel, utility) {
        return prisma.payment_providers.findMany({
            where: { active: true, channel },
            select: { id: true, name: true, code: true, channel: true }
        });
    }

    async listBundles(providerId) {
        const provider = await prisma.payment_providers.findUnique({ where: { id: providerId } });
        const cfg = provider?.config || {};
        return cfg.bundles || [];
    }

    async queryDataBundlesByPhone(providerId, providerCode, phoneNumber) {
        if (!phoneNumber || (!providerId && !providerCode)) {
            throw new Error('Missing required fields: phoneNumber and either providerId or providerCode');
        }

        const provider = await this.resolveProvider({ providerId, providerCode, channel: 'MOBILE' });
        const cfg = provider?.config || {};

        const HubtelClient = require('./providerClients/hubtelClient');
        const hubtel = new HubtelClient({
            baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
            clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
            clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
        });

        const serviceId = cfg.services?.DATA_BUNDLE?.serviceId || 'b230733cd56b4a0fad820e39f66bc27c';
        const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;

        const resp = await hubtel.queryDataBundles({
            prepaidDepositId,
            serviceId,
            destination: phoneNumber
        });

        await prisma.provider_responses.create({
            data: {
                aggregate_type: 'QUERY',
                aggregate_id: provider.id,
                provider: 'HUBTEL',
                provider_conversation_id: null,
                status: resp?.ResponseCode || 'PENDING',
                raw_response: resp
            }
        });

        const bundles = Array.isArray(resp?.Data)
            ? resp.Data.map(x => ({
                display: x?.Display || null,
                value: x?.Value || null,
                amount: x?.Amount ?? null
            }))
            : [];

        return {
            responseCode: resp?.ResponseCode || null,
            message: resp?.Message || null,
            label: resp?.Label || null,
            bundles
        };
    }

    async queryBroadbandBundlesByPhone(providerId, providerCode, phoneNumber) {
        if (!phoneNumber || (!providerId && !providerCode)) {
            throw new Error('Missing required fields: phoneNumber and either providerId or providerCode');
        }

        const provider = await this.resolveProvider({ providerId, providerCode, channel: 'MOBILE' });
        const cfg = provider?.config || {};

        const HubtelClient = require('./providerClients/hubtelClient');
        const hubtel = new HubtelClient({
            baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
            clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
            clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
        });

        const serviceId = cfg.services?.BROADBAND?.serviceId || '39fbe120e9b542899eb7dad526fb04b9';
        const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;

        const resp = await hubtel.queryDataBundles({
            prepaidDepositId,
            serviceId,
            destination: phoneNumber
        });

        await prisma.provider_responses.create({
            data: {
                aggregate_type: 'QUERY',
                aggregate_id: provider.id,
                provider: 'HUBTEL',
                provider_conversation_id: null,
                status: resp?.ResponseCode || 'PENDING',
                raw_response: resp
            }
        });

        const bundles = Array.isArray(resp?.Data)
            ? resp.Data.map(x => ({
                display: x?.Display || null,
                value: x?.Value || null,
                amount: x?.Amount ?? null
            }))
            : [];

        return {
            responseCode: resp?.ResponseCode || null,
            message: resp?.Message || null,
            label: resp?.Label || null,
            bundles
        };
    }

    async queryElectricityByPhone(providerId, providerCode, phoneNumber) {
        if (!phoneNumber || (!providerId && !providerCode)) {
            throw new Error('Missing required fields: phoneNumber and either providerId or providerCode');
        }

        const provider = await this.resolveProvider({ providerId, providerCode, channel: 'UTILITY' });
        const cfg = provider?.config || {};

        const HubtelClient = require('./providerClients/hubtelClient');
        const hubtel = new HubtelClient({
            baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
            clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
            clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
        });

        const serviceId = cfg.services?.ELECTRICITY?.serviceId || 'e6d6bac062b5499cb1ece1ac3d742a84';
        const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;

        const resp = await hubtel.queryEcgMeter({
            prepaidDepositId,
            serviceId,
            destination: phoneNumber
        });

        await prisma.provider_responses.create({
            data: {
                aggregate_type: 'QUERY',
                aggregate_id: provider.id,
                provider: 'HUBTEL',
                provider_conversation_id: null,
                status: resp?.ResponseCode || 'PENDING',
                raw_response: resp
            }
        });

        const meters = Array.isArray(resp?.Data)
            ? resp.Data.map(x => ({
                display: x?.Display || null,
                meterNumber: x?.Value || null,
                outstandingAmount: x?.Amount ?? null
            }))
            : [];

        return {
            responseCode: resp?.ResponseCode || null,
            message: resp?.Message || null,
            label: resp?.Label || null,
            meters
        };
    }

    async queryGwclMeter(providerId, providerCode, meterNumber, phoneNumber) {
        if (!meterNumber || !phoneNumber || (!providerId && !providerCode)) {
            throw new Error('Missing required fields: meterNumber, phoneNumber and either providerId or providerCode');
        }

        const provider = await this.resolveProvider({ providerId, providerCode, channel: 'UTILITY' });
        const cfg = provider?.config || {};

        const HubtelClient = require('./providerClients/hubtelClient');
        const hubtel = new HubtelClient({
            baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
            clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
            clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
        });

        const serviceId = cfg.services?.GWCL?.serviceId || '6c1e8a82d2e84feeb8bfd6be2790d71d';
        const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;

        const resp = await hubtel.queryEcgMeter({
            prepaidDepositId,
            serviceId,
            destination: meterNumber,
            mobile: phoneNumber
        });

        await prisma.provider_responses.create({
            data: {
                aggregate_type: 'QUERY',
                aggregate_id: provider.id,
                provider: 'HUBTEL',
                provider_conversation_id: null,
                status: resp?.ResponseCode || 'PENDING',
                raw_response: resp
            }
        });

        const accounts = Array.isArray(resp?.Data)
            ? resp.Data.map(x => ({
                display: x?.Display || null,
                value: x?.Value || null,
                amount: x?.Amount ?? null
            }))
            : [];

        return {
            responseCode: resp?.ResponseCode || null,
            message: resp?.Message || null,
            label: resp?.Label || null,
            accounts
        };
    }
    /**
     * Generate unique reference for utility transactions
     */
    generateReference(utilityType) {
        const prefix = utilityType.toUpperCase().substring(0, 3);
        const timestamp = Date.now().toString().slice(-10);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Generate server-side idempotency key when client doesn't provide one
     */
    generateIdempotencyKey(prefix = 'UTIL') {
        const ts = Date.now();
        const uuid = typeof randomUUID === 'function'
            ? randomUUID()
            : Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        return `${prefix}-${ts}-${uuid}`.slice(0, 100);
    }

    /**
     * Purchase Electricity
     */
    async purchaseElectricity(customerId, amount, meterNumber, meterType, providerId, idempotencyKey, phoneNumber) {
        try {
            // Validate inputs
            if (!customerId || !amount || !meterNumber || !meterType || !providerId || !phoneNumber) {
                throw new Error('Missing required fields: customerId, amount, meterNumber, meterType, providerId, phoneNumber');
            }

            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            // Check for duplicate request using idempotency key
            if (idempotencyKey) {
                const existingTransaction = await prisma.transactions.findUnique({
                    where: { idempotency_key: idempotencyKey }
                });
                if (existingTransaction) {
                    return existingTransaction;
                }
            }

            const idemKey = idempotencyKey || this.generateIdempotencyKey('electricity');
            const reference = this.generateReference('electricity');
            const fixedAmount = Number(Number(amount).toFixed(2));
            const transactionType = 'DEBIT';
            const serviceType = 'electricity';

            // Get customer wallet
            const wallet = await prisma.wallet.findFirst({
                where: {
                    user_id: customerId,
                    user_type: 'customer'
                }
            });

            if (!wallet) {
                throw new Error('Customer wallet not found');
            }

            if (wallet.balance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            // Create transaction
            const transaction = await prisma.transactions.create({
                data: {
                    customer_id: customerId,
                    transaction_type: transactionType,
                    reference: reference,
                    idempotency_key: idemKey,
                    wallet_address: wallet.wallet_address,
                    amount: amount,
                    currency: wallet.currency || 'GHS',
                    status: 'PENDING',
                    description: `Electricity purchase for meter ${meterNumber}`,
                    balance_before: wallet.balance,
                    balance_after: wallet.balance - amount,
                    service_type: serviceType,
                    user_type: 'CUSTOMER'
                }
            });

            console.log('Wallet ID:', JSON.stringify(wallet));
            // Update wallet balance
            await prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: wallet.balance - amount,
                    updated_at: new Date()
                }
            });

            // Resolve provider and prepare config
            const provider = await this.resolveProvider({ providerId, providerCode: undefined, channel: 'MOMO' });
            const DISBURSEMENTS_ENABLED = String(process.env.DISBURSEMENTS_ENABLED || 'true').toLowerCase() !== 'false';

            // Build callback URL (required for utilities record and provider call)
            const callbackBase = process.env.PUBLIC_BASE_URL || process.env.HUBTEL_CALLBACK_BASE_URL;
            if (!callbackBase) {
                throw new Error('Missing PUBLIC_BASE_URL or HUBTEL_CALLBACK_BASE_URL for Hubtel callback');
            }
            const callbackUrl = `${String(callbackBase).replace(/\/$/, '')}/api/utilities/hubtel/callback`;

            // Create utilities record (operational tracking)
            const utility = await prisma.utilities.create({
                data: {
                    amount: fixedAmount,
                    user_id: customerId,
                    user_type: 'CUSTOMER',
                    service_id: provider.id,
                    request_details: JSON.stringify({
                        meter_number: meterNumber,
                        meter_type: meterType,
                        phone_number: phoneNumber,
                        utility_type: 'electricity',
                        provider_id: provider.id,
                        provider_code: provider.code || null
                    }),
                    channel: 'MOMO',
                    status: 'PENDING',
                    reference: reference,
                    callback_url: callbackUrl
                }
            });

            // Link transaction to utility record
            await prisma.transactions.update({
                where: { id: transaction.id },
                data: { related_service_id: utility.id }
            });

            // Optionally create disbursement
            const disbursement = DISBURSEMENTS_ENABLED
                ? await prisma.disbursements.create({
                    data: {
                        reference: reference,
                        transaction_id: transaction.id,
                        channel: 'MOMO',
                        amount: amount,
                        currency: wallet.currency || 'GHS',
                        status: 'PENDING',
                        provider_id: provider.id,
                        payment_details: JSON.stringify({
                            meter_number: meterNumber,
                            meter_type: meterType,
                            utility_type: 'electricity'
                        }),
                        disburse_type: 'electricity',
                        customer_id: customerId
                    }
                })
                : null;

            // Update transaction status
            await prisma.transactions.update({
                where: { id: transaction.id },
                data: { status: 'PENDING' }
            });

            // Call Hubtel ECG top-up
            try {
                const cfg = provider?.config || {};
                const HubtelClient = require('./providerClients/hubtelClient');
                const hubtel = new HubtelClient({
                    baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
                    clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
                    clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
                });

                const serviceId = cfg.services?.ELECTRICITY?.serviceId || 'e6d6bac062b5499cb1ece1ac3d742a84';
                const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;

                const hubtelResp = await hubtel.purchaseElectricityTopup({
                    prepaidDepositId,
                    serviceId,
                    destination: phoneNumber,
                    amount: fixedAmount,
                    callbackUrl,
                    clientReference: reference,
                    meterNumber
                });

                // Log provider response
                await prisma.provider_responses.create({
                    data: {
                        aggregate_type: DISBURSEMENTS_ENABLED ? 'DISBURSEMENT' : 'UTILITY',
                        aggregate_id: DISBURSEMENTS_ENABLED ? disbursement.id : utility.id,
                        provider: 'HUBTEL',
                        provider_conversation_id: hubtelResp?.TransactionId || null,
                        status: hubtelResp?.ResponseCode || 'PENDING',
                        raw_response: hubtelResp
                    }
                });

                // Map response codes to internal status
                const responseCode = String(hubtelResp?.ResponseCode || '').trim();
                let mappedStatus = 'PENDING';
                if (responseCode === '0000') mappedStatus = 'SUCCESS';
                else if (responseCode === '0001') mappedStatus = 'PENDING';
                else if (responseCode) mappedStatus = 'FAILED';

                if (DISBURSEMENTS_ENABLED && disbursement?.id) {
                    await prisma.disbursements.update({
                        where: { id: disbursement.id },
                        data: {
                            status: mappedStatus,
                            provider_ref: hubtelResp?.TransactionId || null
                        }
                    });
                }
                await prisma.transactions.update({
                    where: { id: transaction.id },
                    data: { status: mappedStatus === 'SUCCESS' ? 'SUCCESS' : mappedStatus === 'FAILED' ? 'FAILED' : 'PENDING' }
                });
                await prisma.utilities.updateMany({
                    where: { reference: reference },
                    data: { status: mappedStatus }
                });
            } catch (err) {
                await prisma.provider_responses.create({
                    data: {
                        aggregate_type: DISBURSEMENTS_ENABLED ? 'DISBURSEMENT' : 'UTILITY',
                        aggregate_id: DISBURSEMENTS_ENABLED ? (disbursement?.id || null) : utility.id,
                        provider: 'HUBTEL',
                        status: 'FAILED',
                        raw_response: { error: err.message }
                    }
                });
                if (DISBURSEMENTS_ENABLED && disbursement?.id) {
                    await prisma.disbursements.update({
                        where: { id: disbursement.id },
                        data: { status: 'FAILED', error_message: err.message }
                    });
                }
                await prisma.transactions.update({
                    where: { id: transaction.id },
                    data: { status: 'FAILED' }
                });
                await prisma.utilities.updateMany({
                    where: { reference: reference },
                    data: { status: 'FAILED' }
                });
                throw new Error(`Hubtel ECG top-up failed: ${err.message}`);
            }

            return {
                transaction,
                disbursement,
                utility: DISBURSEMENTS_ENABLED ? undefined : utility,
                reference,
                meterNumber,
                amount,
                status: 'PROCESSING'
            };
        } catch (error) {
            throw new Error(`Electricity purchase failed: ${error.message}`);
        }
    }

    /**
     * Purchase Water
     */
    async purchaseWater(customerId, amount, accountNumber, providerId, idempotencyKey) {
        try {
            if (!customerId || !amount || !accountNumber || !providerId) {
                throw new Error('Missing required fields: customerId, amount, accountNumber, providerId');
            }

            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            if (idempotencyKey) {
                const existingTransaction = await prisma.transactions.findUnique({
                    where: { idempotency_key: idempotencyKey }
                });
                if (existingTransaction) {
                    return existingTransaction;
                }
            }

            const idemKey = idempotencyKey || this.generateIdempotencyKey('WATER');
            const reference = this.generateReference('water');
            const transactionType = 'DEBIT';
            const serviceType = 'Water';

            const wallet = await prisma.wallet.findFirst({
                where: {
                    user_id: customerId,
                    user_type: 'customer'
                }
            });

            if (!wallet) {
                throw new Error('Customer wallet not found');
            }

            if (wallet.balance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            const transaction = await prisma.transactions.create({
                data: {
                    customer_id: customerId,
                    transaction_type: transactionType,
                    reference: reference,
                    idempotency_key: idemKey,
                    wallet_address: wallet.wallet_address,
                    amount: amount,
                    currency: wallet.currency || 'GHS',
                    status: 'PENDING',
                    description: `Water bill payment for account ${accountNumber}`,
                    balance_before: wallet.balance,
                    balance_after: wallet.balance - amount,
                    service_type: serviceType,
                    user_type: 'CUSTOMER'
                }
            });

            await prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: wallet.balance - amount,
                    updated_at: new Date()
                }
            });

            const disbursement = await prisma.disbursements.create({
                data: {
                    reference: reference,
                    transaction_id: transaction.id,
                    channel: 'MOMO',
                    amount: amount,
                    currency: wallet.currency || 'GHS',
                    status: 'PENDING',
                    provider_id: providerId,
                    payment_details: JSON.stringify({
                        account_number: accountNumber,
                        utility_type: 'Water'
                    }),
                    disburse_type: 'Water',
                    customer_id: customerId
                }
            });

            await prisma.transactions.update({
                where: { id: transaction.id },
                data: { status: 'PENDING' }
            });

            // Create utilities record and link transaction (no provider call here yet)
            const fixedAmount = Number(Number(amount).toFixed(2));
            const utility = await prisma.utilities.create({
                data: {
                    amount: fixedAmount,
                    user_id: customerId,
                    user_type: 'CUSTOMER',
                    service_id: providerId,
                    request_details: JSON.stringify({
                        account_number: accountNumber,
                        utility_type: 'Water',
                        provider_id: providerId
                    }),
                    status: 'PENDING',
                    reference: reference
                }
            });
            await prisma.transactions.update({ where: { id: transaction.id }, data: { related_service_id: utility.id } });

            return {
                transaction,
                disbursement,
                reference,
                accountNumber,
                amount,
                status: 'PROCESSING'
            };
        } catch (error) {
            throw new Error(`Water bill payment failed: ${error.message}`);
        }
    }

    /**
     * Purchase Data Bundle
     */
    async purchaseDataBundle(customerId, amount, phoneNumber, bundleType, providerId, idempotencyKey, providerCode) {
        try {
            if (!customerId || !amount || !phoneNumber || !bundleType || (!providerId && !providerCode)) {
                throw new Error('Missing required fields: customerId, amount, phoneNumber, bundleType, and either providerId or providerCode');
            }

            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            if (idempotencyKey) {
                const existingTransaction = await prisma.transactions.findUnique({
                    where: { idempotency_key: idempotencyKey }
                });
                if (existingTransaction) {
                    return existingTransaction;
                }
            }

            const idemKey = idempotencyKey || this.generateIdempotencyKey('DATA');
            const reference = this.generateReference('DATA');
            const transactionType = 'DEBIT';
            const serviceType = 'DATA_BUNDLE';

            const wallet = await prisma.wallet.findFirst({
                where: {
                    user_id: customerId,
                    user_type: 'customer'
                }
            });

            if (!wallet) {
                throw new Error('Customer wallet not found');
            }

            if (wallet.balance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            const provider = await this.resolveProvider({ providerId, providerCode, channel: 'MOMO' });

            const transaction = await prisma.transactions.create({
                data: {
                    customer_id: customerId,
                    transaction_type: transactionType,
                    reference: reference,
                    idempotency_key: idempotencyKey,
                    wallet_address: wallet.wallet_address,
                    amount: amount,
                    currency: wallet.currency || 'GHS',
                    status: 'PENDING',
                    description: `Data bundle purchase for ${phoneNumber} - ${bundleType}`,
                    balance_before: wallet.balance,
                    balance_after: wallet.balance - amount,
                    service_type: serviceType,
                    user_type: 'CUSTOMER'
                }
            });

            await prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: wallet.balance - amount,
                    updated_at: new Date()
                }
            });

            // Build callback URL and create utilities record similar to electricity/airtime
            const callbackBase = process.env.PUBLIC_BASE_URL || process.env.HUBTEL_CALLBACK_BASE_URL;
            if (!callbackBase) {
                throw new Error('Missing PUBLIC_BASE_URL or HUBTEL_CALLBACK_BASE_URL for Hubtel callback');
            }
            const callbackUrl = `${String(callbackBase).replace(/\/$/, '')}/api/utilities/hubtel/callback`;
            const fixedAmount = Number(Number(amount).toFixed(2));

            const utility = await prisma.utilities.create({
                data: {
                    amount: fixedAmount,
                    user_id: customerId,
                    user_type: 'CUSTOMER',
                    service_id: provider.id,
                    request_details: JSON.stringify({
                        phone_number: phoneNumber,
                        bundle_type: bundleType,
                        utility_type: 'DATA_BUNDLE',
                        provider_id: provider.id,
                        provider_code: provider.code || null
                    }),
                    channel: 'MOMO',
                    status: 'PENDING',
                    reference: reference,
                    callback_url: callbackUrl
                }
            });

            // Link transaction to utility record
            await prisma.transactions.update({
                where: { id: transaction.id },
                data: { related_service_id: utility.id }
            });

            const disbursement = await prisma.disbursements.create({
                data: {
                    reference: reference,
                    transaction_id: transaction.id,
                    channel: 'MOMO',
                    amount: amount,
                    currency: wallet.currency || 'GHS',
                    status: 'PENDING',
                    provider_id: provider.id,
                    payment_details: JSON.stringify({
                        phone_number: phoneNumber,
                        bundle_type: bundleType,
                        utility_type: 'DATA_BUNDLE',
                        provider_code: provider.code || null
                    }),
                    disburse_type: 'DATA_BUNDLE',
                    customer_id: customerId
                }
            });

            await prisma.transactions.update({
                where: { id: transaction.id },
                data: { status: 'PROCESSING' }
            });

            // Call Hubtel commissionservices for Data top-up
            try {
                const cfg = provider?.config || {};
                const HubtelClient = require('./providerClients/hubtelClient');
                const hubtel = new HubtelClient({
                    baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
                    clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
                    clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
                });

                const serviceId = cfg.services?.DATA_BUNDLE?.serviceId || 'b230733cd56b4a0fad820e39f66bc27c';
                const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;

                const hubtelResp = await hubtel.purchaseDataBundleTopup({
                    prepaidDepositId,
                    serviceId,
                    destination: phoneNumber,
                    amount: fixedAmount,
                    callbackUrl,
                    clientReference: reference,
                    bundleValue: bundleType
                });

                await prisma.provider_responses.create({
                    data: {
                        aggregate_type: 'DISBURSEMENT',
                        aggregate_id: disbursement.id,
                        provider: 'HUBTEL',
                        provider_conversation_id: hubtelResp?.TransactionId || hubtelResp?.reference || null,
                        status: hubtelResp?.Status || 'PENDING',
                        raw_response: hubtelResp
                    }
                });

                await prisma.disbursements.update({
                    where: { id: disbursement.id },
                    data: {
                        status: 'PENDING',
                        provider_ref: hubtelResp?.Data?.TransactionId || hubtelResp?.TransactionId || null
                    }
                });
                await prisma.transactions.update({
                    where: { id: transaction.id },
                    data: { status: 'PROCESSING' }
                });
                // Update utilities to PENDING (final status will arrive via callback)
                await prisma.utilities.updateMany({
                    where: { reference: reference },
                    data: { status: 'PENDING' }
                });
            } catch (err) {
                await prisma.provider_responses.create({
                    data: {
                        aggregate_type: 'DISBURSEMENT',
                        aggregate_id: disbursement.id,
                        provider: 'HUBTEL',
                        status: 'FAILED',
                        raw_response: { error: err.message }
                    }
                });
                await prisma.disbursements.update({
                    where: { id: disbursement.id },
                    data: { status: 'FAILED', error_message: err.message }
                });
                await prisma.transactions.update({
                    where: { id: transaction.id },
                    data: { status: 'FAILED' }
                });
                await prisma.utilities.updateMany({
                    where: { reference: reference },
                    data: { status: 'FAILED' }
                });
                throw new Error(`Hubtel data request failed: ${err.message}`);
            }

            return {
                transaction,
                disbursement,
                reference,
                phoneNumber,
                bundleType,
                amount,
                status: 'PROCESSING'
            };
        } catch (error) {
            throw new Error(`Data bundle purchase failed: ${error.message}`);
        }
    }

    async purchaseBroadbandBundle(customerId, amount, phoneNumber, bundleType, providerId, idempotencyKey, providerCode) {
        try {
            if (!customerId || !amount || !phoneNumber || !bundleType || (!providerId && !providerCode)) {
                throw new Error('Missing required fields: customerId, amount, phoneNumber, bundleType, and either providerId or providerCode');
            }

            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            if (idempotencyKey) {
                const existingTransaction = await prisma.transactions.findUnique({
                    where: { idempotency_key: idempotencyKey }
                });
                if (existingTransaction) {
                    return existingTransaction;
                }
            }

            const idemKey = idempotencyKey || this.generateIdempotencyKey('BROADBAND');
            const reference = this.generateReference('broadband');
            const transactionType = 'DEBIT';
            const serviceType = 'broadband';

            const wallet = await prisma.wallet.findFirst({
                where: {
                    user_id: customerId,
                    user_type: 'customer'
                }
            });

            if (!wallet) {
                throw new Error('Customer wallet not found');
            }

            if (wallet.balance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            const provider = await this.resolveProvider({ providerId, providerCode, channel: 'MOBILE' });

            const transaction = await prisma.transactions.create({
                data: {
                    customer_id: customerId,
                    transaction_type: transactionType,
                    reference: reference,
                    idempotency_key: idempotencyKey,
                    wallet_address: wallet.wallet_address,
                    amount: amount,
                    currency: wallet.currency || 'GHS',
                    status: 'PENDING',
                    description: `Broadband bundle purchase for ${phoneNumber} - ${bundleType}`,
                    balance_before: wallet.balance,
                    balance_after: wallet.balance - amount,
                    service_type: serviceType,
                    user_type: 'CUSTOMER'
                }
            });

            await prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: wallet.balance - amount,
                    updated_at: new Date()
                }
            });

            // Build callback URL and create utilities record similar to electricity/airtime
            const callbackBase = process.env.PUBLIC_BASE_URL || process.env.HUBTEL_CALLBACK_BASE_URL;
            if (!callbackBase) {
                throw new Error('Missing PUBLIC_BASE_URL or HUBTEL_CALLBACK_BASE_URL for Hubtel callback');
            }
            const callbackUrl = `${String(callbackBase).replace(/\/$/, '')}/api/utilities/hubtel/callback`;
            const fixedAmount = Number(Number(amount).toFixed(2));

            const utility = await prisma.utilities.create({
                data: {
                    amount: fixedAmount,
                    user_id: customerId,
                    user_type: 'CUSTOMER',
                    service_id: provider.id,
                    request_details: JSON.stringify({
                        phone_number: phoneNumber,
                        bundle_type: bundleType,
                        utility_type: 'BROADBAND',
                        provider_id: provider.id,
                        provider_code: provider.code || null
                    }),
                    channel: 'MOBILE',
                    status: 'PENDING',
                    reference: reference,
                    callback_url: callbackUrl
                }
            });

            // Link transaction to utility record
            await prisma.transactions.update({
                where: { id: transaction.id },
                data: { related_service_id: utility.id }
            });

            const disbursement = await prisma.disbursements.create({
                data: {
                    reference: reference,
                    transaction_id: transaction.id,
                    channel: 'MOBILE',
                    amount: amount,
                    currency: wallet.currency || 'GHS',
                    status: 'PENDING',
                    provider_id: provider.id,
                    payment_details: JSON.stringify({
                        phone_number: phoneNumber,
                        bundle_type: bundleType,
                        utility_type: 'BROADBAND',
                        provider_code: provider.code || null
                    }),
                    disburse_type: 'BROADBAND',
                    customer_id: customerId
                }
            });

            await prisma.transactions.update({
                where: { id: transaction.id },
                data: { status: 'PROCESSING' }
            });

            try {
                const cfg = provider?.config || {};
                const HubtelClient = require('./providerClients/hubtelClient');
                const hubtel = new HubtelClient({
                    baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
                    clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
                    clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
                });

                const serviceId = cfg.services?.BROADBAND?.serviceId || '39fbe120e9b542899eb7dad526fb04b9';
                const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;
                const callbackBase = process.env.PUBLIC_BASE_URL || process.env.HUBTEL_CALLBACK_BASE_URL;
                if (!callbackBase) {
                    throw new Error('Missing PUBLIC_BASE_URL or HUBTEL_CALLBACK_BASE_URL for Hubtel callback');
                }
                const callbackUrl = `${String(callbackBase).replace(/\/$/, '')}/api/utilities/hubtel/callback`;
                const fixedAmount = Number(Number(amount).toFixed(2));

                const hubtelResp = await hubtel.purchaseDataBundleTopup({
                    prepaidDepositId,
                    serviceId,
                    destination: phoneNumber,
                    amount: fixedAmount,
                    callbackUrl,
                    clientReference: reference,
                    bundleValue: bundleType
                });

                await prisma.provider_responses.create({
                    data: {
                        aggregate_type: 'DISBURSEMENT',
                        aggregate_id: disbursement.id,
                        provider: 'HUBTEL',
                        provider_conversation_id: hubtelResp?.TransactionId || hubtelResp?.reference || null,
                        status: hubtelResp?.Status || 'PENDING',
                        raw_response: hubtelResp
                    }
                });

                await prisma.disbursements.update({
                    where: { id: disbursement.id },
                    data: {
                        status: 'PENDING',
                        provider_ref: hubtelResp?.Data?.TransactionId || hubtelResp?.TransactionId || null
                    }
                });
                await prisma.transactions.update({
                    where: { id: transaction.id },
                    data: { status: 'PROCESSING' }
                });
            } catch (err) {
                await prisma.provider_responses.create({
                    data: {
                        aggregate_type: 'DISBURSEMENT',
                        aggregate_id: disbursement.id,
                        provider: 'HUBTEL',
                        status: 'FAILED',
                        raw_response: { error: err.message }
                    }
                });
                await prisma.disbursements.update({
                    where: { id: disbursement.id },
                    data: { status: 'FAILED', error_message: err.message }
                });
                await prisma.transactions.update({
                    where: { id: transaction.id },
                    data: { status: 'FAILED' }
                });
                throw new Error(`Hubtel broadband request failed: ${err.message}`);
            }

            return {
                transaction,
                disbursement,
                reference,
                phoneNumber,
                bundleType,
                amount,
                status: 'PROCESSING'
            };
        } catch (error) {
            throw new Error(`Broadband bundle purchase failed: ${error.message}`);
        }
    }

    /**
     * Purchase Cable TV Subscription
     */
    async purchaseCableTV(customerId, amount, smartCardNumber, packageType, providerId, idempotencyKey) {
        try {
            if (!customerId || !amount || !smartCardNumber || !packageType || !providerId) {
                throw new Error('Missing required fields: customerId, amount, smartCardNumber, packageType, providerId');
            }

            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            if (idempotencyKey) {
                const existingTransaction = await prisma.transactions.findUnique({
                    where: { idempotency_key: idempotencyKey }
                });
                if (existingTransaction) {
                    return existingTransaction;
                }
            }

            const reference = this.generateReference('CABLE');
            const transactionType = 'UTILITY_PAYMENT';
            const serviceType = 'CABLE_TV';

            const wallet = await prisma.wallet.findFirst({
                where: {
                    user_id: customerId,
                    user_type: 'customer'
                }
            });

            if (!wallet) {
                throw new Error('Customer wallet not found');
            }

            if (wallet.balance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            const transaction = await prisma.transactions.create({
                data: {
                    customer_id: customerId,
                    transaction_type: transactionType,
                    reference: reference,
                    idempotency_key: idempotencyKey,
                    wallet_address: wallet.wallet_address,
                    amount: amount,
                    currency: wallet.currency || 'GHS',
                    status: 'PENDING',
                    description: `Cable TV subscription for smart card ${smartCardNumber} - ${packageType}`,
                    balance_before: wallet.balance,
                    balance_after: wallet.balance - amount,
                    service_type: serviceType,
                    user_type: 'CUSTOMER'
                }
            });

            await prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: wallet.balance - amount,
                    updated_at: new Date()
                }
            });

            const disbursement = await prisma.disbursements.create({
                data: {
                    reference: reference,
                    transaction_id: transaction.id,
                    channel: 'UTILITY',
                    amount: amount,
                    currency: wallet.currency || 'GHS',
                    status: 'PENDING',
                    provider_id: providerId,
                    payment_details: JSON.stringify({
                        smart_card_number: smartCardNumber,
                        package_type: packageType,
                        utility_type: 'CABLE_TV'
                    }),
                    disburse_type: 'CABLE_TV',
                    customer_id: customerId
                }
            });

            await prisma.transactions.update({
                where: { id: transaction.id },
                data: { status: 'PROCESSING' }
            });

            return {
                transaction,
                disbursement,
                reference,
                smartCardNumber,
                packageType,
                amount,
                status: 'PROCESSING'
            };
        } catch (error) {
            throw new Error(`Cable TV subscription failed: ${error.message}`);
        }
    }

    /**
     * Purchase Airtime
     */
    async purchaseAirtime(customerId, amount, phoneNumber, providerId, idempotencyKey, providerCode) {
        try {
            if (!customerId || !amount || !phoneNumber || (!providerId && !providerCode)) {
                throw new Error('Missing required fields: customerId, amount, phoneNumber, and either providerId or providerCode');
            }

            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            if (idempotencyKey) {
                const existingTransaction = await prisma.transactions.findUnique({
                    where: { idempotency_key: idempotencyKey }
                });
                if (existingTransaction) {
                    return existingTransaction;
                }
            }

            const idemKey = idempotencyKey || this.generateIdempotencyKey('AIRTIME');
            const reference = this.generateReference('AIRTIME');
            const DISBURSEMENTS_ENABLED = String(process.env.DISBURSEMENTS_ENABLED || 'true').toLowerCase() !== 'false';
            const transactionType = 'DEBIT';
            const serviceType = 'airtime_purchase';

            const wallet = await prisma.wallet.findFirst({
                where: {
                    user_id: customerId,
                    user_type: 'customer'
                }
            });

            if (!wallet) {
                throw new Error('Customer wallet not found');
            }
            
            if (wallet.balance < amount) {
                throw new Error('Insufficient wallet balance');
            }
            
            const provider = await this.resolveProvider({ providerId, providerCode, channel: 'MOMO' });
            await prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: wallet.balance - amount,
                    updated_at: new Date()
                }
            });
            
            const transaction = await prisma.transactions.create({
                data: {
                    customer_id: customerId,
                    transaction_type: transactionType,
                    reference: reference,
                    idempotency_key: idempotencyKey,
                    wallet_address: wallet.wallet_address,
                    amount: amount,
                    currency: wallet.currency || 'GHS',
                    channel: 'MOMO',
                    status: 'PENDING',
                    description: `Airtime purchase for ${phoneNumber}`,
                    balance_before: wallet.balance,
                    balance_after: wallet.balance - amount,
                    service_type: serviceType,
                    user_type: 'CUSTOMER'
                }
            });
            //////MOVE BACK UP

            const disbursement = DISBURSEMENTS_ENABLED
                ? await prisma.disbursements.create({
                    data: {
                        reference: reference,
                        transaction_id: transaction.id,
                        channel: 'MOMO',
                        amount: amount,
                        currency: wallet.currency || 'GHS',
                        status: 'PENDING',
                        provider_id: provider.id,
                        payment_details: JSON.stringify({
                            phone_number: phoneNumber,
                            utility_type: 'AIRTIME',
                            provider_code: provider.code || null
                        }),
                        disburse_type: 'AIRTIME',
                        customer_id: customerId
                    }
                })
                : null;

            //await prisma.transactions.update({
            //    where: { id: transaction.id },
            //    data: { status: 'PENDING' }
            //});
            console.log('Transaction created:', transaction);

            // Call Hubtel Commission Services for Airtime (per docs)
            try {
                    const cfg = provider?.config || {};
                    const HubtelClient = require('./providerClients/hubtelClient');
                    const hubtel = new HubtelClient({
                        baseUrl: cfg.baseUrl || process.env.HUBTEL_BASE_URL,
                        clientId: cfg.clientId || process.env.HUBTEL_CLIENT_ID,
                        clientSecret: cfg.clientSecret || process.env.HUBTEL_CLIENT_SECRET
                    });
                    
                    // Determine commission serviceId by provider or use defaults from docs
                    const providerCodeUpper = String(provider?.code || '').toUpperCase();
                    const defaultServiceIds = {
                        TELECEL: 'f4be83ad74c742e185224fdae1304800',
                        MTN: 'fdd76c884e614b1c8f669a3207b09a98',
                        AT: 'dae2142eb5a14c298eace60240c09e4b'
                    };
                    const serviceId = (cfg.services?.AIRTIME?.serviceId)
                    || defaultServiceIds[providerCodeUpper]
                    || defaultServiceIds.MTN; // fallback
                    const prepaidDepositId = cfg.prepaidDepositId || process.env.HUBTEL_PREPAID_DEPOSIT_ID;
                    
                    const callbackBase = process.env.PUBLIC_BASE_URL || process.env.HUBTEL_CALLBACK_BASE_URL;
                    if (!callbackBase) throw new Error('Missing PUBLIC_BASE_URL or HUBTEL_CALLBACK_BASE_URL for Hubtel callback');
                    const callbackUrl = `${String(callbackBase).replace(/\/$/, '')}/api/utilities/hubtel/callback`;
                    const fixedAmount = Number(Number(amount).toFixed(2));
                    
                    // Create utilities record prior to provider call
                    const utility = await prisma.utilities.create({
                        data: {
                            amount: fixedAmount,
                            user_id: customerId,
                            user_type: 'customer',
                            service_id: provider.id,
                            request_details: JSON.stringify({
                                phone_number: phoneNumber,
                                utility_type: 'AIRTIME',
                                provider_id: provider.id,
                                provider_code: provider.code || null
                            }),
                            status: 'PENDING',
                            reference: reference,
                            callback_url: callbackUrl
                        }
                    });
        
                    // Link transaction to utility record
                    await prisma.transactions.update({
                        where: { id: transaction.id },
                        data: { related_service_id: utility.id }
                    });
                    
                const hubtelResp = await hubtel.purchaseCommission({
                    prepaidDepositId,
                    serviceId,
                    destination: phoneNumber,
                    amount: fixedAmount,
                    callbackUrl,
                    clientReference: reference
                });

                await prisma.provider_responses.create({
                    data: {
                        aggregate_type: DISBURSEMENTS_ENABLED ? 'DISBURSEMENT' : 'UTILITY',
                        aggregate_id: DISBURSEMENTS_ENABLED ? disbursement.id : utility.id,
                        provider: 'HUBTEL',
                        provider_conversation_id: hubtelResp?.TransactionId || hubtelResp?.reference || null,
                        status: hubtelResp?.ResponseCode || hubtelResp?.Status || 'PENDING',
                        raw_response: hubtelResp
                    }
                });

                const responseCode = String(hubtelResp?.ResponseCode || '').trim();
                // Map response code per docs: 0000=SUCCESS, 0001=PENDING, others=FAILED
                let mappedStatus = 'PENDING';
                if (responseCode === '0000') mappedStatus = 'SUCCESS';
                else if (responseCode === '0001') mappedStatus = 'PENDING';
                else if (responseCode) mappedStatus = 'FAILED';

                if (DISBURSEMENTS_ENABLED) {
                    await prisma.disbursements.update({
                        where: { id: disbursement.id },
                        data: {
                            status: mappedStatus,
                            provider_ref: hubtelResp?.Data?.TransactionId || hubtelResp?.TransactionId || hubtelResp?.reference || null
                        }
                    });
                }
                await prisma.transactions.update({
                    where: { id: transaction.id },
                    data: { status: mappedStatus === 'SUCCESS' ? 'SUCCESS' : mappedStatus === 'FAILED' ? 'FAILED' : 'PROCESSING' }
                });
                await prisma.utilities.updateMany({
                    where: { reference: reference },
                    data: { status: mappedStatus }
                });
            } catch (err) {
                await prisma.provider_responses.create({
                    data: {
                        aggregate_type: DISBURSEMENTS_ENABLED ? 'DISBURSEMENT' : 'UTILITY',
                        aggregate_id: DISBURSEMENTS_ENABLED ? (disbursement?.id || null) : utility.id,
                        provider: 'HUBTEL',
                        status: 'FAILED',
                        raw_response: { error: err.message }
                    }
                });
                if (DISBURSEMENTS_ENABLED && disbursement?.id) {
                    await prisma.disbursements.update({
                        where: { id: disbursement.id },
                        data: { status: 'FAILED', error_message: err.message }
                    });
                }
                await prisma.transactions.update({
                    where: { id: transaction.id },
                    data: { status: 'FAILED' }
                });
                await prisma.utilities.updateMany({
                    where: { reference: reference },
                    data: { status: 'FAILED' }
                });
                throw new Error(`Hubtel airtime request failed: ${err.message}`);
            }

            return {
                transaction,
                disbursement,
                reference,
                phoneNumber,
                amount,
                status: 'PROCESSING'
            };
        } catch (error) {
            throw new Error(`Airtime purchase failed: ${error.message}`);
        }
    }
}

module.exports = new UtilityService();
