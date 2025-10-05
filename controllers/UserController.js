const User = require('../models/UserSchema');
const bcrypt = require('bcrypt');
const cloudinary = require('cloudinary').v2;

// Setup cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.log('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting profile'
    });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { Firstname, Lastname, Username, email, Phonenumber, country, bio } = req.body;

    // Check if username is taken by another user
    if (Username) {
      const usernameExists = await User.findOne({ 
        Username, 
        _id: { $ne: req.user._id } 
      });
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    // Check if email is taken by another user
    if (email) {
      const emailExists = await User.findOne({ 
        email, 
        _id: { $ne: req.user._id } 
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        Firstname,
        Lastname, 
        Username,
        email,
        Phonenumber,
        country,
        bio
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.log('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id);

    // Check if current password is correct
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await User.findByIdAndUpdate(
      req.user._id, 
      { password: hashedPassword }
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.log('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file'
      });
    }

    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'blog-profiles'
    });

    // Update user profile picture
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture: result.secure_url },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: updatedUser
    });

  } catch (error) {
    console.log('Upload picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile picture'
    });
  }
};

// Delete profile picture
const deleteProfilePicture = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture: '' },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile picture removed successfully',
      data: updatedUser
    });

  } catch (error) {
    console.log('Delete picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing picture'
    });
  }
};

// Deactivate account
const deactivateAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to deactivate account'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id);

    // Check password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Deactivate account
    await User.findByIdAndUpdate(
      req.user._id, 
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    console.log('Deactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deactivating account'
    });
  }
};

// Get public profile
const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email -Phonenumber -isVerified -isActive');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.log('Public profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting profile'
    });
  }
};

// Get current subscription
const getSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('subscription');
    
    res.json({
      success: true,
      data: user.subscription
    });

  } catch (error) {
    console.log('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting subscription'
    });
  }
};

// Get billing history
const getBillingHistory = async (req, res) => {
  try {
    // For now return empty array - you can add real billing data later
    const billingHistory = [];

    res.json({
      success: true,
      data: billingHistory
    });

  } catch (error) {
    console.log('Billing history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting billing history'
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  uploadProfilePicture,
  deleteProfilePicture,
  deactivateAccount,
  getPublicProfile,
  getSubscription,
  getBillingHistory
};