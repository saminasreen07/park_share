import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import ParkingSpace from '../models/ParkingSpace.js';
import User from '../models/User.js';
import OwnerWallet from '../models/OwnerWallet.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';

// Calculate total hours between two dates
const calculateHours = (start, end) => {
  const diffMs = new Date(end) - new Date(start);
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(0.5, Math.round(diffHours * 100) / 100); // Minimum 30 mins, round to 2 decimals
};

// Create booking draft
export const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { spaceId, startTime, endTime } = req.body;

    if (!spaceId || !startTime || !endTime) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Please provide spaceId, startTime, and endTime' });
    }

    const space = await ParkingSpace.findById(spaceId).session(session);
    if (!space) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Parking space not found' });
    }

    if (space.status !== 'approved') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Parking space is not active' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Start time must be before end time' });
    }

    // Check availability conflicts
    const activeConflicts = await Booking.find({
      spaceId,
      status: { $in: ['confirmed', 'active'] },
      $or: [
        { startTime: { $lt: end }, endTime: { $gt: start } }
      ]
    }).session(session);

    if (activeConflicts.length >= space.totalSlots) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: 'No slots available for this parking space during the selected timeframe' 
      });
    }

    const duration = calculateHours(start, end);
    const totalAmount = parseFloat((duration * space.pricePerHour).toFixed(2));
    const receiptId = `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const booking = await Booking.create([{
      driverId: req.user._id,
      spaceId,
      startTime: start,
      endTime: end,
      totalAmount,
      status: 'pending',
      receiptId,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ 
      success: true, 
      message: 'Booking request created successfully', 
      data: booking[0] 
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm booking after payment verification
// NOTE: Wallet crediting is handled exclusively by paymentController.verifyPayment
// to prevent double-crediting. This endpoint only updates booking status.
export const confirmBooking = async (req, res, paymentIdValue = null) => {
  try {
    const { bookingId, paymentId } = req.body;
    const finalPaymentId = paymentId || paymentIdValue;

    const booking = await Booking.findById(bookingId).populate('spaceId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Booking has already been processed' });
    }

    booking.status = 'confirmed';
    booking.paymentId = finalPaymentId;
    await booking.save();

    // Create notifications for both driver and owner
    await Notification.create({
      userId: booking.driverId,
      title: 'Booking Confirmed!',
      body: `Your reservation at ${booking.spaceId.title} is confirmed. Receipt: ${booking.receiptId}`,
      type: 'booking'
    });

    await Notification.create({
      userId: booking.spaceId.ownerId,
      title: 'New Booking Received!',
      body: `Your space ${booking.spaceId.title} has a new booking.`,
      type: 'booking'
    });

    res.status(200).json({ 
      success: true, 
      message: 'Booking confirmed successfully', 
      data: booking 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current logged-in driver's bookings
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ driverId: req.user._id })
      .populate({
        path: 'spaceId',
        populate: { path: 'ownerId', select: 'name phone' }
      })
      .sort({ createdAt: -1 });

    // Dynamically compute status for response without mutating DB
    const now = new Date();
    const finalBookings = bookings.map(b => {
      const doc = b.toObject();
      if (doc.status === 'confirmed' && now >= doc.startTime && now < doc.endTime) {
        doc.status = 'active';
      } else if (['confirmed', 'active'].includes(doc.status) && now >= doc.endTime) {
        doc.status = 'completed';
      }
      return doc;
    });

    res.status(200).json({ success: true, count: finalBookings.length, data: finalBookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get bookings on owner's spaces
export const getOwnerBookings = async (req, res) => {
  try {
    // Find all spaces belonging to this owner
    const spaces = await ParkingSpace.find({ ownerId: req.user._id });
    const spaceIds = spaces.map(s => s._id);

    const bookings = await Booking.find({ spaceId: { $in: spaceIds } })
      .populate('spaceId')
      .populate('driverId', 'name phone email')
      .sort({ createdAt: -1 });

    const now = new Date();
    const finalBookings = bookings.map(b => {
      const doc = b.toObject();
      if (doc.status === 'confirmed' && now >= doc.startTime && now < doc.endTime) {
        doc.status = 'active';
      } else if (['confirmed', 'active'].includes(doc.status) && now >= doc.endTime) {
        doc.status = 'completed';
      }
      return doc;
    });

    res.status(200).json({ success: true, count: finalBookings.length, data: finalBookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get specific booking details
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'spaceId',
        populate: { path: 'ownerId', select: 'name phone email rating' }
      })
      .populate('driverId', 'name phone email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const now = new Date();
    const doc = booking.toObject();
    if (doc.status === 'confirmed' && now >= doc.startTime && now < doc.endTime) {
      doc.status = 'active';
    } else if (['confirmed', 'active'].includes(doc.status) && now >= doc.endTime) {
      doc.status = 'completed';
    }

    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel a booking
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('spaceId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check if the user is authorized (either driver or host)
    const isDriver = booking.driverId.toString() === req.user._id.toString();
    const isOwner = booking.spaceId.ownerId.toString() === req.user._id.toString();

    if (!isDriver && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    const now = new Date();
    if (booking.status === 'confirmed' && now >= booking.startTime && now < booking.endTime) {
      booking.status = 'active';
    } else if (['confirmed', 'active'].includes(booking.status) && now >= booking.endTime) {
      booking.status = 'completed';
    }

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${booking.status} booking` });
    }

    const wasConfirmed = (booking.status === 'confirmed' || booking.status === 'active');

    booking.status = 'cancelled';
    await booking.save();

    // Reverse wallet crediting if it was already confirmed
    if (wasConfirmed) {
      const ownerShare = parseFloat((booking.totalAmount * 0.9).toFixed(2));
      let wallet = await OwnerWallet.findOne({ ownerId: booking.spaceId.ownerId });
      if (wallet) {
        wallet.balance -= ownerShare;
        wallet.accumulatedEarnings -= ownerShare;
        await wallet.save();

        await Transaction.create({
          walletId: wallet._id,
          bookingId: booking._id,
          type: 'refund',
          amount: ownerShare,
          status: 'success',
          referenceNumber: `RFND-${booking._id.toString().slice(-6).toUpperCase()}`,
        });
      }
    }

    // Notify driver and owner
    await Notification.create({
      userId: booking.driverId,
      title: 'Booking Cancelled',
      body: `Your reservation at ${booking.spaceId.title} has been cancelled.`,
      type: 'booking'
    });

    await Notification.create({
      userId: booking.spaceId.ownerId,
      title: 'Booking Cancelled',
      body: `The reservation for your space ${booking.spaceId.title} has been cancelled by the driver.`,
      type: 'booking'
    });

    res.status(200).json({ success: true, message: 'Booking cancelled successfully', data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
