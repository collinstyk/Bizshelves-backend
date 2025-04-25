const express = require("express");

const authController = require("../controllers/authController");
const productController = require("../controllers/productController");

const router = express.Router();

router
  .route("/")
  .post(authController.protect, productController.createAddProduct);

module.exports = router;
