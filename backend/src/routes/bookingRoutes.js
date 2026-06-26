import express from 'express';
import {
  createBooking,
  confirmBooking,
  getUserBookings,
  getOwnerBookings,
  getBookingById,
  cancelBooking,
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/user', protect, getUserBookings);
router.get('/owner', protect, authorize('owner'), getOwnerBookings);
router.get('/:id', protect, getBookingById);

router.post('/', protect, authorize('driver'), createBooking);
router.post('/confirm', protect, confirmBooking);
router.post('/:id/cancel', protect, cancelBooking);

export default router;
