const AppError = require("../utils/appError");

const handleCastError = (err) =>
  new AppError(400, `Invalid ${err.path}: ${err.value}`);

const handleDuplicateFieldError = (err) => {
  const [field, value] = Object.entries(err.keyValue)[0];
  return new AppError(
    400,
    `The ${field}: ${value} is already in use, please use another ${field}.`
  );
};

const handleValidationError = (err) => {
  const message = "Invalid input".concat(
    err.message.slice(err.message.indexOf(":"))
  );
  return new AppError(400, message);
};

module.exports = (error, req, res, next) => {
  // 1) DEVELOPMENT ERRORS
  if (
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "development"
  ) {
    return res.status(error.statusCode || 500).json({
      status: error.status || "error",
      error,
      message: error.message,
      stack: error.stack,
    });
  }

  // 2) PRODUCTION ERRORS

  // a) special errors
  // i) cast errors
  if (error.name === "CastError") error = handleCastError(error);

  // ii) duplicate field errors
  if (error.code === 11000) error = handleDuplicateFieldError(error);

  // iii) validation errors
  if (error.name === "ValidationError") error = handleValidationError(error);

  // b) operational errors
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  } else {
    // c) Unknown errors
    console.log("Error", error.message);

    return res.status(500).json({
      status: "error",
      message: "something went very wrong",
    });
  }
};
