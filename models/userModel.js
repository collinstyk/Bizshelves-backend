const mongoose = require("mongoose");
const validator = require("validator");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: [true, "Please tells us your name"] },
  username: String,
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  password: {
    type: String,
    required: [true, "Please create a password"],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      validator: function (value) {
        return value === this.password;
      },
      message: "Passwords does not match",
    },
  },
  role: {
    type: String,
    enum: ["admin", "auditor", "staff", "others"],
    default: "staff",
  },
  company: {
    type: mongoose.Schema.ObjectId,
    ref: "Company",
    required: [true, "User must either own or work with a company"],
  },
  active: { type: Boolean, default: true },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailConfirmToken: String,
  emailConfirmExpires: Date,
});

// modify password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;

  this.passwordConfirm = undefined;

  next();
});

// to assign random username to users that didn't provide a username
userSchema.pre("save", async function (next) {
  if (this.username) return next();

  let username;
  let exists = true;

  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    console.log(random);
    username = `${this.name.toLowerCase().split(" ")[0]}-${random}`;

    // check if the username already exist in the DataBase
    exists = await User.exists({ username });
  }

  this.username = username;

  next();
});

//check if password is correct
userSchema.methods.correctPassword = async function (
  inputPassword,
  storedPassword
) {
  return await bcrypt.compare(inputPassword, storedPassword);
};

userSchema.method("passwordChangedAfter", function (timeStamp) {
  if (!this.passwordChangedAt) return;

  const passwordChangedAtSecs = this.passwordChangedAt.getTime() / 1000;
  return passwordChangedAtSecs > timeStamp;
});

userSchema.methods.createToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");

  this.passwordResetToken = hash;
  this.passwordResetExpires = Date.now() + 600000; // 10 mins;

  return token;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
