const crypto = require("crypto");

const jwt = require("jsonwebtoken");
const validator = require("validator");

const util = require("util");

const catchAsync = require("../utils/catchAsync");
const createHTML = require("../utils/html");
const { sendMail } = require("../utils/email");

const User = require("../models/userModel");
const Company = require("../models/companyModel");
const AppError = require("../utils/appError");
const client = require("../utils/redis");

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

exports.sendConfirmEmailOtp = catchAsync(async (req, res, next) => {
  console.log(`${req.protocol}://${req.get("host")}`);

  // recieve user email
  const email = req.body.email;

  // validate email
  if (!validator.isEmail(email))
    return next(new AppError(400, "Invalid email provided"));

  // generate email confirmation otp
  const digits = "0123456789";

  let otp = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(digits.length);
    otp += digits[randomIndex];
  }

  console.log(otp);

  // send otp to user email
  const html = createHTML({
    otp,
    sender: "Collins",
    expirationTime: 5,
  });

  await sendMail({
    email,
    subject: "Verify your email",
    text: `Please verify your email using the One-Time Password provided below:
    ${otp}
    Note: This code is valid for 5 minutes.
    
    Please ignore if you did not request the OTP.
    Thank you for choosing BizShelves.
    Best regards, Collins
    BizShelves LTD`,
    html,
  });

  // temporary store the user's email and the otp(redis)
  await client.set(`${email}:email`, email, "EX", 300);
  await client.set(`${email}:otp`, otp, "EX", 300);

  res.status(200).json({
    status: "success",
    message: "OTP sent to your email",
  });
});

exports.confirmEmail = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  const exists = await client.exists(`${email}:otpattempts`);

  if (!exists) await client.set(`${email}:otpattempts`, 0, "EX", 300);

  const attempts = await client.get(`${email}:otpattempts`);

  // check the number of attempts
  await client.incr(`${email}:otpattempts`);
  if (attempts > 5)
    return next(new AppError(429, "Too many request. Try again later."));

  // check the otp
  const storedOtp = await client.get(`${email}:otp`);

  if (!storedOtp) return next(new AppError(400, "OTP expired or not found"));

  if (storedOtp !== otp) return next(new AppError(401, "Invalid otp"));

  // clean up after successful verification
  await client.del(`${email}:otp`);
  await client.del(`${email}:otpattempts`);

  res.status(200).json({
    status: "success",
    message: "Email verified. You can now continue with your account creation.",
  });
});

exports.signUp = catchAsync(async (req, res, next) => {
  // console.log(`${req.protocol}://${req.get("host")}`);

  let companyId;

  // allow only admins to create company and company code
  if (req.body.role === "admin") {
    // create company code
    const code = `${req.body.companyName
      .toLowerCase()
      .replace(/\s+/g, "-")}-${Math.floor(Math.random() * 10000)}`;

    // create company
    const newCompany = await Company.create({
      name: req.body.companyName,
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
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return next(
      new AppError(400, "Please provide your email/username and password")
    );

  let user;
  if (validator.isEmail(identifier)) {
    // checking if identifier exist as an email
    user = await User.findOne({ email: identifier }).select("+password");

    // checking if identifier (in email format) exist as an username if not email
    if (!user)
      user = await User.findOne({ username: identifier }).select("+password");

    // checking for password
    if (!user || !(await user.correctPassword(password, user.password)))
      return next(new AppError(400, "Invalid credentials"));
  } else {
    // checking for username
    user = await User.findOne({ username: identifier }).select("+password");

    // check for password
    if (!user || !(await user.correctPassword(password, user.password)))
      return next(new AppError(400, "Invalid credentials"));
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
