const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getDashboardStats
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware'); 

const router = express.Router();

// All routes protected and admin only
router.get('/users', protect, getAllUsers);
router.get('/users/:id', protect, getUserById);
router.put('/users/:id/role', protect, updateUserRole);
router.delete('/users/:id', protect, deleteUser);
router.get('/dashboard/stats', protect, getDashboardStats);

module.exports = router;