const Contact = require("../model/contactModel");
const Purchase = require("../model/purchaseModel");
const Product = require("../model/productModel");
const CompanyProduct = require("../model/companyProductModel");
const PurchaseItem = require("../model/purchaseItemModel");

exports.resolveSupplier = async function (supplier, company, session) {
  const isObjectId =
    mongoose.Types.ObjectId.isValid(supplier) &&
    String(new mongoose.Types.ObjectId(supplier)) === supplier;

  let supplierDoc;
  if (isObjectId) {
    supplierDoc = await Contact.findById(supplier).session(session);
    if (!supplierDoc) {
      throw new AppError(404, "Supplier not found");
    }
    if (supplierDoc.type === "CUSTOMER") {
      supplierDoc.type = "BOTH";
      await supplierDoc.save({ session });
    }
  } else {
    supplierDoc = await Contact.findOne({ name: supplier, company }).session(
      session,
    );

    if (!supplierDoc) {
      [supplierDoc] = await Contact.create(
        [
          {
            name: supplier.trim().toLowerCase(),
            type: "SUPPLIER",
            company,
          },
        ],
        { session },
      );
    }
  }

  return supplierDoc._id;
};

exports.createPurchase = async function (
  supplierId,
  company,
  purchaser,
  session,
) {
  const purchase = await Purchase.create(
    [
      {
        supplier: supplierId,
        company,
        purchaser,
        purchaseState: TransactionState.DRAFT,
        receivingStatus: ReceivingStatus.NOT_RECEIVED,
        paymentStatus: PaymentStatus.NOT_PAID,
        totalProductCost: 0,
        transportationCost: 0,
        extraCost: 0,
        totalPurchaseCost: 0,
      },
    ],
    { session },
  );

  return purchase;
};

exports.createPurchaseItems = async function (
  purchaseId,
  items,
  company,
  session,
) {
  // split items
  const newItems = items.filter((item) => !item.productId);
  const existingItems = items.filter((item) => item.productId);

  // HANDLE NEW PRODUCTS
  const createdCompanyProducts = await handleNewProductsItems(
    newItems,
    company,
    session,
  );

  // HANDLE EXISING PRODUCTS
  await handleExistingProductsItems(existingItems, session);

  // CREATE PURCHASE ITEMS
  const purchaseItemsData = [
    // New items
    ...createdCompanyProducts.map((companyProduct, index) => ({
      purchaseId,
      productId: companyProduct._id,
      quantityOrdered: newItems[index].quantityOrdered,
      quantityReceived: newItems[index].quantityReceived,
      unitPrice: newItems[index].unitPrice,
      packagingUnit: newItems[index].packagingUnit,
      unitsPerPackage: newItems[index].unitsPerPackage,
    })),

    // Existing items
    ...existingItems.map((item) => ({
      purchaseId,
      productId: item.productId,
      quantityOrdered: item.quantityOrdered,
      quantityReceived: item.quantityReceived,
      unitPrice: item.unitPrice,
      packagingUnit: item.packagingUnit,
      unitsPerPackage: item.unitsPerPackage,
    })),
  ];

  const purchaseItems = await PurchaseItem.insertMany(purchaseItemsData, {
    session,
  });

  return purchaseItems;
};

const handleNewProductsItems = async (items, company, session) => {
  let createdCompanyProducts = [];
  if (items.length > 0) {
    // Create Products
    const productToInsert = items.map((item) => ({
      name: item.name,
      baseUnit: item.baseUnit,
      packagingUnits: new Map([[item.packagingUnit, item.unitsPerPackage]]),
      category: item.category,
    }));

    const createdProducts = await Product.insertMany(productToInsert, {
      session,
    });

    // Create CompanyProducts
    const companyProductsToInsert = createdProducts.map((product, index) => {
      const item = items[index];

      return {
        company,
        product: product._id,
        costPricePerUnit: new Map([
          [item.baseUnit, item.baseUnitPrice],
          [item.packagingUnit, item.unitPrice],
        ]),
        availableStock: item.quantityReceived * item.unitsPerPackage,
      };
    });

    createdCompanyProducts = await CompanyProduct.insertMany(
      companyProductsToInsert,
      { session },
    );
  }
  return createdCompanyProducts;
};

const handleExistingProductsItems = async (items, session) => {
  let productBulkOps = [];
  let companyProductBulkOps = [];

  if (items.length > 0) {
    const companyProducts = await CompanyProduct.find({
      _id: { $in: items.map((item) => item.productId) },
    }).session(session);

    const products = await Product.find({
      _id: {
        $in: companyProducts.map((companyProduct) => companyProduct.product),
      },
    }).session(session);

    const companyProductMap = new Map(
      companyProducts.map((companyProduct) => [
        companyProduct._id.toString(),
        companyProduct,
      ]),
    );

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    for (const item of items) {
      const {
        productId,
        packagingUnit,
        unitsPerPackage,
        quantityReceived,
        unitPrice,
        baseUnit,
        baseUnitPrice,
      } = item;
      const companyProduct = companyProductMap.get(productId.toString());
      if (!companyProduct) throw new AppError(400, "Company product not found");

      const product = productMap.get(companyProduct.product.toString());
      if (!product) throw new AppError(400, "Product not found");

      // Update packagingUnits
      const packagingUnits = product.packagingUnits || {};
      if (!packagingUnits[packagingUnit]) {
        productBulkOps.push({
          updateOne: {
            filter: { _id: product._id },
            update: {
              $set: {
                [`packagingUnits.${packagingUnit}`]: unitsPerPackage,
              },
            },
          },
        });
      }

      // Calculate stock increase
      const unitsPerPkg =
        product.packagingUnits?.get(packagingUnit) || unitsPerPackage || 1;

      const quantityInBaseUnit = quantityReceived * unitsPerPkg;

      const updateFields = {
        [`costPricePerUnit.${packagingUnit}`]: unitPrice,
      };

      if (baseUnit && baseUnitPrice) {
        updateFields[`costPricePerUnit.${baseUnit}`] = baseUnitPrice;
      }

      companyProductBulkOps.push({
        updateOne: {
          filter: { _id: productId },
          update: {
            $set: updateFields,
            $inc: { availableStock: quantityInBaseUnit },
          },
        },
      });
    }

    if (productBulkOps.length > 0) {
      await Product.bulkWrite(productBulkOps, { session });
    }

    if (companyProductBulkOps.length > 0) {
      await CompanyProduct.bulkWrite(companyProductBulkOps, { session });
    }
  }
};
