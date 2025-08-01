const nodemailer = require("nodemailer");

exports.sendMail = async function (options) {
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    secure: false, // set to true or delete declaration in production,
    auth: {
      user: process.env.MAILTRAP_USERNAME,
      pass: process.env.MAILTRAP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: "BizShelves LTD <admin@demomailtrap.com>", // subject to change in production
      to: options.email,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log("Message sent:", info.messageId);
  } catch (error) {
    console.log("❌ Mail sending failed:", error.message);
  }
};
