import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../providers/space_provider.dart';
import 'booking_confirm_screen.dart';

class ParkingDetailScreen extends ConsumerStatefulWidget {
  final String spaceId;

  const ParkingDetailScreen({super.key, required this.spaceId});

  @override
  ConsumerState<ParkingDetailScreen> createState() => _ParkingDetailScreenState();
}

class _ParkingDetailScreenState extends ConsumerState<ParkingDetailScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(spaceProvider.notifier).fetchSpaceDetails(widget.spaceId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final spaceState = ref.watch(spaceProvider);
    final space = spaceState.selectedSpace;

    if (spaceState.isLoading || space == null) {
      return const Scaffold(
        body: Center(
          child: SpinKitRing(color: Colors.indigo, size: 40),
        ),
      );
    }

    return Scaffold(
      body: Stack(
        children: [
          // Content scroll area
          CustomScrollView(
            slivers: [
              // Sliding App Bar with Image header
              SliverAppBar(
                expandedHeight: 280,
                pinned: true,
                backgroundColor: const Color(0xFF0B0F19),
                leading: CircleAvatar(
                  backgroundColor: Colors.black26,
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: Image.network(
                    space.images.isNotEmpty ? space.images[0] : 'https://images.unsplash.com/photo-1506521788701-1e13a4e83c2a?q=80&w=600&auto=format&fit=crop',
                    fit: BoxFit.cover,
                  ),
                ),
              ),

              // Detailed space body properties
              SliverList(
                delegate: SliverChildListDelegate([
                  Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Space Title & Distance Info
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                space.title,
                                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                              ),
                            ),
                            if (space.distance != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.indigoAccent.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  "${space.distance!.toStringAsFixed(1)} km",
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.indigoAccent),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // Address
                        Text(
                          space.address,
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                        ),
                        const SizedBox(height: 16),

                        // Reviews summary bar
                        Row(
                          children: [
                            const Icon(Icons.star_rounded, color: Colors.amber, size: 18),
                            const SizedBox(width: 4),
                            Text(
                              space.averageRating.toString(),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              "•  ${space.reviewCount} Reviews",
                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                            ),
                          ],
                        ),
                        const Divider(color: Color(0xFF334155), height: 32),

                        // Features / Amenities Grid
                        const Text(
                          "Amenities & Features",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildAmenityCard(Icons.ev_station_rounded, "EV Charger", space.hasEVCharger),
                            _buildAmenityCard(Icons.videocam_rounded, "CCTV Protected", space.hasCCTV),
                            _buildAmenityCard(Icons.roofing_rounded, "Covered Spot", space.isCovered),
                            _buildAmenityCard(Icons.security_rounded, "Guard Guarded", space.isSecurityGuarded),
                          ],
                        ),
                        const Divider(color: Color(0xFF334155), height: 32),

                        // Description
                        const Text(
                          "Description",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          space.description.isNotEmpty 
                              ? space.description 
                              : "This parking space is hosted by a verified home provider. It offers a secure, easily accessible, and convenient parking slot perfect for daily commuters or travelers looking for long/short duration bookings.",
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14, height: 1.6),
                        ),
                        const Divider(color: Color(0xFF334155), height: 32),

                        // Host Profile Card
                        const Text(
                          "Hosted By",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF161E2E).withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: Colors.indigoAccent.withValues(alpha: 0.3),
                                radius: 24,
                                child: Text(
                                  space.ownerName.isNotEmpty ? space.ownerName[0].toUpperCase() : 'H',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.indigoAccent),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      space.ownerName.isNotEmpty ? space.ownerName : "Verified Host",
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                    ),
                                    Text(
                                      "Contact: ${space.ownerPhone.isNotEmpty ? space.ownerPhone : '+91 99999 88888'}",
                                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 100), // Spacing for floating footer
                      ],
                    ),
                  ),
                ]),
              ),
            ],
          ),

          // Floating price and book action bar below
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              decoration: BoxDecoration(
                color: const Color(0xFF161E2E),
                border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        "HOURLY RATE",
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 10, letterSpacing: 0.5),
                      ),
                      Text(
                        "₹${space.pricePerHour.toInt()}/hr",
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.indigoAccent),
                      ),
                    ],
                  ),
                  const SizedBox(width: 32),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => BookingConfirmScreen(space: space),
                          ),
                        );
                      },
                      child: const Text("Book This Spot"),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAmenityCard(IconData icon, String title, bool isAvailable) {
    return Container(
      width: 72,
      height: 72,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isAvailable ? Colors.indigoAccent.withValues(alpha: 0.12) : const Color(0xFF161E2E).withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isAvailable ? Colors.indigoAccent.withValues(alpha: 0.2) : Colors.white.withValues(alpha: 0.04),
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 20,
            color: isAvailable ? Colors.indigoAccent : const Color(0xFF475569),
          ),
          const SizedBox(height: 6),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w600,
              color: isAvailable ? Colors.white : const Color(0xFF64748B),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          )
        ],
      ),
    );
  }
}
