const CompanyProduct = require("../models/companyProductModel");
const SaleModel = require("../models/saleModel");
const catchAsync = require("../utils/catchAsync");

exports.recordSale = catchAsync(async (req, res, next) => {
  const { _id: userId, company: companyId } = req.user;
  console.log(userId, companyId);

  res.status(201).json({
    message: "Processing...",
  });
});
