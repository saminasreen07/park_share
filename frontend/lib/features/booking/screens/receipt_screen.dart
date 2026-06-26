import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../providers/booking_provider.dart';

class ReceiptScreen extends ConsumerWidget {
  final String bookingId;

  const ReceiptScreen({super.key, required this.bookingId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingList = ref.watch(bookingProvider).driverBookings;
    final booking = bookingList.firstWhere(
      (b) => b.id == bookingId,
      orElse: () => ref.watch(bookingProvider).ownerBookings.firstWhere((b) => b.id == bookingId),
    );

    final dateFormat = DateFormat('MMM dd, yyyy');
    final timeFormat = DateFormat('hh:mm a');

    return Scaffold(
      appBar: AppBar(
        title: const Text("Booking Receipt", style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.close_rounded, color: Colors.white),
            onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Ticket card container
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF161E2E),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    )
                  ],
                ),
                child: Column(
                  children: [
                    const Icon(Icons.check_circle_rounded, size: 52, color: Colors.greenAccent),
                    const SizedBox(height: 12),
                    const Text(
                      "Reservation Confirmed",
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "Receipt ID: ${booking.receiptId}",
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontFamily: 'monospace'),
                    ),
                    const Divider(color: Color(0xFF334155), height: 32),

                    // QR Check-in Box
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: QrImageView(
                        data: booking.receiptId,
                        version: QrVersions.auto,
                        size: 160.0,
                        gapless: false,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      "Scan QR at the gate to check-in",
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w500),
                    ),
                    const Divider(color: Color(0xFF334155), height: 32),

                    // Space details
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.local_parking_rounded, color: Colors.indigoAccent, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(booking.spaceTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              Text(booking.spaceAddress, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Timings detail
                    Row(
                      children: [
                        Expanded(
                          child: _buildTimeDetailCol(
                            "CHECK IN",
                            dateFormat.format(booking.startTime),
                            timeFormat.format(booking.startTime),
                          ),
                        ),
                        Container(width: 1, height: 40, color: const Color(0xFF334155)),
                        Expanded(
                          child: _buildTimeDetailCol(
                            "CHECK OUT",
                            dateFormat.format(booking.endTime),
                            timeFormat.format(booking.endTime),
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: Color(0xFF334155), height: 32),

                    // Billing Price row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Total Bill Paid", style: TextStyle(color: Colors.white60)),
                        Text(
                          "₹${booking.totalAmount}",
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.indigoAccent),
                        ),
                      ],
                    )
                  ],
                ),
              ),
              const SizedBox(height: 32),

              ElevatedButton(
                onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                child: const Text("Back to Map Home"),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTimeDetailCol(String header, String date, String time) {
    return Column(
      children: [
        Text(header, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9, letterSpacing: 0.5)),
        const SizedBox(height: 6),
        Text(date, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        Text(time, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
      ],
    );
  }
}
