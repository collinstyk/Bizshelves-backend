const catchAsync = require("../utils/catchAsync");

const AppError = require("../utils/appError");
const Product = require("../models/productModel");
const CompanyProduct = require("../models/companyProductModel");

// this create a new product when none exist, together with a company product,
//  but create only a company product when the product exist
// only admins are allowed to create/add a product
exports.createAddProduct = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin")
    return next(
      new AppError(401, "You are not authorized to initiate this action")
    );
  const companyId = req.user.company;
  const {
    name,
    baseUnit,
    packagingUnits,
    costPricePerUnit,
    sellingPricePerUnit,
    currentStock,
    category,
  } = req.body;

  let product = await Product.findOne({ name, category });

  if (product) {
    const existingCompanyProduct = await CompanyProduct.findOne({
      company: companyId,
      product: product._id,
    });
    if (existingCompanyProduct)
      return next(new AppError(400, "This product already exist"));
  }

  if (!product) {
    product = await Product.create({
      name,
      baseUnit,
      packagingUnits,
      category,
    });
  }

  const companyProduct = await CompanyProduct.create({
    company: companyId,
    product: product._id,
    costPricePerUnit,
    sellingPricePerUnit,
    inventory: currentStock,
  });

  res.status(201).json({
    status: "success",
    data: {
      product,
      companyProduct,
    },
  });
});
