import mongoose from 'mongoose';

const ownerWalletSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    accumulatedEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    withdrawnEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const OwnerWallet = mongoose.model('OwnerWallet', ownerWalletSchema);
export default OwnerWallet;
