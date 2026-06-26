import OwnerWallet from '../models/OwnerWallet.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';

// Get owner wallet and recent transactions
export const getWallet = async (req, res) => {
  try {
    let wallet = await OwnerWallet.findOne({ ownerId: req.user._id });
    
    // Create wallet if it doesn't exist yet
    if (!wallet) {
      wallet = await OwnerWallet.create({ ownerId: req.user._id });
    }

    const transactions = await Transaction.find({ walletId: wallet._id })
      .populate({
        path: 'bookingId',
        populate: { path: 'spaceId', select: 'title' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        wallet,
        transactions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Request fund withdrawal
export const requestWithdrawal = async (req, res) => {
  try {
    const { amount, payoutMethod = 'UPI', referenceDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please specify a valid withdrawal amount' });
    }

    let wallet = await OwnerWallet.findOne({ ownerId: req.user._id });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    // Process withdrawal
    wallet.balance -= parseFloat(amount);
    wallet.withdrawnEarnings += parseFloat(amount);
    await wallet.save();

    const refNumber = `WDRAW-${Date.now().toString().slice(-6).toUpperCase()}`;

    // Create withdrawal transaction record
    const transaction = await Transaction.create({
      walletId: wallet._id,
      type: 'withdrawal',
      amount: parseFloat(amount),
      status: 'success', // Immediately set to success for local simulation
      referenceNumber: refNumber,
    });

    // Notify user
    await Notification.create({
      userId: req.user._id,
      title: 'Withdrawal Processed!',
      body: `Your request to withdraw ₹${amount} via ${payoutMethod} (${referenceDetails || 'Default Accounts'}) was processed. Ref: ${refNumber}`,
      type: 'wallet',
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal processed successfully',
      data: { wallet, transaction },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
