const express = require("express");

const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/", userController.getAllUsers);

router.route("/sign-up").post(authController.signUp);
//   .get(userController.getAll)
router.route("/login").post(authController.login);

router.route("/verify-email/send-otp").post(authController.sendConfirmEmailOtp);

router.route("/verify-email/confirm-otp").post(authController.confirmEmail);

module.exports = router;
