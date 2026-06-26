import User from '../models/User.js';
import OwnerWallet from '../models/OwnerWallet.js';
import jwt from 'jsonwebtoken';

// Get current user profile
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();
    res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Register user role (Switching to owner or driver)
export const registerRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['driver', 'owner'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role selection' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = role;
    await user.save();

    // If user registers as owner, initialize owner wallet if not already exists
    if (role === 'owner') {
      const existingWallet = await OwnerWallet.findOne({ ownerId: user._id });
      if (!existingWallet) {
        await OwnerWallet.create({ ownerId: user._id });
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Successfully set user role to ${role}`, 
      data: user 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login administrator (React Dashboard login)
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Hardcoded credentials for simulation and ease of deployment
    const ADMIN_EMAIL = 'admin@parkshare.com';
    const ADMIN_PASSWORD = 'adminpassword123';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      let adminUser = await User.findOne({ email: ADMIN_EMAIL });
      
      if (!adminUser) {
        adminUser = await User.create({
          name: 'System Admin',
          email: ADMIN_EMAIL,
          phone: '+919876543210',
          role: 'admin',
          isVerified: true,
          firebaseUid: 'system_admin_mock_uid',
        });
      }

      // Sign JWT
      const token = jwt.sign(
        { id: adminUser._id, email: adminUser.email, role: 'admin' },
        process.env.JWT_SECRET || 'super_secret_parkshare_jwt_sign_key_2026',
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        token,
        data: adminUser,
      });
    }

    res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
