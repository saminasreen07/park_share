import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

class TicketMessageModel {
  final String senderId;
  final String message;
  final DateTime timestamp;

  TicketMessageModel({
    required this.senderId,
    required this.message,
    required this.timestamp,
  });

  factory TicketMessageModel.fromJson(Map<String, dynamic> json) {
    return TicketMessageModel(
      senderId: json['senderId'] ?? '',
      message: json['message'] ?? '',
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
    );
  }
}

class TicketModel {
  final String id;
  final String ticketId;
  final String userId;
  final String? bookingId;
  final String category;
  final String subject;
  final String description;
  final String status;
  final String priority;
  final List<TicketMessageModel> messages;
  final DateTime createdAt;

  TicketModel({
    required this.id,
    required this.ticketId,
    required this.userId,
    this.bookingId,
    required this.category,
    required this.subject,
    required this.description,
    required this.status,
    required this.priority,
    required this.messages,
    required this.createdAt,
  });

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    var msgsJson = json['messages'] as List? ?? [];
    List<TicketMessageModel> msgsList = msgsJson
        .map((m) => TicketMessageModel.fromJson(m as Map<String, dynamic>))
        .toList();

    return TicketModel(
      id: json['_id'] ?? '',
      ticketId: json['ticketId'] ?? '',
      userId: json['userId'] is Map ? (json['userId']['_id'] ?? '') : (json['userId'] ?? ''),
      bookingId: json['bookingId'] is Map ? (json['bookingId']['_id'] ?? '') : (json['bookingId'] ?? ''),
      category: json['category'] ?? 'general',
      subject: json['subject'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'open',
      priority: json['priority'] ?? 'medium',
      messages: msgsList,
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
    );
  }
}

class TicketState {
  final List<TicketModel> tickets;
  final bool isLoading;
  final String? errorMessage;

  TicketState({
    this.tickets = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  TicketState copyWith({
    List<TicketModel>? tickets,
    bool? isLoading,
    String? errorMessage,
  }) {
    return TicketState(
      tickets: tickets ?? this.tickets,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class TicketNotifier extends StateNotifier<TicketState> {
  final ApiClient _apiClient = ApiClient();

  TicketNotifier() : super(TicketState());

  // Fetch all support tickets for the current user
  Future<void> fetchTickets() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiClient.get('/tickets');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final List data = body['data'] ?? [];
          final ticketsList = data.map((t) => TicketModel.fromJson(t)).toList();
          state = state.copyWith(tickets: ticketsList, isLoading: false);
          return;
        }
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to retrieve support tickets');
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  // Create a new support ticket
  Future<TicketModel?> createTicket({
    required String category,
    required String subject,
    required String description,
    String? bookingId,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final payload = {
        'category': category,
        'subject': subject,
        'description': description,
      };
      if (bookingId != null) {
        payload['bookingId'] = bookingId;
      }

      final response = await _apiClient.post('/tickets', payload);
      if (response.statusCode == 201) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final newTicket = TicketModel.fromJson(body['data']);
          state = state.copyWith(
            tickets: [newTicket, ...state.tickets],
            isLoading: false,
          );
          return newTicket;
        }
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to create support ticket');
      return null;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return null;
    }
  }

  // Add a reply message to a support ticket
  Future<bool> replyToTicket(String ticketId, String message) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiClient.post('/tickets/$ticketId/reply', {'message': message});
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final updatedTicket = TicketModel.fromJson(body['data']);
          state = state.copyWith(
            tickets: state.tickets.map((t) => t.ticketId == ticketId ? updatedTicket : t).toList(),
            isLoading: false,
          );
          return true;
        }
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to send reply');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }
}

final ticketProvider = StateNotifierProvider<TicketNotifier, TicketState>((ref) {
  return TicketNotifier();
});
