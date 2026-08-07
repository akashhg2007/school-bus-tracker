import 'dart:async';
import '../models/notification_model.dart';
import 'socket_service.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  final List<AppNotification> _cache = [];
  List<AppNotification> get cached => List.unmodifiable(_cache);

  StreamSubscription? _sub;

  final StreamController<AppNotification> _streamController =
      StreamController<AppNotification>.broadcast();
  Stream<AppNotification> get notifications => _streamController.stream;

  Future<void> initialize() async {
    if (_isInitialized) return;
    _isInitialized = true;

    final socket = SocketService();
    _sub = socket.notificationStream.listen((data) {
      final Map<String, dynamic> json;
      try {
        json = Map<String, dynamic>.from(data);
      } catch (_) {
        return;
      }
      final AppNotification notification;
      try {
        notification = AppNotification.fromJson(json);
      } catch (_) {
        return;
      }

      _cache.insert(0, notification);
      if (_cache.length > 100) {
        _cache.removeRange(100, _cache.length);
      }
      if (!_streamController.isClosed) {
        _streamController.add(notification);
      }
    });
    socket.subscribeNotifications();
  }

  void dispose() {
    _sub?.cancel();
    _sub = null;
    if (!_streamController.isClosed) {
      _streamController.close();
    }
  }
}