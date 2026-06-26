import express from 'express';
import { getCurrentUser, updateProfile, registerRole, loginAdmin } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateProfile);
router.post('/register-role', protect, registerRole);
router.post('/admin-login', loginAdmin);

export default router;
