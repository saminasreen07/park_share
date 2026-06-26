import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../../parking/providers/space_provider.dart';

class AddSpaceScreen extends ConsumerStatefulWidget {
  const AddSpaceScreen({super.key});

  @override
  ConsumerState<AddSpaceScreen> createState() => _AddSpaceScreenState();
}

class _AddSpaceScreenState extends ConsumerState<AddSpaceScreen> {
  final _formKey = GlobalKey<FormState>();
  
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _addressController = TextEditingController();
  final _priceController = TextEditingController();
  final _slotsController = TextEditingController(text: "1");
  final _latController = TextEditingController(text: "12.972"); // Default Bangalore Lat
  final _lngController = TextEditingController(text: "77.595"); // Default Bangalore Lng

  // Features checkboxes
  bool _hasEV = false;
  bool _hasCCTV = false;
  bool _isCovered = false;
  bool _isSecurity = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _addressController.dispose();
    _priceController.dispose();
    _slotsController.dispose();
    _latController.dispose();
    _lngController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_formKey.currentState!.validate()) {
      final ok = await ref.read(spaceProvider.notifier).addParkingSpace(
        title: _titleController.text,
        description: _descController.text,
        address: _addressController.text,
        latitude: double.parse(_latController.text),
        longitude: double.parse(_lngController.text),
        pricePerHour: double.parse(_priceController.text),
        totalSlots: int.parse(_slotsController.text),
        hasEVCharger: _hasEV,
        hasCCTV: _hasCCTV,
        isCovered: _isCovered,
        isSecurityGuarded: _isSecurity,
      );

      if (mounted) {
        if (ok) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Parking space listed successfully!"), backgroundColor: Colors.green),
          );
          Navigator.of(context).pop();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(ref.read(spaceProvider).errorMessage ?? "Error listing space"),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final spaceState = ref.watch(spaceProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text("List a Parking Space", style: TextStyle(fontWeight: FontWeight.bold)),
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
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  "Configure Parking Details",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Fill out the locations and pricing parameters to list your spot.",
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
                const SizedBox(height: 24),

                // Space Title
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    hintText: "Listing Title (e.g. Secured Garage)",
                  ),
                  validator: (value) => value == null || value.isEmpty ? "Title is required" : null,
                ),
                const SizedBox(height: 16),

                // Description
                TextFormField(
                  controller: _descController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    hintText: "Description (details about gate codes, access keys...)",
                  ),
                ),
                const SizedBox(height: 16),

                // Address
                TextFormField(
                  controller: _addressController,
                  decoration: const InputDecoration(
                    hintText: "Physical Address location",
                  ),
                  validator: (value) => value == null || value.isEmpty ? "Address is required" : null,
                ),
                const SizedBox(height: 16),

                // Price and Slots row
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _priceController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: "Price per Hour (₹)",
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) return "Price is required";
                          if (double.tryParse(value) == null) return "Enter valid number";
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        controller: _slotsController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: "Total Slots Available",
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) return "Slots is required";
                          if (int.tryParse(value) == null) return "Enter valid integer";
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Coordinates Row
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _latController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: "Latitude coordinate",
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        controller: _lngController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: "Longitude coordinate",
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),

                // Amenities Checks
                const Text("Select Spot Features", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                
                CheckboxListTile(
                  title: const Text("EV Charging Port available", style: TextStyle(fontSize: 13)),
                  activeColor: Colors.indigoAccent,
                  value: _hasEV,
                  onChanged: (val) => setState(() => _hasEV = val ?? false),
                ),
                CheckboxListTile(
                  title: const Text("CCTV Monitoring Protected", style: TextStyle(fontSize: 13)),
                  activeColor: Colors.indigoAccent,
                  value: _hasCCTV,
                  onChanged: (val) => setState(() => _hasCCTV = val ?? false),
                ),
                CheckboxListTile(
                  title: const Text("Covered Garage/Basement spot", style: TextStyle(fontSize: 13)),
                  activeColor: Colors.indigoAccent,
                  value: _isCovered,
                  onChanged: (val) => setState(() => _isCovered = val ?? false),
                ),
                CheckboxListTile(
                  title: const Text("Physical Guard / Gate code protected", style: TextStyle(fontSize: 13)),
                  activeColor: Colors.indigoAccent,
                  value: _isSecurity,
                  onChanged: (val) => setState(() => _isSecurity = val ?? false),
                ),
                const SizedBox(height: 32),

                spaceState.isLoading
                    ? const Center(child: SpinKitRing(color: Colors.indigo, size: 36))
                    : ElevatedButton(
                        onPressed: _handleSubmit,
                        child: const Text("Submit Listing Request"),
                      ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
