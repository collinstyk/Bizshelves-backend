const CompanyProduct = require("../models/companyProductModel");
const SaleModel = require("../models/saleModel");
const catchAsync = require("../utils/catchAsync");

exports.recordSale = catchAsync(async (req, res, next) => {
  const { _id: userId, company: companyId } = req.user;

  // Extracting the products array, payment method, and customer name from the request body
  const { products, paymentMethod, customerName } = req.body;

  // Looping over the products array and checking if the product exist in the company product DB

  // Inside the product array loop, loop over the breakdown array and check if the requested amount is available.

  res.status(201).json({
    message: "Processing...",
  });
});
