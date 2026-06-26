import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../../auth/providers/auth_provider.dart';
import '../../parking/providers/space_provider.dart';
import '../../parking/screens/parking_detail_screen.dart';
import '../../booking/screens/booking_history_screen.dart';

class DriverHomeScreen extends ConsumerStatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  ConsumerState<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends ConsumerState<DriverHomeScreen> {
  GoogleMapController? _mapController;
  Position? _currentPosition;
  final Set<Marker> _markers = {};
  
  // Filters state
  double _maxPrice = 150.0;
  double _minRating = 3.0;
  bool _onlyEV = false;

  final LatLng _defaultLocation = const LatLng(12.9716, 77.5946); // Bangalore standard default

  @override
  void initState() {
    super.initState();
    _determinePosition();
  }

  // Request GPS Permissions
  Future<void> _determinePosition() async {
    if (kIsWeb) {
      _loadNearbyParking(_defaultLocation.latitude, _defaultLocation.longitude);
      return;
    }

    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _loadNearbyParking(_defaultLocation.latitude, _defaultLocation.longitude);
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _loadNearbyParking(_defaultLocation.latitude, _defaultLocation.longitude);
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      _loadNearbyParking(_defaultLocation.latitude, _defaultLocation.longitude);
      return;
    }

    final position = await Geolocator.getCurrentPosition();
    if (mounted) {
      setState(() {
        _currentPosition = position;
      });
      _loadNearbyParking(position.latitude, position.longitude);
      _animateToPosition(LatLng(position.latitude, position.longitude));
    }
  }

  void _loadNearbyParking(double lat, double lng) {
    ref.read(spaceProvider.notifier).fetchNearbySpaces(
      latitude: lat,
      longitude: lng,
      budget: _maxPrice,
      minRating: _minRating,
    );
  }

  void _animateToPosition(LatLng target) {
    if (kIsWeb) return;

    _mapController?.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: target, zoom: 14.5),
      ),
    );
  }

  void _updateMarkers(List<SpaceModel> spaces) {
    if (kIsWeb) return;

    setState(() {
      _markers.clear();

      // Current location marker if available
      if (_currentPosition != null) {
        _markers.add(
          Marker(
            markerId: const MarkerId('current_location'),
            position: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
            infoWindow: const InfoWindow(title: 'Your Location'),
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
          ),
        );
      }

      // Parking Space markers
      for (var space in spaces) {
        if (_onlyEV && !space.hasEVCharger) continue;

        _markers.add(
          Marker(
            markerId: MarkerId(space.id),
            position: LatLng(space.latitude, space.longitude),
            infoWindow: InfoWindow(
              title: space.title,
              snippet: '₹${space.pricePerHour}/hr - ⭐ ${space.averageRating.toString()}',
            ),
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => ParkingDetailScreen(spaceId: space.id),
                ),
              );
            },
          ),
        );
      }
    });
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF161E2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    "Preferences & Filters",
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),

                  // Price Filter
                  Text(
                    "Max Budget: ₹${_maxPrice.toInt()}/hr",
                    style: const TextStyle(fontSize: 14, color: Colors.white70),
                  ),
                  Slider(
                    value: _maxPrice,
                    min: 20.0,
                    max: 200.0,
                    divisions: 18,
                    activeColor: Colors.indigoAccent,
                    onChanged: (val) {
                      setSheetState(() => _maxPrice = val);
                      setState(() => _maxPrice = val);
                    },
                  ),

                  // Rating Filter
                  Text(
                    "Min Rating: ⭐ ${_minRating.toStringAsFixed(1)}",
                    style: const TextStyle(fontSize: 14, color: Colors.white70),
                  ),
                  Slider(
                    value: _minRating,
                    min: 1.0,
                    max: 5.0,
                    divisions: 8,
                    activeColor: Colors.indigoAccent,
                    onChanged: (val) {
                      setSheetState(() => _minRating = val);
                      setState(() => _minRating = val);
                    },
                  ),

                  // EV Checkbox
                  SwitchListTile(
                    title: const Text("EV Charger Availability", style: TextStyle(fontSize: 14)),
                    activeColor: Colors.indigoAccent,
                    value: _onlyEV,
                    onChanged: (val) {
                      setSheetState(() => _onlyEV = val);
                      setState(() => _onlyEV = val);
                    },
                  ),
                  const SizedBox(height: 20),

                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      final lat = _currentPosition?.latitude ?? _defaultLocation.latitude;
                      final lng = _currentPosition?.longitude ?? _defaultLocation.longitude;
                      _loadNearbyParking(lat, lng);
                    },
                    child: const Text("Apply Preferences"),
                  )
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final spaceState = ref.watch(spaceProvider);
    final user = ref.watch(authProvider).user;

    // Reactively update markers when nearbySpaces list changes
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _updateMarkers(spaceState.nearbySpaces);
    });

    return Scaffold(
      body: Stack(
        children: [
          // Google Map Background Widget
          kIsWeb
              ? _WebMapFallback(spaces: spaceState.nearbySpaces, onlyEV: _onlyEV)
              : GoogleMap(
                  initialCameraPosition: CameraPosition(
                    target: _currentPosition != null
                        ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
                        : _defaultLocation,
                    zoom: 14,
                  ),
                  onMapCreated: (controller) => _mapController = controller,
                  markers: _markers,
                  myLocationEnabled: true,
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                  mapToolbarEnabled: false,
                ),

          // Floating Glassmorphic Search Header
          Positioned(
            top: 60,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF161E2E).withOpacity(0.85),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.25),
                    blurRadius: 20,
                    offset: const Offset(0, 5),
                  )
                ],
              ),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      // Switch user role (e.g. switch to owner mode)
                      ref.read(authProvider.notifier).switchRole('owner');
                    },
                    child: CircleAvatar(
                      backgroundColor: Colors.indigoAccent,
                      radius: 18,
                      child: Text(
                        user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'D',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Discover Parking Spots",
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          "Nearby search active...",
                          style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.tune_rounded, color: Colors.white70),
                    onPressed: _showFilterSheet,
                  ),
                  IconButton(
                    icon: const Icon(Icons.history_rounded, color: Colors.white70),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const BookingHistoryScreen(),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // AI Engine Status Ribbon
          Positioned(
            top: 135,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.indigoAccent.withOpacity(0.85),
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(color: Colors.indigoAccent.withOpacity(0.2), blurRadius: 10)
                  ]
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.auto_awesome, size: 12, color: Colors.white),
                    const SizedBox(width: 6),
                    Text(
                      "AI Engine: ${spaceState.aiEngine}",
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Horizontally Scrollable Space Listings Drawer
          Positioned(
            bottom: 30,
            left: 0,
            right: 0,
            child: SizedBox(
              height: 180,
              child: spaceState.isLoading
                  ? const Center(
                      child: CircleAvatar(
                        backgroundColor: Color(0xFF161E2E),
                        child: CircularProgressIndicator(color: Colors.indigoAccent),
                      ),
                    )
                  : ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: spaceState.nearbySpaces.length,
                      itemBuilder: (context, index) {
                        final space = spaceState.nearbySpaces[index];
                        if (_onlyEV && !space.hasEVCharger) return const SizedBox.shrink();

                        final aiPercent = ((space.aiScore ?? 0.8) * 100).toInt();

                        return GestureDetector(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (context) => ParkingDetailScreen(spaceId: space.id),
                              ),
                            );
                          },
                          child: Container(
                            width: 280,
                            margin: const EdgeInsets.only(right: 16),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFF161E2E).withOpacity(0.9),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: Colors.white.withOpacity(0.08)),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.3),
                                  blurRadius: 15,
                                  offset: const Offset(0, 5),
                                )
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        space.title,
                                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.indigo.withOpacity(0.3),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.auto_awesome, size: 10, color: Colors.indigoAccent),
                                          const SizedBox(width: 4),
                                          Text(
                                            "$aiPercent% Match",
                                            style: const TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  space.address,
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const Divider(color: Color(0xFF334155), height: 16),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          "₹${space.pricePerHour.toInt()}/hr",
                                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.indigoAccent),
                                        ),
                                        if (space.distance != null)
                                          Text(
                                            "${space.distance!.toStringAsFixed(1)} km away",
                                            style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                                          ),
                                      ],
                                    ),
                                    Row(
                                      children: [
                                        const Icon(Icons.star_rounded, color: Colors.amber, size: 14),
                                        const SizedBox(width: 4),
                                        Text(
                                          space.averageRating.toString(),
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                        ),
                                        const SizedBox(width: 2),
                                        Text(
                                          "(${space.reviewCount})",
                                          style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WebMapFallback extends StatelessWidget {
  final List<SpaceModel> spaces;
  final bool onlyEV;

  const _WebMapFallback({required this.spaces, required this.onlyEV});

  @override
  Widget build(BuildContext context) {
    final visibleSpaces = spaces.where((space) => !onlyEV || space.hasEVCharger).take(6).toList();

    return Container(
      color: const Color(0xFF0F172A),
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _MapGridPainter(),
            ),
          ),
          for (var i = 0; i < visibleSpaces.length; i++)
            Positioned(
              left: 48.0 + (i % 3) * 120.0,
              top: 190.0 + (i ~/ 3) * 96.0,
              child: const Icon(Icons.location_on_rounded, color: Colors.redAccent, size: 34),
            ),
          const Positioned(
            left: 190,
            top: 310,
            child: Icon(Icons.my_location_rounded, color: Colors.indigoAccent, size: 30),
          ),
          const Center(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Color(0xCC161E2E),
                borderRadius: BorderRadius.all(Radius.circular(16)),
              ),
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Text(
                  'Map preview mode',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final roadPaint = Paint()
      ..color = const Color(0xFF263449)
      ..strokeWidth = 18
      ..strokeCap = StrokeCap.round;
    final thinRoadPaint = Paint()
      ..color = const Color(0xFF1E293B)
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    for (double y = 90; y < size.height; y += 130) {
      canvas.drawLine(Offset(-40, y), Offset(size.width + 40, y + 45), roadPaint);
    }
    for (double x = 50; x < size.width; x += 140) {
      canvas.drawLine(Offset(x, -40), Offset(x - 50, size.height + 40), thinRoadPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
