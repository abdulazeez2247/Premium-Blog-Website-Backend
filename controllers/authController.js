const User = require('../models/UserSchema');
const UserVerification = require('../models/UserVerification');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail, sendOtpEmail, sendPasswordResetEmail } = require('../services/emailService');

// Generate OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register user
const registerUser = async (req, res) => {
  try {
    const { fullName, username, email, phoneNumber, country, password } = req.body;

    // Check if all required fields are provided
    if (!fullName || !username || !country || !password || (!email && !phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { phoneNumber }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email, username, or phone number already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      fullName,
      username,
      email,
      phoneNumber,
      country,
      password: hashedPassword
    });

    await user.save();

    // Generate and save OTP
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const userVerification = new UserVerification({
      userId: user._id,
      otp: hashedOtp
    });

    await userVerification.save();

    // Send OTP email if email was provided
    if (email) {
      await sendOtpEmail(email, otp);
    }

    // Send welcome email if email was provided
    if (email) {
      await sendWelcomeEmail(email, fullName);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your account.',
      data: {
        // Don't include user ID in response
        email: user.email,
        phoneNumber: user.phoneNumber,
        verificationHint: 'Use your email or phone number to verify your account'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, phoneNumber, otp } = req.body;

    // Check if either email or phone number is provided
    if ((!email && !phoneNumber) || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number and OTP are required'
      });
    }

    // Find user by email or phone number
    const user = await User.findOne({
      $or: [{ email }, { phoneNumber }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find verification record
    const verification = await UserVerification.findOne({ userId: user._id });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Check if OTP matches
    const isOtpValid = await bcrypt.compare(otp, verification.otp);

    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Update user verification status
    await User.findByIdAndUpdate(user._id, { isVerified: true });

    // Delete verification record
    await UserVerification.deleteOne({ userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Account verified successfully'
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    // Check if either email or phone number is provided
    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }

    // Find user by email or phone number
    const user = await User.findOne({
      $or: [{ email }, { phoneNumber }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete any existing OTP for this user
    await UserVerification.deleteMany({ userId: user._id });

    // Generate and save new OTP
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const userVerification = new UserVerification({
      userId: user._id,
      otp: hashedOtp
    });

    await userVerification.save();

    // Send OTP email if email was provided
    if (email) {
      await sendOtpEmail(email, otp);
    }

    

    res.status(200).json({
      success: true,
      message: 'New OTP sent successfully'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { email, phoneNumber, password } = req.body;

    if ((!email && !phoneNumber) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone and password'
      });
    }

    // Find user by email or phone number
    const user = await User.findOne({
      $or: [{ email }, { phoneNumber }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your account before logging in'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          country: user.country
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or phone number'
      });
    }

    // Find user by email or phone number
    const user = await User.findOne({
      $or: [{ email }, { phoneNumber }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate password reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send password reset email if email exists
    if (user.email) {
      await sendPasswordResetEmail(user.email, resetToken);
    }

    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent to your email',
      data: {
        resetToken: user.email ? resetToken : null
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  forgotPassword,
  resetPassword
};