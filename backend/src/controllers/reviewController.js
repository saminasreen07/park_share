import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import ParkingSpace from '../models/ParkingSpace.js';

// Add review for a completed booking
export const addReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ success: false, message: 'bookingId and rating are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Verify booking matches current user
    if (booking.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to review this booking' });
    }

    // Verify booking is not pending/cancelled
    if (booking.status === 'pending' || booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'You can only review active or completed bookings' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this booking' });
    }

    // Create review
    const review = await Review.create({
      bookingId,
      spaceId: booking.spaceId,
      reviewerId: req.user._id,
      rating: parseInt(rating),
      comment: comment || '',
    });

    // Recalculate average rating and review count for the parking space
    const reviews = await Review.find({ spaceId: booking.spaceId });
    const count = reviews.length;
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / count;

    await ParkingSpace.findByIdAndUpdate(booking.spaceId, {
      averageRating: parseFloat(avg.toFixed(1)),
      reviewCount: count,
    });

    res.status(201).json({ success: true, message: 'Review added successfully', data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get reviews for a parking space
export const getSpaceReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ spaceId: req.params.spaceId })
      .populate('reviewerId', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
