import express from 'express';
import { addReview, getSpaceReviews } from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, authorize('driver'), addReview);
router.get('/space/:spaceId', getSpaceReviews);

export default router;
