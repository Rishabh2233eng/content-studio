const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 8;
};

// @route POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 50 characters' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      credits: 5,
      plan: 'free'
    });

    console.log('New user registered:', user.email, '| IP:', req.ip);

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        plan: user.plan
      }
    });

  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.warn('Failed login - user not found:', email, '| IP:', req.ip);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn('Failed login - wrong password:', email, '| IP:', req.ip);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    console.log('Successful login:', user.email, '| IP:', req.ip);

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        plan: user.plan
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @route GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, login, getMe };