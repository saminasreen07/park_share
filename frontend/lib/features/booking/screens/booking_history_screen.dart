import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:intl/intl.dart';
import '../providers/booking_provider.dart';
import 'receipt_screen.dart';
import 'navigation_screen.dart';

class BookingHistoryScreen extends ConsumerStatefulWidget {
  const BookingHistoryScreen({super.key});

  @override
  ConsumerState<BookingHistoryScreen> createState() => _BookingHistoryScreenState();
}

class _BookingHistoryScreenState extends ConsumerState<BookingHistoryScreen> {
  int _activeTab = 0; // 0: Active & Upcoming, 1: Past

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(bookingProvider.notifier).fetchUserBookings();
    });
  }

  void _showReviewDialog(String bookingId) {
    int selectedRating = 5;
    final commentController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF161E2E),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              title: const Text("Rate Your Experience", style: TextStyle(fontWeight: FontWeight.bold)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("How was the parking spot and convenience?", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                  const SizedBox(height: 16),
                  
                  // Stars selector
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      final starVal = index + 1;
                      return IconButton(
                        icon: Icon(
                          Icons.star_rounded,
                          size: 32,
                          color: starVal <= selectedRating ? Colors.amber : const Color(0xFF334155),
                        ),
                        onPressed: () {
                          setDialogState(() => selectedRating = starVal);
                        },
                      );
                    }),
                  ),
                  const SizedBox(height: 16),
                  
                  // Comment box
                  TextField(
                    controller: commentController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: "Leave comments for other drivers...",
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text("Cancel"),
                ),
                isSubmitting
                    ? const SpinKitRing(color: Colors.indigo, size: 24)
                    : ElevatedButton(
                        style: ElevatedButton.styleFrom(minimumSize: const Size(100, 40)),
                        onPressed: () async {
                          setDialogState(() => isSubmitting = true);
                          final ok = await ref.read(bookingProvider.notifier).submitReview(
                            bookingId: bookingId,
                            rating: selectedRating,
                            comment: commentController.text,
                          );
                          if (context.mounted) {
                            Navigator.of(context).pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(ok ? "Review submitted successfully!" : "Failed to submit review"),
                                backgroundColor: ok ? Colors.green : Colors.redAccent,
                              ),
                            );
                          }
                        },
                        child: const Text("Submit"),
                      ),
              ],
            );
          },
        );
      },
    );
  }

  void _confirmCancelBooking(String bookingId) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF161E2E),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Text("Cancel Reservation?", style: TextStyle(fontWeight: FontWeight.bold)),
          content: const Text("Are you sure you want to cancel this booking? Refund will be initiated to your wallet.", style: TextStyle(color: Color(0xFF94A3B8))),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text("No, Keep it"),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, minimumSize: const Size(100, 40)),
              onPressed: () async {
                Navigator.of(context).pop();
                final ok = await ref.read(bookingProvider.notifier).cancelBooking(bookingId);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(ok ? "Reservation cancelled successfully" : "Failed to cancel booking"),
                      backgroundColor: ok ? Colors.green : Colors.redAccent,
                    ),
                  );
                }
              },
              child: const Text("Yes, Cancel"),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingState = ref.watch(bookingProvider);
    final bookingsList = bookingState.driverBookings;

    // Filter list based on tabs
    final now = DateTime.now();
    final activeBookings = bookingsList.where((b) => 
      ['pending', 'confirmed', 'active'].contains(b.status) && b.endTime.isAfter(now)
    ).toList();
    
    final pastBookings = bookingsList.where((b) => 
      ['completed', 'cancelled'].contains(b.status) || b.endTime.isBefore(now)
    ).toList();

    final currentDisplayList = _activeTab == 0 ? activeBookings : pastBookings;

    return Scaffold(
      appBar: AppBar(
        title: const Text("My Parking Trips", style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Tab toggle headers
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _activeTab = 0),
                      child: Container(
                        alignment: Alignment.center,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: _activeTab == 0 ? Colors.indigoAccent : Colors.transparent,
                              width: 2,
                            ),
                          ),
                        ),
                        child: Text(
                          "Active & Upcoming",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _activeTab == 0 ? Colors.white : const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _activeTab = 1),
                      child: Container(
                        alignment: Alignment.center,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: _activeTab == 1 ? Colors.indigoAccent : Colors.transparent,
                              width: 2,
                            ),
                          ),
                        ),
                        child: Text(
                          "History / Past",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _activeTab == 1 ? Colors.white : const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Booking list view
              Expanded(
                child: bookingState.isLoading
                    ? const Center(child: SpinKitRing(color: Colors.indigo, size: 40))
                    : currentDisplayList.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.car_crash_rounded, size: 48, color: Color(0xFF334155)),
                                const SizedBox(height: 12),
                                Text(
                                  _activeTab == 0 ? "No active reservation bookings." : "No booking history found.",
                                  style: const TextStyle(color: Color(0xFF64748B)),
                                )
                              ],
                            ),
                          )
                        : ListView.builder(
                            itemCount: currentDisplayList.length,
                            itemBuilder: (context, index) {
                              final booking = currentDisplayList[index];
                              final timeFormat = DateFormat('MMM dd, hh:mm a');

                              return Container(
                                margin: const EdgeInsets.only(bottom: 16),
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF161E2E).withOpacity(0.6),
                                  borderRadius: BorderRadius.circular(24),
                                  border: Border.all(color: Colors.white.withOpacity(0.06)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            booking.spaceTitle,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: booking.status == 'confirmed'
                                                ? Colors.green.withOpacity(0.15)
                                                : booking.status == 'active'
                                                    ? Colors.amber.withOpacity(0.15)
                                                    : Colors.blueGrey.withOpacity(0.15),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            booking.status.toUpperCase(),
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                              color: booking.status == 'confirmed'
                                                  ? Colors.greenAccent
                                                  : booking.status == 'active'
                                                      ? Colors.amberAccent
                                                      : Colors.white70,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      booking.spaceAddress,
                                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const Divider(color: Color(0xFF334155), height: 24),
                                    
                                    // Timings & Price details
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text("TIMING DETAILS", style: TextStyle(color: Color(0xFF64748B), fontSize: 9)),
                                            const SizedBox(height: 4),
                                            Text(
                                              "${timeFormat.format(booking.startTime)} - ${timeFormat.format(booking.endTime)}",
                                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                                            ),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            const Text("TOTAL PAID", style: TextStyle(color: Color(0xFF64748B), fontSize: 9)),
                                            const SizedBox(height: 4),
                                            Text(
                                              "₹${booking.totalAmount.toInt()}",
                                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.indigoAccent),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 20),

                                    // Action Buttons row
                                    Row(
                                      children: [
                                        if (_activeTab == 0) ...[
                                          Expanded(
                                            child: OutlinedButton(
                                              onPressed: () => _confirmCancelBooking(booking.id),
                                              style: OutlinedButton.styleFrom(
                                                side: const BorderSide(color: Color(0xFF334155)),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                              ),
                                              child: const Text("Cancel", style: TextStyle(color: Colors.redAccent, fontSize: 13)),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: ElevatedButton(
                                              onPressed: () {
                                                Navigator.of(context).push(
                                                  MaterialPageRoute(
                                                    builder: (context) => NavigationScreen(bookingId: booking.id),
                                                  ),
                                                );
                                              },
                                              style: ElevatedButton.styleFrom(
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                              ),
                                              child: const Text("Navigate", style: TextStyle(fontSize: 13)),
                                            ),
                                          ),
                                        ],
                                        if (_activeTab == 1) ...[
                                          Expanded(
                                            child: OutlinedButton(
                                              onPressed: () {
                                                Navigator.of(context).push(
                                                  MaterialPageRoute(
                                                    builder: (context) => ReceiptScreen(bookingId: booking.id),
                                                  ),
                                                );
                                              },
                                              style: OutlinedButton.styleFrom(
                                                side: const BorderSide(color: Color(0xFF334155)),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                              ),
                                              child: const Text("View Invoice", style: TextStyle(color: Colors.white70, fontSize: 13)),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          if (booking.status == 'completed')
                                            Expanded(
                                              child: ElevatedButton(
                                                onPressed: () => _showReviewDialog(booking.id),
                                                style: ElevatedButton.styleFrom(
                                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                                ),
                                                child: const Text("Leave Review", style: TextStyle(fontSize: 13)),
                                              ),
                                            ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
