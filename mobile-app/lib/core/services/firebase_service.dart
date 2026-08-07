import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';
import 'auth_service.dart';

class FirebaseService {
  static final FirebaseService _instance = FirebaseService._internal();
  factory FirebaseService() => _instance;
  FirebaseService._internal();

  bool _enabled = false;
  String? _token;

  bool get isEnabled => _enabled;

  Future<void> initPush() async {
    try {
      await Firebase.initializeApp();
      _enabled = true;
    } catch (e) {
      debugPrint('Firebase not configured, push disabled: $e');
      _enabled = false;
      return;
    }

    try {
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission();
      debugPrint('FCM permission: ${settings.authorizationStatus}');

      messaging.onTokenRefresh.listen((newToken) {
        _token = newToken;
        _maybeRegister();
      });

      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('FCM foreground message: ${message.notification?.title}');
      });

      final token = await messaging.getToken();
      if (token != null) {
        _token = token;
        _maybeRegister();
      }
    } catch (e) {
      debugPrint('FCM setup failed: $e');
    }
  }

  Future<void> registerIfAuthenticated() async {
    await _maybeRegister();
  }

  Future<void> _maybeRegister() async {
    if (!_enabled || _token == null) return;
    if (!AuthService().isAuthenticated) {
      debugPrint('Not authenticated yet, deferring FCM token registration');
      return;
    }
    try {
      final api = ApiService();
      await api.sendFcmToken(_token!);
      debugPrint('FCM token registered');
    } catch (e) {
      debugPrint('FCM token registration failed: $e');
    }
  }
}