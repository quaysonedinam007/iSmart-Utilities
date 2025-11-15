const express = require("express");
const router = express.Router();
const utilityController = require("../controllers/utilityController");
const requireUser = require('../middlewares/requireUser');
const checkWalletBalance = require('../middlewares/checkWalletBalance');

/**
 * @swagger
 * /api/utilities/electricity:
 *   post:
 *     summary: Purchase electricity
 *     tags: [Utilities]
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID performing the purchase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - amount
 *               - meterNumber
 *               - meterType
 *               - providerId
 *               - phoneNumber
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               meterNumber:
 *                 type: string
 *               meterType:
 *                 type: string
 *                 enum: [PREPAID, POSTPAID]
 *               providerId:
 *                 type: string
 *                 format: uuid
 *               phoneNumber:
 *                 type: string
 *                 description: Mobile number linked to the meter (Destination)
 *               idempotencyKey:
 *                 type: string
 *                 description: Optional idempotency key; if omitted the server auto-generates one to prevent duplicate processing
 *     responses:
 *       200:
 *         description: Electricity purchase initiated successfully
 */
router.post("/electricity", requireUser, checkWalletBalance, (req, res) => utilityController.purchaseElectricity(req, res));

/**
 * @swagger
 * /api/utilities/water:
 *   post:
 *     summary: Pay water bill
 *     tags: [Utilities]
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID performing the purchase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - amount
 *               - accountNumber
 *               - providerId
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               accountNumber:
 *                 type: string
 *               providerId:
 *                 type: string
 *                 format: uuid
 *               idempotencyKey:
 *                 type: string
 *                 description: Optional idempotency key; if omitted the server auto-generates one to prevent duplicate processing
 *     responses:
 *       200:
 *         description: Water bill payment initiated successfully
 */
router.post("/water", requireUser, checkWalletBalance, (req, res) => utilityController.purchaseWater(req, res));

/**
 * @swagger
 * /api/utilities/data-bundle:
 *   post:
 *     summary: Purchase data bundle
 *     tags: [Utilities]
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID performing the purchase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - amount
 *               - phoneNumber
 *               - bundleType
 *               - providerId
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               phoneNumber:
 *                 type: string
 *               bundleType:
 *                 type: string
 *               providerId:
 *                 type: string
 *                 format: uuid
 *                 description: Either providerId or providerCode must be provided
 *               providerCode:
 *                 type: string
 *                 description: Either providerId or providerCode must be provided
 *               idempotencyKey:
 *                 type: string
 *                 description: Optional idempotency key; if omitted the server auto-generates one to prevent duplicate processing
 *     responses:
 *       200:
 *         description: Data bundle purchase initiated successfully
 */
router.post("/data-bundle", requireUser, checkWalletBalance, (req, res) => utilityController.purchaseDataBundle(req, res));

/**
 * @swagger
 * /api/utilities/cable-tv:
 *   post:
 *     summary: Purchase cable TV subscription
 *     tags: [Utilities]
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID performing the purchase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - amount
 *               - smartCardNumber
 *               - packageType
 *               - providerId
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               smartCardNumber:
 *                 type: string
 *               packageType:
 *                 type: string
 *               providerId:
 *                 type: string
 *                 format: uuid
 *               idempotencyKey:
 *                 type: string
 *                 description: Optional idempotency key; if omitted the server auto-generates one to prevent duplicate processing
 *     responses:
 *       200:
 *         description: Cable TV subscription initiated successfully
 */
router.post("/cable-tv", requireUser, checkWalletBalance, (req, res) => utilityController.purchaseCableTV(req, res));

/**
 * @swagger
 * /api/utilities/airtime:
 *   post:
 *     summary: Purchase airtime
 *     tags: [Utilities]
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID performing the purchase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - amount
 *               - phoneNumber
 *               - providerId
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               phoneNumber:
 *                 type: string
 *               providerId:
 *                 type: string
 *                 format: uuid
 *                 description: Either providerId or providerCode must be provided
 *               providerCode:
 *                 type: string
 *                 description: Either providerId or providerCode must be provided
 *               idempotencyKey:
 *                 type: string
 *                 description: Optional idempotency key; if omitted the server auto-generates one to prevent duplicate processing
 *     responses:
 *       200:
 *         description: Airtime purchase initiated successfully
 */
router.post("/airtime", requireUser, checkWalletBalance, (req, res) => utilityController.purchaseAirtime(req, res));

/**
 * @swagger
 * /api/utilities/telecel/airtime:
 *   post:
 *     summary: Purchase Telecel airtime
 *     tags: [Utilities]
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID performing the purchase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - amount
 *               - phoneNumber
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               phoneNumber:
 *                 type: string
 *               idempotencyKey:
 *                 type: string
 *                 description: Optional idempotency key; if omitted the server auto-generates one to prevent duplicate processing
 *     responses:
 *       200:
 *         description: Telecel airtime purchase initiated successfully
 */
router.post('/telecel/airtime', requireUser, checkWalletBalance, (req, res) => utilityController.purchaseTelecelAirtime(req, res));

/**
 * @swagger
 * /api/utilities/mtn/airtime:
 *   post:
 *     summary: Purchase MTN airtime
 *     tags: [Utilities]
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID performing the purchase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - amount
 *               - phoneNumber
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               phoneNumber:
 *                 type: string
 *               idempotencyKey:
 *                 type: string
 *                 description: Optional idempotency key; if omitted the server auto-generates one to prevent duplicate processing
 *     responses:
 *       200:
 *         description: MTN airtime purchase initiated successfully
 */
