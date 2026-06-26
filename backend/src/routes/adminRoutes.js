import express from 'express';
import {
  getOverviewStats,
  getAllUsers,
  updateUser,
  deleteUser,
  verifySpaceListing,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getOverviewStats);
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.patch('/spaces/:spaceId/verify', verifySpaceListing);

export default router;
