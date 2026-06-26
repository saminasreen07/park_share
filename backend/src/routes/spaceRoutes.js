import express from 'express';
import {
  createSpace,
  getSpaces,
  getNearbyAndRecommended,
  getSpaceById,
  getOwnerSpaces,
  toggleAvailability,
  updateSpace,
  deleteSpace,
} from '../controllers/spaceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getSpaces);
router.get('/nearby', getNearbyAndRecommended);
router.get('/owner', protect, authorize('owner'), getOwnerSpaces);
router.get('/:id', getSpaceById);

router.post('/', protect, authorize('owner'), createSpace);
router.put('/:id', protect, authorize('owner'), updateSpace);
router.delete('/:id', protect, authorize('owner'), deleteSpace);
router.patch('/:id/toggle-availability', protect, authorize('owner'), toggleAvailability);

export default router;
