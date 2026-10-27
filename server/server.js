const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Customer = require("./models/Customer");
const Order = require("./models/Order");
const User = require("./models/User");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const JWT_SECRET =
  process.env.JWT_SECRET || "janani_localbiz_auth_secret_2026";

app.use(express.json());

// --------------------------------------------------
// MongoDB connection
// --------------------------------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

// --------------------------------------------------
// JWT authentication middleware
// --------------------------------------------------
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. JWT token is required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired JWT token.",
    });
  }
};

// --------------------------------------------------
// Home route
// --------------------------------------------------
app.get("/", (req, res) => {
  res.send("Local Business Customer Analytics API is running");
});

// --------------------------------------------------
// Register
// --------------------------------------------------
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email, and password are required.",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Registration failed.",
    });
  }
});

// --------------------------------------------------
// Login
// --------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({
        message: "Username or email and password are required.",
      });
    }

    const user = await User.findOne(
      username ? { username } : { email }
    );

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid credentials.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed.",
    });
  }
});

// --------------------------------------------------
// Customers - protected routes
// --------------------------------------------------
app.get("/api/customers", protect, async (req, res) => {
  try {
    const customers = await Customer.find();
    return res.status(200).json(customers);
  } catch (error) {
    console.error("Fetch customers error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch customers.",
    });
  }
});

app.get("/api/customers/:id", protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    return res.status(200).json(customer);
  } catch (error) {
    return res.status(400).json({
      message: "Invalid customer ID.",
    });
  }
});

app.post("/api/customers", protect, async (req, res) => {
  try {
    const customer = await Customer.create(req.body);

    return res.status(201).json(customer);
  } catch (error) {
    console.error("Create customer error:", error.message);

    return res.status(400).json({
      message: "Failed to create customer.",
    });
  }
});

app.put("/api/customers/:id", protect, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    return res.status(200).json(customer);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to update customer.",
    });
  }
});

app.delete("/api/customers/:id", protect, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to delete customer.",
    });
  }
});

// --------------------------------------------------
// Orders - protected routes
// --------------------------------------------------
app.get("/api/orders", protect, async (req, res) => {
  try {
    const orders = await Order.find();
    return res.status(200).json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch orders.",
    });
  }
});

app.get("/api/orders/:id", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(200).json(order);
  } catch (error) {
    return res.status(400).json({
      message: "Invalid order ID.",
    });
  }
});

app.post("/api/orders", protect, async (req, res) => {
  try {
    const order = await Order.create(req.body);

    return res.status(201).json(order);
  } catch (error) {
    console.error("Create order error:", error.message);

    return res.status(400).json({
      message: "Failed to create order.",
    });
  }
});

app.put("/api/orders/:id", protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(200).json(order);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to update order.",
    });
  }
});

app.delete("/api/orders/:id", protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      message: "Order deleted successfully.",
    });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to delete order.",
    });
  }
});

// --------------------------------------------------
// Start server
// --------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});