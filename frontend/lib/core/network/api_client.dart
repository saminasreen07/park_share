import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'dart:io' show Platform;

class ApiClient {
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api';
    }
    // For Android emulator, use 10.0.2.2. For physical devices on same WiFi, replace this with your machine's IP (e.g. 192.168.1.X)
    return Platform.isAndroid ? 'http://10.153.175.206:5000/api' : 'http://localhost:5000/api';
  }

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token') ?? '';
    
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<http.Response> get(String path) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$baseUrl$path');
    try {
      return await http.get(url, headers: headers).timeout(const Duration(seconds: 15));
    } catch (e) {
      throw Exception('Network error: Check if backend API server is online');
    }
  }

  Future<http.Response> post(String path, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$baseUrl$path');
    try {
      return await http.post(
        url,
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 15));
    } catch (e) {
      throw Exception('Network error: Check if backend API server is online');
    }
  }

  Future<http.Response> put(String path, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$baseUrl$path');
    try {
      return await http.put(
        url,
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 15));
    } catch (e) {
      throw Exception('Network error: Check if backend API server is online');
    }
  }

  Future<http.Response> patch(String path, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$baseUrl$path');
    try {
      return await http.patch(
        url,
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 15));
    } catch (e) {
      throw Exception('Network error: Check if backend API server is online');
    }
  }

  Future<http.Response> delete(String path) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$baseUrl$path');
    try {
      return await http.delete(url, headers: headers).timeout(const Duration(seconds: 15));
    } catch (e) {
      throw Exception('Network error: Check if backend API server is online');
    }
  }
}
