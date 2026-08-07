import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import 'firebase_service.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  String? _token;
  Map<String, dynamic>? _user;
  bool _initialized = false;

  bool get isAuthenticated => _token != null && _user != null;
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  String? get userId => _user?['id'];
  String? get userType => _user?['userType'];
  String? get schoolId => _user?['schoolId'];
  String? get userName => _user?['name'];

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    final userJson = prefs.getString('auth_user');

    if (_token != null && userJson != null) {
      try {
        final decoded = jsonDecode(userJson);
        if (decoded is Map<String, dynamic>) {
          _user = decoded;
        } else {
          throw const FormatException('Invalid user data');
        }
        final api = ApiService();
        await api.setToken(_token!);
      } catch (e) {
        _token = null;
        _user = null;
        await prefs.remove('auth_token');
        await prefs.remove('auth_user');
      }
    }
  }

  Future<String?> sendOtp(String phone) async {
    try {
      final api = ApiService();
      final response = await api.sendOtp(phone);
      debugPrint('Send OTP response status: ${response.statusCode}');
      if (response.statusCode == 200 || response.statusCode == 201) {
        return null;
      }
      return 'Server responded with status ${response.statusCode}';
    } catch (e) {
      debugPrint('Send OTP error: $e');
      return 'Network error: $e';
    }
  }

  Future<bool> verifyOtp(String phone) async {
    try {
      final api = ApiService();
      debugPrint('Calling verifyOtp for phone: $phone');
      final response = await api.verifyOtp(phone);
      debugPrint('Verify OTP response status: ${response.statusCode}');
      debugPrint('Verify OTP response data: ${response.data}');
      if (response.statusCode == 200) {
        final data = response.data['data'];
        _token = data['token'];
        _user = Map<String, dynamic>.from(data['user']);
        await api.setToken(_token!);
        await _persistAuth();
        await FirebaseService().registerIfAuthenticated();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Verify OTP error: $e');
      return false;
    }
  }

  Future<void> _persistAuth() async {
    final prefs = await SharedPreferences.getInstance();
    if (_token != null) {
      await prefs.setString('auth_token', _token!);
    }
    if (_user != null) {
      await prefs.setString('auth_user', jsonEncode(_user));
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('auth_user');
    final api = ApiService();
    await api.clearToken();
  }
}
