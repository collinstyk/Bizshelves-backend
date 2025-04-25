const jwt = require("jsonwebtoken");

const util = require("util");

const catchAsync = require("../utils/catchAsync");

const User = require("../models/userModel");
const Company = require("../models/companyModel");
const AppError = require("../utils/appError");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = (user, res, id, status, message = "Successful!") => {
  const token = signToken(id);

  user.password = undefined;

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    secure: true,
    httpOnly: true,
  });

  res.status(status).json({
    status: "success",
    message,
    token,
    data: {
      user,
    },
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  // console.log(`${req.protocol}://${req.get("host")}`);

  let companyId;

  // allow only admins to create company and company code
  if (req.body.role === "admin") {
    // create company code
    const code = `${req.body.company
      .toLowerCase()
      .replace(/\s+/g, "-")}-${Math.floor(Math.random() * 10000)}`;

    // create company
    const newCompany = await Company.create({
      name: req.body.company,
      username: req.body.username,
      companyCode: code,
      address: req.body.address,
      description: req.body.description,
      category: req.body.category,
    });

    companyId = newCompany._id;
  } else {
    // check for company code before registering user
    if (!req.body.companyCode)
      return next(new AppError(400, "Please provide a valid company code"));

    const company = await Company.findOne({
      companyCode: req.body.companyCode,
    });
    if (!company) return next(new AppError(400, "Invalid company code"));

    console.log(company);

    companyId = company._id;
  }

  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
    company: companyId,
  });

  createAndSendToken(
    newUser,
    res,
    newUser._id,
    201,
    "Account created successfully"
  );
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, username, password } = req.body;
  if ((!email && !username) || !password)
    return next(
      new AppError(400, "Please provide your email/username and password")
    );

  if (email && username)
    return next(
      new AppError(400, "Please use either only email or only username")
    );

  let user;
  if (email) {
    user = await User.findOne({ email }).select("+password");
    // check for password
    if (!user || !(await user.correctPassword(password, user.password)))
      return new AppError(400, "Wrong email or password");
  }
  if (username) {
    user = await User.findOne({ username }).select("+password");
    // check for password
    if (!user || !(await user.correctPassword(password, user.password)))
      return new AppError(400, "Wrong email or password");
  }

  createAndSendToken(user, res, user._id, 200, "login successful");
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  )
    token = req.headers.authorization.split(" ")[1];
  else if (req.cookies.jwt) token = req.cookies.jwt;

  if (!token)
    return next(
      new AppError(400, "You are not logged in. Please log in to get access")
    );

  const { id, iat } = await util.promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET_KEY
  );

  const currentUser = await User.findById(id);
  if (!currentUser || !currentUser.active)
    return next(
      new AppError(400, "The user no longer exist or deleted their account")
    );

  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // recieve user's email and check if the user exist or have not deleted their account
  // if the user exist, create a resetToken with the users password, can be done easily using a document method
  // create the reset link
  // send it to the recovery mail aaccount
});

exports.resetPassword = catchAsync(async (req, res, next) => {});
