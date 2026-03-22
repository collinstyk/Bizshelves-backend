const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: String,
    email: String,
    address: String,

    type: {
      type: String,
      enum: ["CUSTOMER", "SUPPLIER", "BOTH"],
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
  },
  { timestamps: true },
);

const Contact = mongoose.model("Contact", contactSchema);

module.exports = Contact;
