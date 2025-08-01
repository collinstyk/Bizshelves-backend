const express = require("express");

const purchaseController = require("../controllers/purchaseController");
const authController = require("../controllers/authController");

const router = express.Router();

router
  .route("/")
  .post(authController.protect, purchaseController.recordPurchase);

module.exports = router;
