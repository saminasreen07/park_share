import express from 'express';
import { createTicket, getUserTickets, replyToTicket } from '../controllers/ticketController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createTicket);
router.get('/', getUserTickets);
router.post('/:ticketId/reply', replyToTicket);

export default router;
