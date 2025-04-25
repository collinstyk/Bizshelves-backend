const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getUser = catchAsync(async (req, res, next) => {
  if (!req.body.email)
    return next(new AppError(400, "Please provide an email"));
  const user = User.findOne({ email: req.body.email });
  if (!user) next(new AppError(400, "Email not recognized"));

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});
