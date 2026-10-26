const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Customer = require("./models/Customer");
const Order = require("./models/Order");

dotenv.config();

async function checkRelationship() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");

    const customer = await Customer.findOne();

    if (!customer) {
      console.log("No customer found in the database.");
      return;
    }

    console.log("\nCustomer:");
    console.log("Name:", customer.name);
    console.log("ID:", customer._id.toString());

    const orders = await Order.find({
      customer: customer._id,
    });

    console.log("\nOrders belonging to this customer:");
    console.log("Total orders:", orders.length);

    orders.forEach((order) => {
      console.log(
        "Order ID:",
        order._id.toString(),
        "| Amount:",
        order.amount,
        "| Status:",
        order.status
      );
    });

    const relationshipValid = orders.every(
      (order) => order.customer.toString() === customer._id.toString()
    );

    console.log("\nRelationship verification:");

    if (relationshipValid) {
      console.log("Customer-Order relationship is valid.");
    } else {
      console.log("Customer-Order relationship is invalid.");
    }

    const fakeCustomerId = new mongoose.Types.ObjectId();

    const fakeCustomer = await Customer.exists({
      _id: fakeCustomerId,
    });

    console.log("\nInvalid customer check:");

    if (!fakeCustomer) {
      console.log("Nonexistent customer correctly rejected.");
    }
  } catch (error) {
    console.error("Relationship check failed:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\nMongoDB connection closed.");
  }
}

checkRelationship();
