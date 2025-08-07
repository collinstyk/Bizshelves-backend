const Company = require("../models/companyModel");
const catchAsync = require("../utils/catchAsync");

exports.getAllCompanies = catchAsync(async (_req, res, next) => {
  const companies = await Company.find();

  if (!companies) return next(new AppError(404, "No company found"));

  res.status(200).json({
    status: "success",
    companies,
  });
});
