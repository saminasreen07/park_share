import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

class BookingModel {
  final String id;
  final String spaceId;
  final String spaceTitle;
  final String spaceAddress;
  final double spacePrice;
  final DateTime startTime;
  final DateTime endTime;
  final double totalAmount;
  final String status;
  final String receiptId;
  final String paymentId;

  BookingModel({
    required this.id,
    required this.spaceId,
    required this.spaceTitle,
    required this.spaceAddress,
    required this.spacePrice,
    required this.startTime,
    required this.endTime,
    required this.totalAmount,
    required this.status,
    required this.receiptId,
    required this.paymentId,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    final space = json['spaceId'] as Map<String, dynamic>?;
    final spaceId = space != null ? space['_id'] ?? '' : '';
    final spaceTitle = space != null ? space['title'] ?? 'Parking spot' : 'Parking spot';
    final spaceAddress = space != null ? space['address'] ?? '' : '';
    final spacePrice = space != null ? (space['pricePerHour'] ?? 0.0).toDouble() : 0.0;

    return BookingModel(
      id: json['_id'] ?? '',
      spaceId: spaceId,
      spaceTitle: spaceTitle,
      spaceAddress: spaceAddress,
      spacePrice: spacePrice,
      startTime: DateTime.parse(json['startTime']),
      endTime: DateTime.parse(json['endTime']),
      totalAmount: (json['totalAmount'] ?? 0.0).toDouble(),
      status: json['status'] ?? 'pending',
      receiptId: json['receiptId'] ?? '',
      paymentId: json['paymentId'] ?? '',
    );
  }
}

class BookingState {
  final List<BookingModel> driverBookings;
  final List<BookingModel> ownerBookings;
  final BookingModel? currentBooking;
  final bool isLoading;
  final String? errorMessage;

  BookingState({
    this.driverBookings = const [],
    this.ownerBookings = const [],
    this.currentBooking,
    this.isLoading = false,
    this.errorMessage,
  });

  BookingState copyWith({
    List<BookingModel>? driverBookings,
    List<BookingModel>? ownerBookings,
    BookingModel? currentBooking,
    bool? isLoading,
    String? errorMessage,
    bool clearCurrentBooking = false,
  }) {
    return BookingState(
      driverBookings: driverBookings ?? this.driverBookings,
      ownerBookings: ownerBookings ?? this.ownerBookings,
      currentBooking: clearCurrentBooking ? null : (currentBooking ?? this.currentBooking),
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class BookingNotifier extends StateNotifier<BookingState> {
  final ApiClient _apiClient = ApiClient();

  BookingNotifier() : super(BookingState());

  // Fetch bookings for the logged-in Driver
  Future<void> fetchUserBookings() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiClient.get('/bookings/user');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final List data = body['data'] ?? [];
          final bookings = data.map((json) => BookingModel.fromJson(json)).toList();
          state = state.copyWith(driverBookings: bookings, isLoading: false);
          return;
        }
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to retrieve bookings list');
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  // Fetch bookings received on the Owner's spaces
  Future<void> fetchOwnerBookings() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiClient.get('/bookings/owner');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final List data = body['data'] ?? [];
          final bookings = data.map((json) => BookingModel.fromJson(json)).toList();
          state = state.copyWith(ownerBookings: bookings, isLoading: false);
          return;
        }
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to retrieve owner bookings');
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  // Create booking draft
  Future<BookingModel?> createBookingDraft({
    required String spaceId,
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiClient.post('/bookings', {
        'spaceId': spaceId,
        'startTime': startTime.toIso8601String(),
        'endTime': endTime.toIso8601String(),
      });

      if (response.statusCode == 201) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final booking = BookingModel.fromJson(body['data']);
          state = state.copyWith(currentBooking: booking, isLoading: false);
          return booking;
        }
      }
      final body = jsonDecode(response.body);
      state = state.copyWith(isLoading: false, errorMessage: body['message'] ?? 'Booking conflicted');
      return null;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return null;
    }
  }

  // Fetch Razorpay Order Info
  Future<Map<String, dynamic>?> generatePaymentOrder(String bookingId) async {
    try {
      final response = await _apiClient.post('/payments/order', {'bookingId': bookingId});
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          return body['data'] as Map<String, dynamic>;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Verify payment on backend
  Future<bool> verifyPayment({
    required String bookingId,
    required String razorpayPaymentId,
    required String razorpayOrderId,
    required String razorpaySignature,
    String paymentMethod = 'UPI',
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _apiClient.post('/payments/verify', {
        'bookingId': bookingId,
        'razorpay_payment_id': razorpayPaymentId,
        'razorpay_order_id': razorpayOrderId,
        'razorpay_signature': razorpaySignature,
        'paymentMethod': paymentMethod,
      });

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          await fetchUserBookings(); // Refresh user bookings list
          state = state.copyWith(isLoading: false);
          return true;
        }
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Payment verification failed');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  // Cancel reservation
  Future<bool> cancelBooking(String bookingId) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _apiClient.post('/bookings/$bookingId/cancel', {});
      if (response.statusCode == 200) {
        fetchUserBookings();
        return true;
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to cancel reservation');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  // Submit Feedback / Reviews
  Future<bool> submitReview({
    required String bookingId,
    required int rating,
    required String comment,
  }) async {
    try {
      final response = await _apiClient.post('/reviews', {
        'bookingId': bookingId,
        'rating': rating,
        'comment': comment,
      });

      return response.statusCode == 201;
    } catch (e) {
      return false;
    }
  }
}

final bookingProvider = StateNotifierProvider<BookingNotifier, BookingState>((ref) {
  return BookingNotifier();
});
