import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../providers/booking_provider.dart';
import 'receipt_screen.dart';

class NavigationScreen extends ConsumerStatefulWidget {
  final String bookingId;

  const NavigationScreen({super.key, required this.bookingId});

  @override
  ConsumerState<NavigationScreen> createState() => _NavigationScreenState();
}

class _NavigationScreenState extends ConsumerState<NavigationScreen> {
  GoogleMapController? _mapController;
  Timer? _timer;
  
  // Navigation Simulation States
  double _distanceLeft = 2.8; // km
  int _etaMinutes = 9;
  int _currentStepIndex = 0;
  LatLng _driverPosition = const LatLng(12.9680, 77.5900); // Start coordinates

  final List<String> _navigationInstructions = [
    "Head north on Park Road toward Main St",
    "Turn right onto Main St after 800m",
    "In 1.2km, turn left onto Host Lane",
    "Arrived! Your reserved parking spot is on the left",
  ];

  @override
  void initState() {
    super.initState();
    _startNavigationSimulation();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startNavigationSimulation() {
    // Timer updates position and instructions every 6 seconds to simulate driving
    _timer = Timer.periodic(const Duration(seconds: 6), (timer) {
      if (!mounted) return;

      setState(() {
        if (_distanceLeft > 0.2) {
          _distanceLeft -= 0.6;
          _etaMinutes = (_distanceLeft * 3.5).round();
          if (_currentStepIndex < _navigationInstructions.length - 1) {
            _currentStepIndex++;
          }
          // Shift coordinates closer to Bangalore standard coordinates
          _driverPosition = LatLng(
            _driverPosition.latitude + 0.002,
            _driverPosition.longitude + 0.001,
          );
          _animateToPosition(_driverPosition);
        } else {
          _distanceLeft = 0.0;
          _etaMinutes = 0;
          _currentStepIndex = _navigationInstructions.length - 1;
          timer.cancel();
        }
      });
    });
  }

  void _animateToPosition(LatLng target) {
    if (kIsWeb) return;

    _mapController?.animateCamera(
      CameraUpdate.newLatLng(target),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingList = ref.watch(bookingProvider).driverBookings;
    final booking = bookingList.firstWhere((b) => b.id == widget.bookingId);

    // Destination target coordinates
    const destination = LatLng(12.9716, 77.5946); 

    final Set<Marker> markers = {
      Marker(
        markerId: const MarkerId('driver'),
        position: _driverPosition,
        infoWindow: const InfoWindow(title: 'You (Simulated)'),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
      ),
      Marker(
        markerId: const MarkerId('destination'),
        position: destination,
        infoWindow: InfoWindow(title: booking.spaceTitle, snippet: 'Reserved Slot'),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
      ),
    };

    final Set<Polyline> polylines = {
      Polyline(
        polylineId: const PolylineId('route'),
        points: [_driverPosition, destination],
        color: Colors.indigoAccent,
        width: 5,
      ),
    };

    return Scaffold(
      body: Stack(
        children: [
          // Google Map representation
          kIsWeb
              ? _WebNavigationFallback(
                  distanceLeft: _distanceLeft,
                  etaMinutes: _etaMinutes,
                )
              : GoogleMap(
                  initialCameraPosition: CameraPosition(target: _driverPosition, zoom: 15),
                  onMapCreated: (controller) => _mapController = controller,
                  markers: markers,
                  polylines: polylines,
                  zoomControlsEnabled: false,
                ),

          // Top Header Instruction Card
          Positioned(
            top: 50,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF161E2E).withValues(alpha: 0.9),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              child: Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: Colors.indigoAccent,
                    child: Icon(Icons.navigation_rounded, color: Colors.white),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "NEXT DIRECTION INSTRUCTION",
                          style: TextStyle(color: Color(0xFF64748B), fontSize: 9, letterSpacing: 0.5),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _navigationInstructions[_currentStepIndex],
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ),
          ),

          // Bottom ETA / Status controls panel
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              decoration: BoxDecoration(
                color: const Color(0xFF161E2E),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _etaMinutes > 0 ? "$_etaMinutes min" : "Arrived",
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: _etaMinutes > 0 ? Colors.indigoAccent : Colors.greenAccent,
                            ),
                          ),
                          Text(
                            "$_distanceLeft km left • Destination: ${booking.spaceTitle}",
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const CircleAvatar(
                          backgroundColor: Colors.redAccent,
                          radius: 20,
                          child: Icon(Icons.close_rounded, color: Colors.white),
                        ),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pushReplacement(
                        MaterialPageRoute(
                          builder: (context) => ReceiptScreen(bookingId: booking.id),
                        ),
                      );
                    },
                    child: const Text("View Booking Invoice QR"),
                  )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WebNavigationFallback extends StatelessWidget {
  final double distanceLeft;
  final int etaMinutes;

  const _WebNavigationFallback({
    required this.distanceLeft,
    required this.etaMinutes,
  });

  @override
  Widget build(BuildContext context) {
    final progress = etaMinutes == 0 ? 1.0 : (1 - (distanceLeft / 2.8)).clamp(0.0, 1.0);

    return Container(
      color: const Color(0xFF0F172A),
      child: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: _RoutePreviewPainter(progress: progress))),
          const Positioned(
            left: 70,
            top: 220,
            child: Icon(Icons.navigation_rounded, color: Colors.indigoAccent, size: 34),
          ),
          const Positioned(
            right: 78,
            bottom: 250,
            child: Icon(Icons.local_parking_rounded, color: Colors.greenAccent, size: 36),
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
                  'Navigation preview mode',
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

class _RoutePreviewPainter extends CustomPainter {
  final double progress;

  _RoutePreviewPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final roadPaint = Paint()
      ..color = const Color(0xFF263449)
      ..strokeWidth = 20
      ..strokeCap = StrokeCap.round;
    final routePaint = Paint()
      ..color = Colors.indigoAccent
      ..strokeWidth = 7
      ..strokeCap = StrokeCap.round;

    final route = Path()
      ..moveTo(86, 240)
      ..quadraticBezierTo(size.width * 0.45, size.height * 0.35, size.width - 96, size.height - 270);
    canvas.drawPath(route, roadPaint);

    final metric = route.computeMetrics().first;
    canvas.drawPath(metric.extractPath(0, metric.length * progress), routePaint);
  }

  @override
  bool shouldRepaint(covariant _RoutePreviewPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
