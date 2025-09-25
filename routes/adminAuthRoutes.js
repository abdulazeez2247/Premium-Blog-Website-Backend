const express = require('express');
const {
  registerAdmin,
  verifyAdminOtp,
  resendAdminOtp,
  loginAdmin,
  forgotAdminPassword,
  resetAdminPassword
} = require('../controllers/adminAuthController');

const router = express.Router();

router.post('/register', registerAdmin);
router.post('/verify-otp', verifyAdminOtp);
router.post('/resend-otp', resendAdminOtp);
router.post('/login', loginAdmin);
router.post('/forgot-password', forgotAdminPassword);
router.post('/reset-password', resetAdminPassword);

module.exports = router;
