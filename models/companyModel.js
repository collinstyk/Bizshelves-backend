const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const companySchema = new Schema({
  name: { type: String, required: [true, "Please provide your company name"] },
  companyCode: { type: String, unique: true, required: true },
  address: String,
  description: String,
  category: {
    type: String,
    // required: true,
    enum: [
      "Beverages",
      "Supermarket",
      "Farm Market",
      "Bookshop",
      "Pharmacy",
      "Electronics",
      "Fashion",
      "Restaurant",
      "Other",
    ],
  },
});

const Company = model("Company", companySchema);

module.exports = Company;
