const User = require('../models/UserSchema');
const UserVerification = require('../models/UserVerification');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail, sendOtpEmail, sendPasswordResetEmail } = require('../services/emailService');

// Generate OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register Admin
const registerAdmin = async (req, res) => {
  try {
    const { Firstname, Lastname, Username, email, Phonenumber, Country, Password } = req.body;

    if (!Firstname || !Lastname || !Username || !Country || !Password || (!email && !Phonenumber)) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    const existingAdmin = await User.findOne({ $or: [{ email }, { Username }, { Phonenumber }], role: "admin" });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: "Admin with this email, username, or phone number already exists" });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    const admin = new User({
      Firstname,
      Lastname,
      Username,
      email,
      Phonenumber,
      Country,
      Password: hashedPassword,
      role: "admin"
    });

    await admin.save();

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const verification = new UserVerification({
      userId: admin._id,
      otp: hashedOtp
    });

    await verification.save();

    if (email) {
      await sendOtpEmail(email, otp);
      await sendWelcomeEmail(email, Firstname, 'admin');
      console.log("OTP:", otp);
    }

    res.status(201).json({
      success: true,
      message: "Admin registered successfully. Please verify your account.",
      data: { email: admin.email, Phonenumber: admin.Phonenumber }
    });
  } catch (error) {
    console.error("Admin Registration error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Verify Admin OTP
const verifyAdminOtp = async (req, res) => {
  try {
    const { email, Phonenumber, otp } = req.body;

    if ((!email && !Phonenumber) || !otp) {
      return res.status(400).json({ success: false, message: "Email or phone number and OTP are required" });
    }

    const admin = await User.findOne({ $or: [{ email }, { Phonenumber }], role: "admin" });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const verification = await UserVerification.findOne({ userId: admin._id });
    if (!verification) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    const isOtpValid = await bcrypt.compare(otp, verification.otp);
    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    admin.isVerified = true;
    await admin.save();
    await UserVerification.deleteOne({ userId: admin._id });

    res.status(200).json({ success: true, message: "Admin account verified successfully" });
  } catch (error) {
    console.error("Verify Admin OTP error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Resend OTP (Admin)
const resendAdminOtp = async (req, res) => {
  try {
    const { email, Phonenumber } = req.body;

    if (!email && !Phonenumber) {
      return res.status(400).json({ success: false, message: "Email or phone number is required" });
    }

    const admin = await User.findOne({ $or: [{ email }, { Phonenumber }], role: "admin" });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    await UserVerification.deleteMany({ userId: admin._id });

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const verification = new UserVerification({ userId: admin._id, otp: hashedOtp });
    await verification.save();

    if (email) {
      await sendOtpEmail(email, otp);
    }

    res.status(200).json({ success: true, message: "New OTP sent successfully" });
  } catch (error) {
    console.error("Resend Admin OTP error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Login Admin
const loginAdmin = async (req, res) => {
  try {
    const { email, Phonenumber, Password } = req.body;

    if ((!email && !Phonenumber) || !Password) {
      return res.status(400).json({ success: false, message: "Please provide email/phone and password" });
    }

    const admin = await User.findOne({ $or: [{ email }, { Phonenumber }], role: "admin" });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Not an admin account" });
    }

    const isPasswordValid = await bcrypt.compare(Password, admin.Password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!admin.isVerified) {
      return res.status(401).json({ success: false, message: "Please verify your account before logging in" });
    }

    const token = jwt.sign({ userId: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "24h" });

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: { token, admin: { id: admin._id, Firstname: admin.Firstname, Username: admin.Username, email: admin.email, Phonenumber: admin.Phonenumber, Country: admin.Country } }
    });
  } catch (error) {
    console.error("Admin Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Forgot Admin Password
const forgotAdminPassword = async (req, res) => {
  try {
    const { email, Phonenumber } = req.body;

    if (!email && !Phonenumber) {
      return res.status(400).json({ success: false, message: "Please provide email or phone number" });
    }

    const admin = await User.findOne({ $or: [{ email }, { Phonenumber }], role: "admin" });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const resetToken = jwt.sign({ userId: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });

    if (admin.email) {
      await sendPasswordResetEmail(admin.email, resetToken);
    }

    res.status(200).json({ success: true, message: "Password reset instructions sent", data: { resetToken: admin.email ? resetToken : null } });
  } catch (error) {
    console.error("Forgot Admin Password error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Reset Admin Password
const resetAdminPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Token and new password are required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Invalid reset token for admin" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(decoded.userId, { password: hashedPassword });

    res.status(200).json({ success: true, message: "Admin password reset successfully" });
  } catch (error) {
    console.error("Reset Admin Password error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ success: false, message: "Token has expired" });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  registerAdmin,
  verifyAdminOtp,
  resendAdminOtp,
  loginAdmin,
  forgotAdminPassword,
  resetAdminPassword
};
