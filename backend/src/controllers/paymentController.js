import crypto from 'crypto';
import { getRazorpayInstance, isRazorpayMocked } from '../config/razorpay.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import OwnerWallet from '../models/OwnerWallet.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';

// Create Razorpay Order
export const createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const amountInPaisa = Math.round(booking.totalAmount * 100);

    // 1. Mock Payment Order Generation
    if (isRazorpayMocked()) {
      const mockOrder = {
        id: `order_mock_${Date.now()}`,
        entity: 'order',
        amount: amountInPaisa,
        amount_paid: 0,
        amount_due: amountInPaisa,
        currency: 'INR',
        receipt: booking.receiptId,
        status: 'created',
        attempts: 0,
        notes: [],
        created_at: Math.floor(Date.now() / 1000),
        isMock: true,
      };

      return res.status(200).json({ success: true, data: mockOrder });
    }

    // 2. Real Razorpay Order Generation
    const razorpay = getRazorpayInstance();
    const options = {
      amount: amountInPaisa,
      currency: 'INR',
      receipt: booking.receiptId,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify Razorpay Payment Signature & Confirm Booking
export const verifyPayment = async (req, res) => {
  try {
    const {
      bookingId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;

    if (!bookingId || !razorpay_payment_id || !razorpay_order_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide bookingId, razorpay_payment_id, and razorpay_order_id' 
      });
    }

    const booking = await Booking.findById(bookingId).populate('spaceId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    let isVerified = false;

    // 1. Mock payment verification
    if (isRazorpayMocked() || razorpay_order_id.startsWith('order_mock_')) {
      isVerified = true;
      console.log('Verifying SIMULATED Mock Razorpay Payment');
    } else {
      // 2. Real Razorpay payment verification
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      const shasum = crypto.createHmac('sha256', keySecret);
      shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const digest = shasum.digest('hex');

      if (digest === razorpay_signature) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Create payment entry
    const payment = await Payment.create({
      bookingId,
      transactionId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: booking.totalAmount,
      status: 'success',
      paymentMethod: req.body.paymentMethod || 'UPI',
    });

    // Update booking status
    booking.status = 'confirmed';
    booking.paymentId = payment._id;
    await booking.save();

    // 10% platform commission, 90% goes to host wallet
    const ownerShare = parseFloat((booking.totalAmount * 0.9).toFixed(2));
    
    let wallet = await OwnerWallet.findOne({ ownerId: booking.spaceId.ownerId });
    if (!wallet) {
      wallet = await OwnerWallet.create({ ownerId: booking.spaceId.ownerId });
    }

    wallet.balance += ownerShare;
    wallet.accumulatedEarnings += ownerShare;
    await wallet.save();

    // Log transaction
    await Transaction.create({
      walletId: wallet._id,
      bookingId: booking._id,
      type: 'earning',
      amount: ownerShare,
      status: 'success',
      referenceNumber: `EARN-${booking._id.toString().slice(-6).toUpperCase()}`,
    });

    // Create Notification alerts
    await Notification.create({
      userId: booking.driverId,
      title: 'Payment Successful!',
      body: `Your payment of ₹${booking.totalAmount} for space ${booking.spaceId.title} was processed. Booking confirmed!`,
      type: 'payment'
    });

    await Notification.create({
      userId: booking.spaceId.ownerId,
      title: 'Earning Credited!',
      body: `₹${ownerShare.toFixed(2)} has been credited to your wallet for the reservation of ${booking.spaceId.title}.`,
      type: 'wallet'
    });

    res.status(200).json({ 
      success: true, 
      message: 'Payment verified and booking confirmed successfully', 
      data: { booking, payment } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
