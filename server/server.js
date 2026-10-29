const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const Customer = require("./models/Customer");
const Order = require("./models/Order");
const User = require("./models/User");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET in .env");
  process.exit(1);
}

if (!GOOGLE_CLIENT_ID) {
  console.error("Missing GOOGLE_CLIENT_ID in .env");
  process.exit(1);
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// --------------------------------------------------
// CORS middleware — must be before routes
// --------------------------------------------------
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

// --------------------------------------------------
// MongoDB connection
// --------------------------------------------------
mongoose.connection.on("connected", () => {
  console.log("MongoDB connected successfully");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error.message);
});

// --------------------------------------------------
// JWT authentication middleware
// --------------------------------------------------
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. JWT token is required.",
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    return next();
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
  res.json({
    message: "LocalBiz Customer Analytics API is running",
  });
});

// --------------------------------------------------
// Register
// --------------------------------------------------
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Username, email, and password are required.",
      });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [
        { username: cleanUsername },
        { email: cleanEmail },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
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

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Username or email already exists.",
      });
    }

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
      username
        ? { username: username.trim() }
        : { email: email.trim().toLowerCase() }
    );

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials.",
      });
    }

    // Google-only users do not have a password.
    if (!user.password) {
      return res.status(401).json({
        message: "This account uses Google login. Please sign in with Google.",
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
        id: user._id.toString(),
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
// Google Login
// --------------------------------------------------
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required.",
      });
    }

    // Verify the Google ID token.
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        message: "Invalid Google account information.",
      });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const emailVerified = payload.email_verified;
    const googleName = payload.name || email?.split("@")[0];

    if (!googleId || !email || emailVerified !== true) {
      return res.status(401).json({
        message: "Google email could not be verified.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find an existing Google account or an existing account
    // with the same verified email.
    let user = await User.findOne({
      $or: [
        { googleId: googleId },
        { email: cleanEmail },
      ],
    });

    // --------------------------------------------------
    // Create new user if the Google account does not exist
    // --------------------------------------------------
    if (!user) {
      let username = googleName.trim();

      // Make sure the username is unique.
      const usernameExists = await User.findOne({ username });

      if (usernameExists) {
        username = `${username}_${googleId.slice(-6)}`;
      }

      user = await User.create({
        username,
        email: cleanEmail,
        googleId,
      });
    } else {
      // --------------------------------------------------
      // Link Google account to an existing user
      // --------------------------------------------------
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    }

    // --------------------------------------------------
    // Create application JWT
    // --------------------------------------------------
    const token = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username,
      },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    return res.status(200).json({
      message: "Google login successful.",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Google authentication error:", error.message);

    return res.status(401).json({
      message: "Google authentication failed.",
    });
  }
});

// --------------------------------------------------
// Customers — protected CRUD routes
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
      {
        new: true,
        runValidators: true,
      }
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    return res.status(200).json(customer);
  } catch (error) {
    console.error("Update customer error:", error.message);

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
    console.error("Delete customer error:", error.message);

    return res.status(400).json({
      message: "Failed to delete customer.",
    });
  }
});

// --------------------------------------------------
// Orders — protected CRUD routes
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
      {
        new: true,
        runValidators: true,
      }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error("Update order error:", error.message);

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
    console.error("Delete order error:", error.message);

    return res.status(400).json({
      message: "Failed to delete order.",
    });
  }
});

// --------------------------------------------------
// Start server after MongoDB connects
// --------------------------------------------------
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "Unable to connect to MongoDB:",
      error.message
    );

    process.exit(1);
  }
}

startServer();