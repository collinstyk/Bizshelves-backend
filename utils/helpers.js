const Contact = require("../models/contactModel");

exports.resolveCustomer = async function (customer, company, session) {
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

  return customerDoc;
};
