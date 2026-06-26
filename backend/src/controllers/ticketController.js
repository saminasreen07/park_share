import Ticket from '../models/Ticket.js';

// Create a new support ticket
export const createTicket = async (req, res) => {
  try {
    const { category, subject, description, bookingId } = req.body;
    const userId = req.user.id;

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: 'Subject and description are required' });
    }

    // Generate a unique Ticket ID: TKT-XXXXXX where XXXXXX is random alphanumeric
    const ticketId = `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const ticket = await Ticket.create({
      ticketId,
      userId,
      bookingId: bookingId || null,
      category: category || 'general',
      subject,
      description,
      status: 'open',
      priority: 'medium',
      messages: [
        {
          senderId: userId,
          message: description,
          timestamp: new Date(),
        }
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all tickets created by the authenticated user
export const getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id })
      .populate('bookingId', 'bookingId checkInDate checkOutDate totalAmount')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all tickets for admin overview (filtered by status)
export const getAdminTickets = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }

    const tickets = await Ticket.find(query)
      .populate('userId', 'name email phone')
      .populate('bookingId', 'bookingId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a reply to a support ticket
export const replyToTicket = async (req, res) => {
  try {
    const { message, status } = req.body;
    const ticketId = req.params.ticketId;
    const senderId = req.user.id;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    // Authorization check: only the ticket creator or an admin can reply
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && ticket.userId.toString() !== senderId) {
      return res.status(403).json({ success: false, message: 'Not authorized to reply to this ticket' });
    }

    // Add reply message
    ticket.messages.push({
      senderId,
      message,
      timestamp: new Date(),
    });

    // Update status if provided or adjust based on who replied
    if (status) {
      ticket.status = status;
      if (['resolved', 'closed'].includes(status)) {
        ticket.resolvedAt = new Date();
      }
    } else if (isAdmin && ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Reply sent successfully',
      data: ticket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
