const express = require("express");
const router = express.Router();
const ElectricityController = require("../controllers/electricityController");
const WaterController = require("../controllers/waterController");
const TelecelAirtimeController = require("../controllers/telecelAirtimeController");
const MtnAirtimeController = require("../controllers/mtnAirtimeController");
const ATAirtimeController = require("../controllers/atAirtimeController");
const DstvController = require("../controllers/dstvController");
const GotvController = require("../controllers/gotvController");
const StartimesController = require("../controllers/startimesController");
const TelecelBroadbandController = require("../controllers/telecelBroadbandController");
const MtnBroadbandController = require("../controllers/mtnBroadbandController");
const MtnDataController = require("../controllers/mtnDataController");
const ATDataController = require("../controllers/atDataController");
const TelecelDataController = require("../controllers/telecelDataController");


// Buy ECG Electricity
router.post("/buy-electricity", ElectricityController.buyElectricity);
// Hubtel callback
router.post("/buy-electricity/callback", ElectricityController.handleCallback);

router.get("/test", (req, res) => {
  res.send("Hubtel electricity service is running");
});

//Buy GWCL Water
router.post("/buy-water", WaterController.buyWater);
// Hubtel callback
router.post("/buy-water/callback", WaterController.handleCallback);

router.get("/test-water", (req, res) => {
  res.send("Hubtel water service is running");
});

//Buy Telecel Airtime
router.post("/buy-telecel-airtime", TelecelAirtimeController.buyTelecelAirtime);
// Hubtel callback
router.post("/buy-telecel-airtime/callback", TelecelAirtimeController.handleCallback);

router.get("/test-telecel-airtime", (req, res) => {
  res.send("Hubtel telecel airtime service is running");
});

//Buy MTN Airtime
router.post("/buy-mtn-airtime", MtnAirtimeController.buyMtnAirtime);
// Hubtel callback
router.post("/buy-mtn-airtime/callback", MtnAirtimeController.handleCallback);

router.get("/test-mtn-airtime", (req, res) => {
  res.send("Hubtel mtn airtime service is running");
});

//Buy AT Airtime
router.post("/buy-at-airtime", ATAirtimeController.buyATAirtime);
// Hubtel callback
router.post("/buy-at-airtime/callback", ATAirtimeController.handleCallback);

router.get("/test-at-airtime", (req, res) => {
  res.send("Hubtel at airtime service is running");
});

//Buy DSTV
router.post("/buy-dstv", DstvController.buyDstv);
// Hubtel callback
router.post("/buy-dstv/callback", DstvController.handleCallback);

router.get("/test-dstv", (req, res) => {
  res.send("Hubtel DSTV service is running");
});

//Buy GOTV
router.post("/buy-gotv", GotvController.buyGotv);
// Hubtel callback
router.post("/buy-gotv/callback", GotvController.handleCallback);

router.get("/test-gotv", (req, res) => {
  res.send("Hubtel Gotv service is running");
});

//Buy Startimes
router.post("/buy-startimes", StartimesController.buyStartimes);
// Hubtel callback
router.post("/buy-startimes/callback", StartimesController.handleCallback);

router.get("/test-startimes", (req, res) => {
  res.send("Hubtel Startimes service is running");
});

//Buy Telecel Broadband
router.post("/buy-telecel-broadband", TelecelBroadbandController.buyTelecelBroadband);
// Hubtel callback
router.post("/buy-telecel-broadband/callback", TelecelBroadbandController.handleCallback);

router.get("/test-telecel-broadband", (req, res) => {
  res.send("Hubtel Telecel broadband service is running");
});


// MTN Data bundle query
router.get("/buy-mtn-data/query", MtnDataController.queryBundles);
// Buy MTN Data
router.post("/buy-mtn-data", MtnDataController.buyBundle);
// Hubtel callback
router.post("/buy-mtn-data/callback", MtnDataController.handleCallback);

router.get("/test-mtn-data", (req, res) => {
  res.send("Hubtel MTN data service is running");
});

// MTN Broadband bundle query
router.get("/buy-mtn-broadband/query", MtnBroadbandController.queryBundles);
// Buy MTN Data
router.post("/buy-mtn-broadband", MtnBroadbandController.buyBundle);
// Hubtel callback
router.post("/buy-mtn-broadband/callback", MtnBroadbandController.handleCallback);

router.get("/test-mtn-broadband", (req, res) => {
  res.send("Hubtel MTN broadband service is running");
});

// AT Data bundle query
router.get("/buy-at-data/query", ATDataController.queryBundles);
// Buy AT Data
router.post("/buy-at-data", ATDataController.buyBundle);
// Hubtel callback
router.post("/buy-at-data/callback", ATDataController.handleCallback);

router.get("/test-at-data", (req, res) => {
  res.send("Hubtel AT data service is running");
});

// Telecel Data bundle query
router.get("/buy-telecel-data/query", TelecelDataController.queryBundles);
// Buy Telecel Data
router.post("/buy-telecel-data", TelecelDataController.buyBundle);
// Hubtel callback
router.post("/buy-telecel-data/callback", TelecelDataController.handleCallback);

router.get("/test-telecel-data", (req, res) => {
  res.send("Hubtel Telecel data service is running");
});

module.exports = router;

