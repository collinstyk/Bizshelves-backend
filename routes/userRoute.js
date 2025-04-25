const express = require("express");

const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.route("/signUp").post(authController.signUp);
//   .get(userController.getAll)
router.route("/login").post(authController.login);

module.exports = router;
