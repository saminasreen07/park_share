import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../../auth/providers/auth_provider.dart';
import '../../parking/providers/space_provider.dart';
import '../../booking/providers/booking_provider.dart';
import '../../wallet/screens/wallet_screen.dart';
import '../../owner_space/screens/add_space_screen.dart';
import '../../parking/screens/parking_detail_screen.dart';

class OwnerHomeScreen extends ConsumerStatefulWidget {
  const OwnerHomeScreen({super.key});

  @override
  ConsumerState<OwnerHomeScreen> createState() => _OwnerHomeScreenState();
}

class _OwnerHomeScreenState extends ConsumerState<OwnerHomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(spaceProvider.notifier).fetchOwnerSpaces();
      ref.read(bookingProvider.notifier).fetchOwnerBookings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final spaceState = ref.watch(spaceProvider);
    final bookingState = ref.watch(bookingProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Host Dashboard", style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.wallet_rounded, color: Colors.indigoAccent),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const WalletScreen(),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.directions_car_rounded, color: Colors.white),
            onPressed: () {
              // Switch back to driver mode
              ref.read(authProvider.notifier).switchRole('driver');
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(spaceProvider.notifier).fetchOwnerSpaces();
          await ref.read(bookingProvider.notifier).fetchOwnerBookings();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Host Greeting
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Welcome back, ${user?.name ?? 'Host'}",
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                      ),
                      const Text(
                        "Here's an overview of your parking listings.",
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Add Space Quick CTA Card
              GestureDetector(
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const AddSpaceScreen(),
                    ),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Colors.indigo, Colors.blueAccent],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.indigo.withValues(alpha: 0.3),
                        blurRadius: 15,
                        offset: const Offset(0, 8),
                      )
                    ],
                  ),
                  child: const Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: Colors.white24,
                        child: Icon(Icons.add_rounded, color: Colors.white),
                      ),
                      SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Rent Another Parking Space",
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            Text(
                              "List EV or regular slots instantly",
                              style: TextStyle(fontSize: 11, color: Colors.white70),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.white70),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Listings Section Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Your Listed Spaces",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "(${spaceState.ownerSpaces.length})",
                    style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Owner Spaces List
              spaceState.isLoading
                  ? const Center(child: SpinKitRing(color: Colors.indigo, size: 30))
                  : spaceState.ownerSpaces.isEmpty
                      ? Container(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          decoration: BoxDecoration(
                            color: const Color(0xFF161E2E).withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.04)),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.map_rounded, size: 40, color: Color(0xFF334155)),
                              SizedBox(height: 12),
                              Text("You haven't listed any spaces yet.", style: TextStyle(color: Color(0xFF64748B))),
                            ],
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: spaceState.ownerSpaces.length,
                          itemBuilder: (context, index) {
                            final space = spaceState.ownerSpaces[index];
                            return Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF161E2E).withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                              ),
                              child: Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(12),
                                    child: Image.network(
                                      space.images.isNotEmpty ? space.images[0] : 'https://images.unsplash.com/photo-1506521788701-1e13a4e83c2a?q=80&w=600&auto=format&fit=crop',
                                      width: 60,
                                      height: 60,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          space.title,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                        ),
                                        Text(
                                          space.address,
                                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          "₹${space.pricePerHour.toInt()}/hr • ${space.status.toUpperCase()}",
                                          style: const TextStyle(
                                            color: Colors.indigoAccent,
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.white30),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (context) => ParkingDetailScreen(spaceId: space.id),
                                        ),
                                      );
                                    },
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
              const SizedBox(height: 32),

              // Bookings Section Header
              const Text(
                "Recent Booking Activities",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),

              // Owner incoming bookings
              bookingState.isLoading
                  ? const Center(child: SpinKitRing(color: Colors.indigo, size: 30))
                  : bookingState.ownerBookings.isEmpty
                      ? Container(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          decoration: BoxDecoration(
                            color: const Color(0xFF161E2E).withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.04)),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.calendar_today_rounded, size: 40, color: Color(0xFF334155)),
                              SizedBox(height: 12),
                              Text("No rental activities recorded yet.", style: TextStyle(color: Color(0xFF64748B))),
                            ],
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: bookingState.ownerBookings.length,
                          itemBuilder: (context, index) {
                            final booking = bookingState.ownerBookings[index];
                            return Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF161E2E).withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                              ),
                              child: Column(
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        booking.spaceTitle,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: booking.status == 'confirmed' 
                                              ? Colors.green.withValues(alpha: 0.15) 
                                              : Colors.blue.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          booking.status.toUpperCase(),
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold,
                                            color: booking.status == 'confirmed' 
                                                ? Colors.greenAccent 
                                                : Colors.blueAccent,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const Divider(color: Color(0xFF334155), height: 20),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text("EARNED", style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                          Text(
                                            "₹${(booking.totalAmount * 0.9).toStringAsFixed(1)}",
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.indigoAccent),
                                          ),
                                        ],
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          const Text("DATE & TIMING", style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                          Text(
                                            "${booking.startTime.day}/${booking.startTime.month} at ${booking.startTime.hour}:00",
                                            style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ],
          ),
        ),
      ),
    );
  }
}
