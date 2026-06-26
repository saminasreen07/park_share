import mongoose from 'mongoose';

const parkingSpaceSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    images: [
      {
        type: String,
      },
    ],
    pricePerHour: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSlots: {
      type: Number,
      default: 1,
      min: 1,
    },
    availableSlots: {
      type: Number,
      default: 1,
    },
    availability: {
      isAlwaysAvailable: {
        type: Boolean,
        default: true,
      },
      startTime: {
        type: String, // e.g. "08:00"
        default: "00:00",
      },
      endTime: {
        type: String, // e.g. "22:00"
        default: "23:59",
      },
      daysOfWeek: [
        {
          type: Number, // 0 for Sunday, 1 for Monday, etc.
          min: 0,
          max: 6,
        },
      ],
    },
    features: {
      hasEVCharger: { type: Boolean, default: false },
      hasCCTV: { type: Boolean, default: false },
      isCovered: { type: Boolean, default: false },
      isSecurityGuarded: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index location field for geo-queries
parkingSpaceSchema.index({ location: '2dsphere' });

const ParkingSpace = mongoose.model('ParkingSpace', parkingSpaceSchema);
export default ParkingSpace;
