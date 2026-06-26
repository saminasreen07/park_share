import express from 'express';
import { getWallet, requestWithdrawal } from '../controllers/walletController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('owner'), getWallet);
router.post('/withdraw', protect, authorize('owner'), requestWithdrawal);

export default router;
