const express = require("express");
const router = express.Router();
const ElectricityController = require("../controllers/electricityController");
const WaterController = require("../controllers/waterController");
const TelecelAirtimeController = require("../controllers/telecelAirtimeController");
const MtnAirtimeController = require("../controllers/mtnAirtimeController");
const ATAirtimeController = require("../controllers/atAirtimeController");
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

module.exports = router;

