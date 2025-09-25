const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getDashboardStats
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware'); 

const router = express.Router();

// All routes protected for admin only which is me
router.get('/users', protect, adminOnly, getAllUsers);
router.get('/users/:id', protect, adminOnly, getUserById);
router.put('/users/:id/role', protect, adminOnly, updateUserRole);
router.delete('/users/:id', protect, adminOnly, deleteUser);
router.get('/dashboard/stats', protect, adminOnly, getDashboardStats);

module.exports = router;