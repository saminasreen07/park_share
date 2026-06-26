import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../providers/space_provider.dart';
import '../../booking/providers/booking_provider.dart';
import '../../booking/screens/receipt_screen.dart';

class MockPaymentSuccessResponse {
  final String? paymentId;
  final String? orderId;
  final String? signature;

  MockPaymentSuccessResponse(this.paymentId, this.orderId, this.signature);
}

class MockPaymentFailureResponse {
  final String? message;

  MockPaymentFailureResponse(this.message);
}

class BookingConfirmScreen extends ConsumerStatefulWidget {
  final SpaceModel space;

  const BookingConfirmScreen({super.key, required this.space});

  @override
  ConsumerState<BookingConfirmScreen> createState() => _BookingConfirmScreenState();
}

class _BookingConfirmScreenState extends ConsumerState<BookingConfirmScreen> {
  DateTime _startTime = DateTime.now().add(const Duration(minutes: 10));
  DateTime _endTime = DateTime.now().add(const Duration(hours: 3));
  bool _isProcessing = false;
  String? _errorMessage;

  double get _durationHours {
    final diff = _endTime.difference(_startTime);
    final hrs = diff.inMinutes / 60.0;
    return hrs > 0.5 ? double.parse(hrs.toStringAsFixed(2)) : 0.5;
  }

  double get _totalAmount {
    return double.parse((_durationHours * widget.space.pricePerHour).toStringAsFixed(2));
  }

  // Choose start or end dates
  Future<void> _selectTime(bool isStart) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(isStart ? _startTime : _endTime),
    );
    if (picked != null) {
      final now = DateTime.now();
      final selectedDate = DateTime(now.year, now.month, now.day, picked.hour, picked.minute);
      
      setState(() {
        if (isStart) {
          _startTime = selectedDate;
          if (_endTime.isBefore(_startTime)) {
            _endTime = _startTime.add(const Duration(hours: 2));
          }
        } else {
          if (selectedDate.isAfter(_startTime)) {
            _endTime = selectedDate;
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("End time must be after start time")),
            );
          }
        }
      });
    }
  }

  // Handle successful payments
  void _handlePaymentSuccess(MockPaymentSuccessResponse response) async {
    final booking = ref.read(bookingProvider).currentBooking;
    if (booking == null) return;

    final verified = await ref.read(bookingProvider.notifier).verifyPayment(
      bookingId: booking.id,
      razorpayPaymentId: response.paymentId ?? 'pay_mock_${DateTime.now().millisecondsSinceEpoch}',
      razorpayOrderId: response.orderId ?? 'order_mock_${DateTime.now().millisecondsSinceEpoch}',
      razorpaySignature: response.signature ?? 'sig_mock_12345',
    );

    if (mounted) {
      setState(() => _isProcessing = false);
      if (verified) {
        // Pushes invoice ticket
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => ReceiptScreen(bookingId: booking.id),
          ),
        );
      } else {
        setState(() => _errorMessage = ref.read(bookingProvider).errorMessage ?? 'Payment signature failed');
      }
    }
  }

  void _handlePaymentError(MockPaymentFailureResponse response) {
    setState(() {
      _isProcessing = false;
      _errorMessage = "Payment failed: ${response.message}";
    });
  }

  // Trigger Booking Checkout
  Future<void> _handleCheckout() async {
    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    // 1. Create a draft Booking document on Backend
    final booking = await ref.read(bookingProvider.notifier).createBookingDraft(
      spaceId: widget.space.id,
      startTime: _startTime,
      endTime: _endTime,
    );

    if (booking == null && mounted) {
      setState(() {
        _isProcessing = false;
        _errorMessage = ref.read(bookingProvider).errorMessage ?? 'Conflict creating booking draft';
      });
      return;
    }

    // 2. Fetch payment transaction specifications
    final order = await ref.read(bookingProvider.notifier).generatePaymentOrder(booking!.id);
    if (order == null && mounted) {
      setState(() {
        _isProcessing = false;
        _errorMessage = 'Could not generate Razorpay order ID';
      });
      return;
    }

    // 3. Launch the web-safe simulated checkout.
    final safeOrder = order!;
    _showMockCheckoutOverlay(safeOrder);
  }

  // Glassmorphic Simulated Razorpay Payment sheet
  void _showMockCheckoutOverlay(Map<String, dynamic> order) {
    showModalBottomSheet(
      context: context,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: const Color(0xFF161E2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(28.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Row(
                children: [
                  Text("💳 ", style: TextStyle(fontSize: 24)),
                  Text(
                    "Simulated Razorpay Gateway",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                "Order ID: ${order['id']}",
                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontFamily: 'monospace'),
              ),
              const Divider(color: Color(0xFF334155), height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Payment Amount", style: TextStyle(color: Colors.white70)),
                  Text(
                    "₹${(order['amount'] / 100).toStringAsFixed(2)}",
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.indigoAccent),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                        _handlePaymentError(MockPaymentFailureResponse('Payment cancelled by simulated user'));
                      },
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 50),
                        side: const BorderSide(color: Color(0xFF334155)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: const Text("Simulate Fail", style: TextStyle(color: Colors.redAccent)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                        _handlePaymentSuccess(
                          MockPaymentSuccessResponse(
                            'pay_mock_${DateTime.now().millisecondsSinceEpoch}',
                            order['id']?.toString(),
                            'signature_mock_generated_${DateTime.now().millisecondsSinceEpoch}',
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        minimumSize: const Size(double.infinity, 50),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: const Text("Simulate Success"),
                    ),
                  ),
                ],
              )
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Booking Confirmation", style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Parking spot info card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF161E2E).withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        widget.space.images.isNotEmpty ? widget.space.images[0] : 'https://images.unsplash.com/photo-1506521788701-1e13a4e83c2a?q=80&w=600&auto=format&fit=crop',
                        width: 64,
                        height: 64,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(widget.space.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          const SizedBox(height: 4),
                          Text(
                            widget.space.address,
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    )
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Booking timing slots picker
              const Text("Select Duration", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _selectTime(true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF161E2E),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                        ),
                        child: Column(
                          children: [
                            const Text("START TIME", style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                            const SizedBox(height: 6),
                            Text(
                              "${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}",
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _selectTime(false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF161E2E),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                        ),
                        child: Column(
                          children: [
                            const Text("END TIME", style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                            const SizedBox(height: 6),
                            Text(
                              "${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}",
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Payment Receipt Pricing breakdown
              const Text("Invoice Details", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF161E2E).withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Hourly Rate", style: TextStyle(color: Colors.white60)),
                        Text("₹${widget.space.pricePerHour.toInt()}/hr", style: const TextStyle(fontWeight: FontWeight.w500)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Duration", style: TextStyle(color: Colors.white60)),
                        Text("$_durationHours hrs", style: const TextStyle(fontWeight: FontWeight.w500)),
                      ],
                    ),
                    const Divider(color: Color(0xFF334155), height: 28),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Total Amount", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        Text(
                          "₹$_totalAmount",
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.indigoAccent),
                        ),
                      ],
                    )
                  ],
                ),
              ),
              const SizedBox(height: 32),

              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 24),
                  child: Text(
                    _errorMessage!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                  ),
                ),

              _isProcessing
                  ? const Center(child: SpinKitRing(color: Colors.indigo, size: 40))
                  : ElevatedButton(
                      onPressed: _handleCheckout,
                      child: const Text("Proceed to Payment"),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
