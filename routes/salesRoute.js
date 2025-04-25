const express = require("express");

const authController = require("../controllers/authController");
const salesController = require("../controllers/salesController");

const router = express.Router();

router
  .route("/recordSale")
  .post(authController.protect, salesController.recordSale);

module.exports = router;
