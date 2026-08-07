import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_service.dart';
import 'firebase_service.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
  );

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

    try {
      _token = await _secureStorage.read(key: 'auth_token');
      final userJson = await _secureStorage.read(key: 'auth_user');

      if (_token != null && userJson != null) {
        final decoded = jsonDecode(userJson);
        if (decoded is Map<String, dynamic>) {
          _user = decoded;
        } else {
          throw const FormatException('Invalid user data');
        }
        final api = ApiService();
        await api.setToken(_token!);
      }
    } catch (e) {
      _token = null;
      _user = null;
      await _secureStorage.delete(key: 'auth_token');
      await _secureStorage.delete(key: 'auth_user');
    }
  }

  Future<String?> sendOtp(String phone) async {
    try {
      final api = ApiService();
      final response = await api.sendOtp(phone);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return null;
      }
      return 'Server error (${response.statusCode}). Please try again.';
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('timeout') || msg.contains('Timeout')) {
        return 'Server is waking up. Please wait a moment and try again.';
      }
      if (msg.contains('Connection refused') || msg.contains('SocketException')) {
        return 'Cannot reach server. Check your internet connection.';
      }
      return 'Network error. Please check your connection and try again.';
    }
  }

  Future<bool> verifyOtp(String phone) async {
    try {
      final api = ApiService();
      final response = await api.verifyOtp(phone);
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
      if (kDebugMode) {
        debugPrint('Verify OTP error: $e');
      }
      return false;
    }
  }

  Future<String?> loginWithPassword(String identifier, String password) async {
    try {
      final api = ApiService();
      final response = await api.loginWithPassword(identifier, password);
      if (response.statusCode == 200) {
        final data = response.data['data'];
        _token = data['token'];
        _user = Map<String, dynamic>.from(data['user']);
        await api.setToken(_token!);
        await _persistAuth();
        await FirebaseService().registerIfAuthenticated();
        return null;
      }
      return 'Login failed. Please try again.';
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('timeout') || msg.contains('Timeout')) {
        return 'Server is waking up. Please wait a moment and try again.';
      }
      if (msg.contains('Connection refused') || msg.contains('SocketException')) {
        return 'Cannot reach server. Check your internet connection.';
      }
      if (msg.contains('401') || msg.contains('Invalid credentials')) {
        return 'Invalid email/phone or password.';
      }
      if (msg.contains('404') || msg.contains('not found')) {
        return 'No account found with this email or phone number.';
      }
      return 'Network error. Please check your connection and try again.';
    }
  }

  Future<String?> activateAccount(String token, String password) async {
    try {
      final api = ApiService();
      final response = await api.activateAccount(token, password);
      if (response.statusCode == 200) {
        return null;
      }
      return 'Activation failed. Please try again.';
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('expired')) {
        return 'Activation link has expired. Please request a new one.';
      }
      return 'Network error. Please check your connection and try again.';
    }
  }

  Future<void> _persistAuth() async {
    if (_token != null) {
      await _secureStorage.write(key: 'auth_token', value: _token!);
    }
    if (_user != null) {
      await _secureStorage.write(key: 'auth_user', value: jsonEncode(_user));
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    await _secureStorage.delete(key: 'auth_token');
    await _secureStorage.delete(key: 'auth_user');
    final api = ApiService();
    await api.clearToken();
  }
}
