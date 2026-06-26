import User from '../models/User.js';
import ParkingSpace from '../models/ParkingSpace.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';

// Get Overview Stats for Admin Dashboard
export const getOverviewStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOwners = await User.countDocuments({ role: 'owner' });
    const totalSpaces = await ParkingSpace.countDocuments();
    const pendingSpaces = await ParkingSpace.countDocuments({ status: 'pending' });
    const totalBookings = await Booking.countDocuments();

    // Calculate Platform Revenue (10% of total confirmed booking values)
    const confirmedBookings = await Booking.find({ status: { $in: ['confirmed', 'completed', 'active'] } });
    const totalVolume = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const platformRevenue = parseFloat((totalVolume * 0.10).toFixed(2));

    const recentBookings = await Booking.find()
      .populate('driverId', 'name email')
      .populate('spaceId', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalOwners,
          totalSpaces,
          pendingSpaces,
          totalBookings,
          totalVolume,
          platformRevenue,
        },
        recentBookings,
        recentUsers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get list of all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user details or role
export const updateUser = async (req, res) => {
  try {
    const { name, role, isVerified } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (typeof isVerified === 'boolean') user.isVerified = isVerified;

    await user.save();
    res.status(200).json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve or Reject a Parking Space Listing
export const verifySpaceListing = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status' });
    }

    const space = await ParkingSpace.findById(req.params.spaceId);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Parking space not found' });
    }

    space.status = status;
    await space.save();

    res.status(200).json({ 
      success: true, 
      message: `Parking space listing has been ${status}`, 
      data: space 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
