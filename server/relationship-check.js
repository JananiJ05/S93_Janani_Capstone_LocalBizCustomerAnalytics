const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Customer = require("./models/Customer");
const Order = require("./models/Order");

dotenv.config();

async function checkRelationship() {
  let createdCustomer = null;
  let createdOrder = null;

  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");

    createdCustomer = await Customer.create({
      name: "Relationship Test Customer",
      email: `relationship-test-${Date.now()}@example.com`,
      phone: "9999999999",
    });

    console.log("\nCustomer created:");
    console.log("Name:", createdCustomer.name);
    console.log("ID:", createdCustomer._id.toString());

    createdOrder = await Order.create({
      customer: createdCustomer._id,
      amount: 2500,
      status: "Completed",
    });

    console.log("\nOrder created and linked:");
    console.log("Order ID:", createdOrder._id.toString());
    console.log("Customer ID:", createdOrder.customer.toString());
    console.log("Amount:", createdOrder.amount);
    console.log("Status:", createdOrder.status);

    const customerWithOrders = await Customer.findById(
      createdCustomer._id
    ).populate("orders");

    console.log("\nRetrieved customer with related orders:");
    console.log("Customer:", customerWithOrders.name);
    console.log("Related orders:", customerWithOrders.orders.length);

    if (customerWithOrders.orders.length === 0) {
      throw new Error(
        "Relationship verification failed: customer has no related orders."
      );
    }

    const relationshipValid = customerWithOrders.orders.every(
      (order) =>
        order.customer.toString() === createdCustomer._id.toString()
    );

    if (!relationshipValid) {
      throw new Error(
        "Relationship verification failed: order references the wrong customer."
      );
    }

    console.log("\nRelationship verification:");
    console.log("Customer-Order relationship is valid.");

    const fakeCustomerId = new mongoose.Types.ObjectId();

    const fakeCustomerExists = await Customer.exists({
      _id: fakeCustomerId,
    });

    console.log("\nInvalid customer check:");

    if (fakeCustomerExists) {
      throw new Error("Unexpected fake customer found.");
    }

    console.log("Nonexistent customer correctly identified.");

    console.log("\nAll relationship checks passed.");
  } catch (error) {
    console.error("\nRelationship check failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (createdOrder) {
      await Order.findByIdAndDelete(createdOrder._id);
    }

    if (createdCustomer) {
      await Customer.findByIdAndDelete(createdCustomer._id);
    }

    await mongoose.connection.close();

    console.log("\nTest data cleaned up.");
    console.log("MongoDB connection closed.");
  }
}

checkRelationship();
