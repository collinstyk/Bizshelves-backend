const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const productSchema = new Schema({
  name: { type: String, required: [true, "Please provide product name"] },
  baseUnit: {
    type: String,
    required: true,
  },
  packagingUnits: { type: Map, of: Number },
  category: {
    type: String,
    required: [true, "Please provide a category for this product"],
  },
});

const Product = model("Product", productSchema);

module.exports = Product;
