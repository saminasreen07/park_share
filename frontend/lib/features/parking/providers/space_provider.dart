import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

class SpaceModel {
  final String id;
  final String title;
  final String description;
  final String address;
  final double pricePerHour;
  final double latitude;
  final double longitude;
  final double averageRating;
  final int reviewCount;
  final String status;
  final String ownerName;
  final String ownerPhone;
  final bool hasEVCharger;
  final bool hasCCTV;
  final bool isCovered;
  final bool isSecurityGuarded;
  final List<String> images;
  final double? distance;
  final double? aiScore;

  SpaceModel({
    required this.id,
    required this.title,
    required this.description,
    required this.address,
    required this.pricePerHour,
    required this.latitude,
    required this.longitude,
    required this.averageRating,
    required this.reviewCount,
    required this.status,
    required this.ownerName,
    required this.ownerPhone,
    required this.hasEVCharger,
    required this.hasCCTV,
    required this.isCovered,
    required this.isSecurityGuarded,
    required this.images,
    this.distance,
    this.aiScore,
  });

  factory SpaceModel.fromJson(Map<String, dynamic> json) {
    // GeoJSON Point parsing
    final location = json['location'] as Map<String, dynamic>?;
    final coords = location != null ? location['coordinates'] as List<dynamic>? : null;
    final double lng = coords != null && coords.isNotEmpty ? (coords[0] as num).toDouble() : 0.0;
    final double lat = coords != null && coords.length > 1 ? (coords[1] as num).toDouble() : 0.0;

    final owner = json['ownerId'] as Map<String, dynamic>?;
    final ownerName = owner != null ? owner['name'] ?? '' : '';
    final ownerPhone = owner != null ? owner['phone'] ?? '' : '';

    final features = json['features'] as Map<String, dynamic>?;
    final hasEVCharger = features != null ? features['hasEVCharger'] ?? false : false;
    final hasCCTV = features != null ? features['hasCCTV'] ?? false : false;
    final isCovered = features != null ? features['isCovered'] ?? false : false;
    final isSecurityGuarded = features != null ? features['isSecurityGuarded'] ?? false : false;

    final imagesList = json['images'] != null
        ? List<String>.from(json['images'].map((item) => item.toString()))
        : <String>[];

    return SpaceModel(
      id: json['_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      address: json['address'] ?? '',
      pricePerHour: (json['pricePerHour'] ?? 0.0).toDouble(),
      latitude: lat,
      longitude: lng,
      averageRating: (json['averageRating'] ?? 0.0).toDouble(),
      reviewCount: json['reviewCount'] ?? 0,
      status: json['status'] ?? 'pending',
      ownerName: ownerName,
      ownerPhone: ownerPhone,
      hasEVCharger: hasEVCharger,
      hasCCTV: hasCCTV,
      isCovered: isCovered,
      isSecurityGuarded: isSecurityGuarded,
      images: imagesList,
      distance: json['distance'] != null ? (json['distance'] as num).toDouble() : null,
      aiScore: json['aiScore'] != null ? (json['aiScore'] as num).toDouble() : null,
    );
  }
}

class SpaceState {
  final List<SpaceModel> nearbySpaces;
  final List<SpaceModel> ownerSpaces;
  final SpaceModel? selectedSpace;
  final bool isLoading;
  final String? errorMessage;
  final String aiEngine;

  SpaceState({
    this.nearbySpaces = const [],
    this.ownerSpaces = const [],
    this.selectedSpace,
    this.isLoading = false,
    this.errorMessage,
    this.aiEngine = 'None',
  });

  SpaceState copyWith({
    List<SpaceModel>? nearbySpaces,
    List<SpaceModel>? ownerSpaces,
    SpaceModel? selectedSpace,
    bool? isLoading,
    String? errorMessage,
    String? aiEngine,
  }) {
    return SpaceState(
      nearbySpaces: nearbySpaces ?? this.nearbySpaces,
      ownerSpaces: ownerSpaces ?? this.ownerSpaces,
      selectedSpace: selectedSpace ?? this.selectedSpace,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      aiEngine: aiEngine ?? this.aiEngine,
    );
  }
}

class SpaceNotifier extends StateNotifier<SpaceState> {
  final ApiClient _apiClient = ApiClient();

  SpaceNotifier() : super(SpaceState());

  // Fetch spaces near a GPS coordinate
  Future<void> fetchNearbySpaces({
    required double latitude,
    required double longitude,
    double maxDistance = 10000,
    double? budget,
    double? minRating,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final queryParams = StringBuffer();
      queryParams.write('?latitude=$latitude&longitude=$longitude&maxDistance=$maxDistance');
      if (budget != null) queryParams.write('&budget=$budget');
      if (minRating != null) queryParams.write('&rating=$minRating');

      final response = await _apiClient.get('/spaces/nearby${queryParams.toString()}');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final List data = body['data'] ?? [];
          final spaces = data.map((json) => SpaceModel.fromJson(json)).toList();
          state = state.copyWith(
            nearbySpaces: spaces,
            aiEngine: body['aiEngine'] ?? 'Local Formula',
            isLoading: false,
          );
          return;
        }
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to fetch spaces');
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  // Fetch single space details
  Future<void> fetchSpaceDetails(String id) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiClient.get('/spaces/$id');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final space = SpaceModel.fromJson(body['data']);
          state = state.copyWith(selectedSpace: space, isLoading: false);
          return;
        }
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Space details not found');
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  // Fetch owner's spaces list
  Future<void> fetchOwnerSpaces() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiClient.get('/spaces/owner');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final List data = body['data'] ?? [];
          final spaces = data.map((json) => SpaceModel.fromJson(json)).toList();
          state = state.copyWith(ownerSpaces: spaces, isLoading: false);
          return;
        }
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to fetch your listings');
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  // Owner listings registration
  Future<bool> addParkingSpace({
    required String title,
    required String description,
    required String address,
    required double latitude,
    required double longitude,
    required double pricePerHour,
    required int totalSlots,
    required bool hasEVCharger,
    required bool hasCCTV,
    required bool isCovered,
    required bool isSecurityGuarded,
    List<String> images = const [],
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _apiClient.post('/spaces', {
        'title': title,
        'description': description,
        'address': address,
        'latitude': latitude,
        'longitude': longitude,
        'pricePerHour': pricePerHour,
        'totalSlots': totalSlots,
        'features': {
          'hasEVCharger': hasEVCharger,
          'hasCCTV': hasCCTV,
          'isCovered': isCovered,
          'isSecurityGuarded': isSecurityGuarded,
        },
        'images': images,
      });

      if (response.statusCode == 201) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          fetchOwnerSpaces(); // Refresh owner list
          return true;
        }
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to create space listing');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }
}

final spaceProvider = StateNotifierProvider<SpaceNotifier, SpaceState>((ref) {
  return SpaceNotifier();
});