router.post('/mtn/airtime', requireUser, checkWalletBalance, (req, res) => utilityController.purchaseMtnAirtime(req, res));

/**
 * @swagger
 * /api/utilities/at/airtime:
 *   post:
 *     summary: Purchase AirtelTigo (AT) airtime
 *     tags: [Utilities]
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID performing the purchase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - amount
 *               - phoneNumber
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               phoneNumber:
 *                 type: string
 *               idempotencyKey:
 *                 type: string
 *                 description: Optional idempotency key; if omitted the server auto-generates one to prevent duplicate processing
 *     responses:
 *       200:
 *         description: AT airtime purchase initiated successfully
 */
router.post('/at/airtime', requireUser, checkWalletBalance, (req, res) => utilityController.purchaseAtAirtime(req, res));

/**
 * @swagger
 * /api/utilities/providers:
 *   get:
 *     summary: List active providers by channel
 *     tags: [Utilities]
 *     parameters:
 *       - in: query
 *         name: channel
 *         required: false
 *         schema:
 *           type: string
 *           enum: [MOBILE, UTILITY]
 *         description: Defaults to MOBILE
 *       - in: query
 *         name: utility
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Providers fetched
 */
router.get('/providers', (req, res) => utilityController.listProviders(req, res));

/**
 * @swagger
 * /api/utilities/providers/{providerId}/bundles:
 *   get:
 *     summary: List bundles for a provider
 *     tags: [Utilities]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Bundles fetched
 */
router.get('/providers/:providerId/bundles', (req, res) => utilityController.listBundles(req, res));
/**
 * @swagger
 * /api/utilities/electricity/query:
 *   get:
 *     summary: Query ECG meter by linked phone number
 *     tags: [Utilities]
 *     parameters:
 *       - in: query
 *         name: phoneNumber
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: providerId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: providerCode
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ECG meter details fetched
 */
router.get('/electricity/query', (req, res) => utilityController.queryElectricity(req, res));

/**
 * @swagger
 * /api/utilities/gwcl/meter-query:
 *   get:
 *     summary: Query GWCL meter by meter number and phone number
 *     tags: [Utilities]
 *     parameters:
 *       - in: query
 *         name: meterNumber
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: phoneNumber
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: providerId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: providerCode
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: GWCL meter details fetched
 */
router.get('/gwcl/meter-query', (req, res) => utilityController.queryGwclMeter(req, res));

/**
 * @swagger
 * /api/utilities/data-bundle/query:
 *   get:
 *     summary: Query available data bundles for a phone number
 *     tags: [Utilities]
 *     parameters:
 *       - in: query
 *         name: phoneNumber
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: providerId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: providerCode
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Data bundles fetched
 */
router.get('/data-bundle/query', (req, res) => utilityController.queryDataBundles(req, res));

/**
 * @swagger
 * /api/utilities/broadband/query:
 *   get:
 *     summary: Query available MTN fibre broadband bundles for a phone number
 *     tags: [Utilities]
 *     parameters:
 *       - in: query
 *         name: phoneNumber
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: providerId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: providerCode
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Broadband bundles fetched
 */
router.get('/broadband/query', (req, res) => utilityController.queryBroadbandBundles(req, res));
router.post('/broadband', requireUser, checkWalletBalance, (req, res) => utilityController.purchaseBroadband(req, res));

// Telecel Data
router.get('/telecel/data/query', (req, res) => utilityController.queryTelecelData(req, res));
router.post('/telecel/data', requireUser, checkWalletBalance, (req, res) => utilityController.purchaseTelecelData(req, res));

// Telecel Broadband
router.get('/telecel/broadband/query', (req, res) => utilityController.queryTelecelBroadband(req, res));
router.post('/telecel/broadband', requireUser, checkWalletBalance, (req, res) => utilityController.purchaseTelecelBroadband(req, res));

// AT Data
router.get('/at/data/query', (req, res) => utilityController.queryAtData(req, res));
router.post('/at/data', requireUser, checkWalletBalance, (req, res) => utilityController.purchaseAtData(req, res));

// MTN Data
router.get('/mtn/data/query', (req, res) => utilityController.queryMtnData(req, res));
router.post('/mtn/data', requireUser, checkWalletBalance, (req, res) => utilityController.purchaseMtnData(req, res));

// DSTV/GoTV/StarTimes
router.get('/dstv/query', (req, res) => utilityController.dstvQuery(req, res));
router.post('/dstv/pay', requireUser, checkWalletBalance, (req, res) => utilityController.dstvPay(req, res));
router.get('/gotv/query', (req, res) => utilityController.gotvQuery(req, res));
router.post('/gotv/pay', requireUser, checkWalletBalance, (req, res) => utilityController.gotvPay(req, res));
router.get('/startimes/query', (req, res) => utilityController.startimesQuery(req, res));
router.post('/startimes/pay', requireUser, checkWalletBalance, (req, res) => utilityController.startimesPay(req, res));

// Transaction status
router.get('/transactions/:posSalesId/status', (req, res) => utilityController.transactionStatus(req, res));
/**
 * @swagger
 * /api/utilities/hubtel/callback:
 *   post:
 *     summary: Hubtel webhook callback
 *     tags: [Utilities]
 *     responses:
 *       200:
 *         description: Acknowledged
 */
router.post('/hubtel/callback', (req, res) => utilityController.hubtelCallback(req, res));

module.exports = router;
