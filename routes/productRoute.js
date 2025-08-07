const express = require("express");

const authController = require("../controllers/authController");
const productController = require("../controllers/productController");

const router = express.Router();

router
  .route("/")
  .post(authController.protect, productController.createAddProduct);

router.get(
  "/my-products",
  authController.protect,
  productController.getCompanyProducts
);

// router
//   .route("/names")
//   .get(authController.protect, productController.getCompanyProductsNames);

router.delete(
  "/:productId",
  authController.protect,
  productController.deleteProduct
);

module.exports = router;
