import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../providers/ticket_provider.dart';

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _selectedCategory = 'general';
  bool _isSubmitting = false;

  final List<Map<String, String>> _categories = [
    {'value': 'general', 'label': 'General Question'},
    {'value': 'payment_issue', 'label': 'Payment Issue'},
    {'value': 'booking_issue', 'label': 'Booking Issue'},
    {'value': 'kyc_issue', 'label': 'KYC / Profile Verification'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    // Fetch tickets on load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(ticketProvider.notifier).fetchTickets();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _subjectController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submitTicket() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final ticket = await ref.read(ticketProvider.notifier).createTicket(
          category: _selectedCategory,
          subject: _subjectController.text.trim(),
          description: _descriptionController.text.trim(),
        );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (ticket != null) {
        _subjectController.clear();
        _descriptionController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Support ticket ${ticket.ticketId} created successfully!"),
            backgroundColor: Colors.green,
          ),
        );
        _tabController.animateTo(1); // Switch to ticket history tab
      } else {
        final err = ref.read(ticketProvider).errorMessage ?? "Error creating ticket";
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticketState = ref.watch(ticketProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Support & Tickets", style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.indigoAccent,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(text: "New Ticket"),
            Tab(text: "Ticket History"),
          ],
        ),
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabController,
          children: [
            // Tab 1: New Ticket Form
            _buildNewTicketTab(),

            // Tab 2: Ticket History List
            _buildTicketHistoryTab(ticketState),
          ],
        ),
      ),
    );
  }

  Widget _buildNewTicketTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              "How can we help you today?",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              "Please fill out this form to submit a support ticket to our team. We usually reply within 2 hours.",
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
            ),
            const SizedBox(height: 32),

            // Category selector dropdown
            const Text("Category", style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF161E2E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedCategory,
                  dropdownColor: const Color(0xFF161E2E),
                  icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white60),
                  items: _categories.map((cat) {
                    return DropdownMenuItem<String>(
                      value: cat['value'],
                      child: Text(cat['label']!, style: const TextStyle(color: Colors.white)),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() => _selectedCategory = val);
                    }
                  },
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Subject TextField
            const Text("Subject", style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _subjectController,
              decoration: InputDecoration(
                hintText: "Enter a brief summary of the issue",
                filled: true,
                fillColor: const Color(0xFF161E2E),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.all(18),
              ),
              validator: (val) {
                if (val == null || val.trim().isEmpty) return "Please enter a subject";
                return null;
              },
            ),
            const SizedBox(height: 24),

            // Description TextField
            const Text("Description / Details", style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descriptionController,
              maxLines: 6,
              decoration: InputDecoration(
                hintText: "Please describe your query in detail...",
                filled: true,
                fillColor: const Color(0xFF161E2E),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.all(18),
              ),
              validator: (val) {
                if (val == null || val.trim().isEmpty) return "Please provide details";
                return null;
              },
            ),
            const SizedBox(height: 32),

            _isSubmitting
                ? const Center(child: SpinKitRing(color: Colors.indigoAccent, size: 40))
                : ElevatedButton(
                    onPressed: _submitTicket,
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 54),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text("Submit Ticket", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildTicketHistoryTab(TicketState state) {
    if (state.isLoading && state.tickets.isEmpty) {
      return const Center(child: SpinKitRing(color: Colors.indigoAccent, size: 45));
    }

    if (state.tickets.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text("🎫", style: TextStyle(fontSize: 48)),
            const SizedBox(height: 16),
            const Text(
              "No support tickets found",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white70),
            ),
            const SizedBox(height: 8),
            const Text(
              "Any tickets you submit will appear here.",
              style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => _tabController.animateTo(0),
              child: const Text("Create New Ticket"),
            )
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(ticketProvider.notifier).fetchTickets(),
      color: Colors.indigoAccent,
      backgroundColor: const Color(0xFF161E2E),
      child: ListView.builder(
        padding: const EdgeInsets.all(24.0),
        itemCount: state.tickets.length,
        itemBuilder: (context, index) {
          final ticket = state.tickets[index];
          return Card(
            color: const Color(0xFF161E2E).withValues(alpha: 0.5),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(color: Colors.white.withValues(alpha: 0.05)),
            ),
            margin: const EdgeInsets.only(bottom: 16),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              title: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    ticket.ticketId,
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.indigoAccent, fontFamily: 'monospace'),
                  ),
                  _buildStatusBadge(ticket.status),
                ],
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 12),
                  Text(ticket.subject, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: Colors.white)),
                  const SizedBox(height: 6),
                  Text(
                    ticket.description,
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _categories.firstWhere((cat) => cat['value'] == ticket.category)['label']!,
                        style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                      ),
                      Text(
                        "${ticket.createdAt.day}/${ticket.createdAt.month}/${ticket.createdAt.year}",
                        style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                      ),
                    ],
                  )
                ],
              ),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => TicketDetailsScreen(ticket: ticket),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bgColor;
    Color fgColor;
    String text;

    switch (status) {
      case 'open':
        bgColor = Colors.blue.withValues(alpha: 0.15);
        fgColor = Colors.blue;
        text = 'Open';
        break;
      case 'in_progress':
        bgColor = Colors.orange.withValues(alpha: 0.15);
        fgColor = Colors.orange;
        text = 'In Progress';
        break;
      case 'resolved':
        bgColor = Colors.green.withValues(alpha: 0.15);
        fgColor = Colors.green;
        text = 'Resolved';
        break;
      default:
        bgColor = Colors.grey.withValues(alpha: 0.15);
        fgColor = Colors.grey;
        text = 'Closed';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(color: fgColor, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class TicketDetailsScreen extends ConsumerStatefulWidget {
  final TicketModel ticket;
  const TicketDetailsScreen({super.key, required this.ticket});

  @override
  ConsumerState<TicketDetailsScreen> createState() => _TicketDetailsScreenState();
}

class _TicketDetailsScreenState extends ConsumerState<TicketDetailsScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isReplying = false;

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendReply() async {
    final msg = _messageController.text.trim();
    if (msg.isEmpty) return;

    setState(() => _isReplying = true);

    final success = await ref.read(ticketProvider.notifier).replyToTicket(widget.ticket.ticketId, msg);

    if (mounted) {
      setState(() => _isReplying = false);
      if (success) {
        _messageController.clear();
        // Scroll to the bottom
        Future.delayed(const Duration(milliseconds: 100), () {
          if (_scrollController.hasClients) {
            _scrollController.animateTo(
              _scrollController.position.maxScrollExtent,
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOut,
            );
          }
        });
      } else {
        final err = ref.read(ticketProvider).errorMessage ?? "Error sending reply";
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Watch provider to get updated messages in real-time
    final ticketState = ref.watch(ticketProvider);
    final activeTicket = ticketState.tickets.firstWhere(
      (t) => t.ticketId == widget.ticket.ticketId,
      orElse: () => widget.ticket,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(activeTicket.ticketId, style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace')),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Subject card
            Container(
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF161E2E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activeTicket.subject,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Status: ${activeTicket.status.toUpperCase()} | Priority: ${activeTicket.priority.toUpperCase()}",
                    style: const TextStyle(fontSize: 11, color: Colors.indigoAccent, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),

            // Message History list
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16.0),
                itemCount: activeTicket.messages.length,
                itemBuilder: (context, index) {
                  final msg = activeTicket.messages[index];
                  // If sender is current user, align right
                  final isMe = msg.senderId == activeTicket.userId;
                  return _buildMessageBubble(msg, isMe);
                },
              ),
            ),

            // Reply input panel
            if (activeTicket.status != 'closed' && activeTicket.status != 'resolved')
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: const BoxDecoration(
                  color: Color(0xFF111827),
                  border: Border(top: BorderSide(color: Color(0xFF1F2937))),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        maxLines: null,
                        decoration: InputDecoration(
                          hintText: "Type your reply here...",
                          filled: true,
                          fillColor: const Color(0xFF161E2E),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide.none,
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    _isReplying
                        ? const SpinKitRing(color: Colors.indigoAccent, size: 30)
                        : CircleAvatar(
                            backgroundColor: Colors.indigoAccent,
                            radius: 24,
                            child: IconButton(
                              icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                              onPressed: _sendReply,
                            ),
                          ),
                  ],
                ),
              )
            else
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                color: const Color(0xFF1F2937).withValues(alpha: 0.4),
                child: const Text(
                  "This ticket is closed and cannot receive replies.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white60, fontSize: 13),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(TicketMessageModel msg, bool isMe) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: isMe ? Colors.indigoAccent : const Color(0xFF1F2937),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: Radius.circular(isMe ? 20 : 0),
            bottomRight: Radius.circular(isMe ? 0 : 20),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isMe)
              const Text(
                "Support Representative",
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.indigoAccent),
              ),
            if (!isMe) const SizedBox(height: 4),
            Text(
              msg.message,
              style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.3),
            ),
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.bottomRight,
              child: Text(
                "${msg.timestamp.hour.toString().padLeft(2, '0')}:${msg.timestamp.minute.toString().padLeft(2, '0')}",
                style: const TextStyle(color: Colors.white54, fontSize: 9),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
