const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
  uploadProfilePicture,
  deleteProfilePicture,
  deactivateAccount,
  getPublicProfile,
  getSubscription,
  getBillingHistory
} = require('../controllers/UserController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

const router = express.Router();

// Setup file upload
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);
router.post('/upload-picture', protect, upload.single('profilePicture'), uploadProfilePicture);
router.delete('/remove-picture', protect, deleteProfilePicture);
router.put('/deactivate', protect, deactivateAccount);
router.get('/subscription', protect, getSubscription);
router.get('/billing', protect, getBillingHistory);

// Public route
router.get('/public/:id', getPublicProfile);

module.exports = router;