const CompanyProduct = require("../models/companyProductModel");
const Contact = require("../models/contactModel");
const Product = require("../models/productModel");
const SaleItem = require("../models/saleItemModel");
const Sale = require("../models/saleModel");
const {
  DeliveryStatus,
  PaymentStatus,
  TransactionState,
} = require("../utils/constants");

exports.resolveCustomerId = async function (customer, company, session) {
  const isObjectId =
    mongoose.Types.ObjectId.isValid(customer) &&
    String(new mongoose.Types.ObjectId(customer)) === customer;

  let customerDoc;
  if (isObjectId) {
    customerDoc = await Contact.findById(customer).session(session);
    if (customerDoc.type === "SUPPLIER") {
      customerDoc.type = "BOTH";
      customerDoc.save({ session });
    }
  } else {
    customerDoc = await Contact.findOne({ name: customer, company }).session(
      session,
    );
    if (!customerDoc) {
      customerDoc = await Contact.create(
        [
          {
            name: customer.trim().toLowerCase(),
            type: "CUSTOMER",
            company,
          },
        ],
        { session },
      );
    }
  }

  return customerDoc[0]._id || customerDoc._id;
};

exports.createSale = async function (customerId, company, seller, session) {
  await Sale.create(
    [
      {
        customer: customerId,
        company,
        seller,
        totalSaleAmount: 0,
        saleState: TransactionState.DRAFT,
        paymentStatus: PaymentStatus.NOT_PAID,
        DeliveryStatus: DeliveryStatus.NOT_DELIVERED,
      },
    ],
    { session },
  );
};

exports.validateItems = function (items) {
  if (!items || items.length === 0) {
    throw new AppError(400, "Sale must have at least one item");
  }
};

exports.getCompanyProductMap = async function (items, session) {
  const companyProductIds = items.map((item) => item.productId);

  const companyProducts = await CompanyProduct.find({
    _id: { $in: companyProductIds },
  }).session(session);

  const companyProductMap = new Map();
  const productPromises = companyProducts.map(async (companyProduct) => {
    const productPackagingUnits = await Product.findById(companyProduct.product)
      .select("packagingUnits baseUnit -_id")
      .lean()
      .session(session);

    return {
      id: companyProduct._id.toString(),
      data: {
        ...companyProduct.toObject(),
        ...productPackagingUnits,
      },
    };
  });

  const resolvedProducts = await Promise.all(productPromises);

  for (const item of resolvedProducts) {
    companyProductMap.set(item.id, item.data);
  }

  return companyProductMap;
};

exports.validateStock = function (items, companyProductMap) {
  for (const item of items) {
    const companyProduct = companyProductMap.get(item.productId);

    if (!companyProduct) {
      throw new AppError(400, "Product not found");
    }

    const unitsPerPackage =
      companyProduct.packagingUnits?.get?.(item.packagingUnit) ||
      companyProduct.packagingUnits?.[item.packagingUnit] ||
      companyProduct.baseUnit ||
      1;

    const quantityInBaseUnit = item.quantityOrdered * unitsPerPackage;

    if (companyProduct.availableStock < quantityInBaseUnit) {
      throw new AppError(
        400,
        `Insufficient stock for product ${companyProduct.name}`,
      );
    }
  }
};

exports.createSaleItems = async function (items, saleId, session) {
  const saleItemsData = items.map((item) => ({
    saleId,
    productId: item.productId,
    quantityOrdered: item.quantityOrdered,
    unitPrice: item.unitPrice,
  }));

  const saleItems = await SaleItem.insertMany(saleItemsData, { session });

  return saleItems;
};

exports.deductStock = async function (items, companyProductMap, session) {
  const bulkOperations = items.map((item) => {
    const companyProduct = companyProductMap.get(item.productId);

    const unitsPerPackage =
      companyProduct.packagingUnits?.get?.(item.packagingUnit) ||
      companyProduct.packagingUnits?.[item.packagingUnit] ||
      companyProduct.baseUnit ||
      1;

    const quantityInBaseUnit = item.quantityOrdered * unitsPerPackage;

    return {
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { availableStock: -quantityInBaseUnit } },
      },
    };
  });

  await CompanyProduct.bulkWrite(bulkOperations, { session, ordered: true });
};

exports.calculateTotalSaleAmount = function (saleItems) {
  let totalSaleAmount = 0;
  for (const item of saleItems) {
    totalSaleAmount += item.totalPrice;
  }
  return totalSaleAmount;
};

exports.getPaymentStatus = function (totalPaid, totalSaleAmount, next) {
  let paymentStatus;
  if (!totalPaid) paymentStatus = "NOT-PAID";
  else if (totalPaid < totalSaleAmount) paymentStatus = "PARTLY_PAID";
  else if (totalPaid === totalSaleAmount) paymentStatus = "PAID";

  if (totalPaid > totalSaleAmount)
    return next(
      422,
      `Amount paid (${totalPaid}) cannot exceed total sale amount (${totalSaleAmount})`,
    );

  return paymentStatus;
};

exports.updateSale = async function (
  saleId,
  totalSaleAmount,
  totalPaid,
  paymentStatus,
  saleState,
  session,
) {
  await Sale.findByIdAndUpdate(
    saleId,
    {
      totalSaleAmount,
      totalPaid,
      paymentStatus,
      saleState,
    },
    { new: true, session },
  );
};
