// VERY IMPORTANT: load env variables in this file also
require('dotenv').config();

const User = require('../models/User');
const jwt = require('jsonwebtoken');

/* Create JWT token */
const createToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing in .env");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validation (important)
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email and password"
      });
    }

    // 2. Check existing user
    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(400).json({
        message: "Email already exists"
      });
    }

    // 3. Create user
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    // 4. Generate token
    const token = createToken(user._id);

    // 5. Response
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      message: "Server error during registration"
    });
  }
};


/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password required"
      });
    }

    // 2. Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // 3. Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // 4. Create token
    const token = createToken(user._id);

    // 5. Send response
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      message: "Server error during login"
    });
  }
};
