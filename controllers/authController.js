const User = require('../models/UserSchema');
const UserVerification = require('../models/UserVerification');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail, sendOtpEmail, sendPasswordResetEmail, sendPasswordResetSuccessEmail } = require('../services/emailService');

// Generate OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register user
const registerUser = async (req, res) => {
  try {
    const { Firstname, Lastname, Username, email, Phonenumber, Country, Password } = req.body;
    console.log("Registration request received:", { Firstname, Lastname, Username, email, Phonenumber, Country });

    if (!Firstname || !Lastname || !Username || !Country || !Password || (!email && !Phonenumber)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { Username }, { Phonenumber }]
    });

    if (existingUser) {
      console.log("User already exists:", existingUser);
      return res.status(400).json({
        success: false,
        message: 'User with this email, username, or phone number already exists. Please try changing your username, phone number or email.'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // Create user
    const user = new User({
      Firstname,
      Lastname,
      Username,
      email,
      Phonenumber,
      Country,
      Password: hashedPassword
    });
    console.log("Saving user to database...");

    await user.save();
     console.log("User saved successfully:", user._id);

    // Generate and save OTP
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const userVerification = new UserVerification({
      userId: user._id,
      otp: hashedOtp
    });
    console.log("Saving OTP verification...");

    await userVerification.save();
    console.log("OTP saved successfully");


    // Send OTP email if email provided
    if (email) {
      console.log("Sending OTP email to:", email);
      await sendOtpEmail(email, otp);
      console.log("OTP email sent successfully");
      console.log("OTP:", otp);
    } else{
      console.error("Failed to send OTP email:", emailError);
    }

    console.log("Sending success response to frontend");
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your account.',
      data: {
        email: user.email,
        Phonenumber: user.Phonenumber,
        verificationHint: 'Use your email or phone number to verify your account'
      }
    });
    console.log("Success response sent");
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
    const { email, Phonenumber, otp } = req.body;
    console.log('OTP verification request received', {email, Phonenumber, otp});
    if ((!email && !Phonenumber) || !otp) {
      console.log('Missing required fields for OTP verification');
      return res.status(400).json({
        success: false,
        message: 'Email or phone number and OTP are required'
      });
    }

    // Find user
    const user = await User.findOne({ $or: [{ email }, { Phonenumber }] });
    if (!user) {
      console.log('User found', user? user._id : 'No user found');
      
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find OTP record
    const verification = await UserVerification.findOne({ userId: user._id });
    console.log('OTP record found');
    
    if (!verification) {
      console.log('No OTP record found for user');
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Compare OTP
    const isOtpValid = await bcrypt.compare(otp, verification.otp);
    console.log('OTP valid');
    
    if (!isOtpValid) {
      console.log('Invalid OTP');
      
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Update user verified status
    await User.findByIdAndUpdate(user._id, { isVerified: true });
    console.log('User verification status updated to true');
    

    // Delete verification record
    await UserVerification.deleteOne({ userId: user._id });
    console.log('OTP verification record deleted');
    

    // Send Welcome Email after verification
    if (user.email) {
      await sendWelcomeEmail(user.email, user.Firstname);
      console.log('Welcome email sent to:', user.email);
      
    }

    console.log('OTP verification successful for user:', user._id);
    
    res.status(200).json({
      success: true,
      message: 'Account verified successfully'
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { email, Phonenumber } = req.body;
    if (!email && !Phonenumber) {
      return res.status(400).json({ success: false, message: 'Email or phone number is required' });
    }

    const user = await User.findOne({ $or: [{ email }, { Phonenumber }] });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete old OTP
    await UserVerification.deleteMany({ userId: user._id });

    // Generate new OTP
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await new UserVerification({ userId: user._id, otp: hashedOtp }).save();

    if (email) await sendOtpEmail(email, otp);

    res.status(200).json({ success: true, message: 'New OTP sent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { email, Password } = req.body;
    console.log('Login request received',email);
    

    if (!email || !Password) {
      console.log('Login failed Missing email/phone or password');
      
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    console.log('User found');
    
    if (!user) {
      console.log('No user found');
      
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(Password, user.Password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Login failed Invalid password');
      
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
      
      
    }

    if (!user.isVerified) {
       console.log('Login failed: User not verified');
      return res.status(401).json({ success: false, message: 'Please verify your account before logging in' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    console.log('Login successful for user:', user.email);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          Firstname: user.Firstname,
          Username: user.Username,
          email: user.email,
          Phonenumber: user.Phonenumber,
          Country: user.Country
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Forgot password request received');    
    if (!email) {
      console.log('Please enter your registered email');
      return res.status(400).json({ success: false, message: 'Please provide email or phone number' });
    }

    const user = await User.findOne({ email });
    console.log('User found for password reset ');
    
    if (!user) {
      console.log('No user found with this email');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Password reset token generated' ,resetToken);
    

    if (user.email) {
      console.log('Sending password reset email to :', user.email);
      
      await sendPasswordResetEmail(user.email, resetToken, user.Firstname);
    }

    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent to your email',
      data: { resetToken: user.email ? resetToken : null }
    });
    console.log('Password reset instrusctions sent successfully to user');
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  console.log('Reset password request received');
  
  try {
    const { token, newPassword } = req.body;
    console.log('Token received:', token);
    console.log('token and new password received');
    
    if (!token || !newPassword) {
      console.log('Token or new password missing in request');
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully');
    const userId = decoded.userId;

    // Find user to get email and name for success email
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('New password hashed successfully');
    
    await User.findByIdAndUpdate(userId, { Password: hashedPassword });
    
    // Send password reset success email
    try {
      await sendPasswordResetSuccessEmail(user.email, user.Firstname);
      console.log('Password reset success email sent');
    } catch (emailError) {
      console.error('Error sending success email:', emailError);
      // Don't fail the request if email fails
    }
    
    res.status(200).json({ success: true, message: 'Password reset successfully' });
    console.log('User password updated successfully');
  } catch (error) {
    console.error('Reset password error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ success: false, message: 'Token has expired' });
    }

    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  forgotPassword,
  resetPassword,
  sendPasswordResetSuccessEmail
};
