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
      NotificationSettings settings = await messaging.requestPermission();
      debugPrint('FCM permission: ${settings.authorizationStatus}');

      final token = await messaging.getToken();
      debugPrint('FCM token obtained: ${token != null}');
      _registerToken(token);

      messaging.onTokenRefresh.listen((newToken) => _registerToken(newToken));
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('FCM foreground message: ${message.notification?.title}');
      });
    } catch (e) {
      debugPrint('FCM setup failed: $e');
    }
  }

  Future<void> _registerToken(String? token) async {
    if (token == null) return;
    try {
      final api = ApiService();
      await api.sendFcmToken(token);
      debugPrint('FCM token registered');
    } catch (e) {
      debugPrint('FCM token registration skipped: $e');
    }
  }
}