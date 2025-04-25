const catchAsync = require("../utils/catchAsync");

const recordPurchase = catchAsync(async (req, res, next) => {
  const { _id: userId, company: companyId } = req.user;
  const { boughtFrom, transportationCost, paymentMethod } = req.body;
});
