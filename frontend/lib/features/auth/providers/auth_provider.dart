import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/network/api_client.dart';

class UserModel {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String role;
  final bool isVerified;
  final double rating;
  final String avatar;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    required this.isVerified,
    required this.rating,
    required this.avatar,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? 'driver',
      isVerified: json['isVerified'] ?? false,
      rating: (json['rating'] ?? 5.0).toDouble(),
      avatar: json['avatar'] ?? '',
    );
  }

  UserModel copyWith({
    String? id,
    String? name,
    String? email,
    String? phone,
    String? role,
    bool? isVerified,
    double? rating,
    String? avatar,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      isVerified: isVerified ?? this.isVerified,
      rating: rating ?? this.rating,
      avatar: avatar ?? this.avatar,
    );
  }
}

class AuthState {
  final UserModel? user;
  final bool isLoading;
  final String? errorMessage;

  AuthState({
    this.user,
    this.isLoading = false,
    this.errorMessage,
  });

  AuthState copyWith({
    UserModel? user,
    bool? isLoading,
    String? errorMessage,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient = ApiClient();

  AuthNotifier() : super(AuthState()) {
    checkAuthStatus();
  }

  // Verify stored token on startup
  Future<void> checkAuthStatus() async {
    state = state.copyWith(isLoading: true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token') ?? '';

      if (token.isEmpty) {
        state = state.copyWith(isLoading: false);
        return;
      }

      final response = await _apiClient.get('/auth/me');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final user = UserModel.fromJson(body['data']);
          state = AuthState(user: user);
          return;
        }
      }
      // If verification failed, clear state
      prefs.remove('auth_token');
      state = AuthState();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Connection lost. Backend API might be offline.',
      );
    }
  }

  // Firebase / Simulated OTP Login
  Future<bool> login(String token, String roleSelection) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Store the token (either mock- or real Firebase ID Token)
      await prefs.setString('auth_token', token);

      // Call getCurrentUser profile
      final response = await _apiClient.get('/auth/me');
      
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final user = UserModel.fromJson(body['data']);
          
          // Switch role if selected role doesn't match db role
          if (user.role != roleSelection) {
            await switchRole(roleSelection);
          } else {
            state = AuthState(user: user);
          }
          return true;
        }
      }
      
      // If it failed, clear the auth token
      await prefs.remove('auth_token');
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to retrieve profile');
      return false;
    } catch (e) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('auth_token');
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  // Switch role driver <-> owner
  Future<bool> switchRole(String targetRole) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _apiClient.post('/auth/register-role', {'role': targetRole});
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final updatedUser = UserModel.fromJson(body['data']);
          state = AuthState(user: updatedUser);
          return true;
        }
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to toggle account profile');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  // Sign out
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    state = AuthState();
  }
}

// Provider definitions
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
