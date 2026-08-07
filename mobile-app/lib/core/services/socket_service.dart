import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/app_config.dart';
import 'auth_service.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  String? _currentBusId;
  String? _currentSchoolId;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 10;

  final StreamController<Map<String, dynamic>> _locationController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _tripController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _attendanceController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _emergencyController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _notificationController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _approachingStopController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get locationStream => _locationController.stream;
  Stream<Map<String, dynamic>> get tripStream => _tripController.stream;
  Stream<Map<String, dynamic>> get attendanceStream => _attendanceController.stream;
  Stream<Map<String, dynamic>> get emergencyStream => _emergencyController.stream;
  Stream<Map<String, dynamic>> get notificationStream => _notificationController.stream;
  Stream<Map<String, dynamic>> get approachingStopStream => _approachingStopController.stream;

  bool get isConnected => _isConnected;

  void connect() {
    if (_socket?.connected == true) return;

    final auth = AuthService();
    if (!auth.isAuthenticated) {
      return;
    }
    final token = auth.token;

    _socket = IO.io(
      AppConfig.apiBaseUrl.replaceAll('/api', ''),
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(30000)
          .setAuth({'token': token})
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      _reconnectAttempts = 0;
      if (_currentBusId != null) joinBusRoom(_currentBusId!);
      if (_currentSchoolId != null) joinSchoolRoom(_currentSchoolId!);
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
    });

    _socket!.onConnectError((error) {
      _isConnected = false;
      _reconnectAttempts++;
      if (_reconnectAttempts >= _maxReconnectAttempts) {
        disconnect();
      }
    });

    _socket!.onError((error) {
      if (kDebugMode) {
        debugPrint('Socket.IO error: $error');
      }
    });

    _socket!.on('bus:location-update', (data) {
      _safeAdd(_locationController, data);
    });

    _socket!.on('trip:started', (data) {
      _safeAdd(_tripController, data);
    });

    _socket!.on('trip:ended', (data) {
      _safeAdd(_tripController, data);
    });

    _socket!.on('attendance:marked', (data) {
      _safeAdd(_attendanceController, data);
    });

    _socket!.on('fleet:emergency-alert', (data) {
      _safeAdd(_emergencyController, data);
    });

    _socket!.on('notification:new', (data) {
      _safeAdd(_notificationController, data);
    });

    _socket!.on('bus:approaching-stop', (data) {
      _safeAdd(_approachingStopController, data);
    });
  }

  void _safeAdd(StreamController<Map<String, dynamic>> controller, dynamic data) {
    if (!controller.isClosed) {
      try {
        controller.add(Map<String, dynamic>.from(data));
      } catch (_) {}
    }
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _currentBusId = null;
    _currentSchoolId = null;
    _reconnectAttempts = 0;
  }

  void joinBusRoom(String busId) {
    _currentBusId = busId;
    _socket?.emit('join:bus', busId);
  }

  void leaveBusRoom(String busId) {
    _socket?.emit('leave:bus', busId);
    _currentBusId = null;
  }

  void joinSchoolRoom(String schoolId) {
    _currentSchoolId = schoolId;
    _socket?.emit('join:school', schoolId);
  }

  void joinParentRoom(String parentId) {
    _socket?.emit('join:parent', parentId);
  }

  void joinDriverRoom(String driverId) {
    _socket?.emit('join:driver', driverId);
  }

  void subscribeNotifications() {
    final auth = AuthService();
    final userType = auth.userType;
    final userId = auth.userId;

    if (userType == 'PARENT' && userId != null) {
      joinParentRoom(userId);
    } else if (userType == 'DRIVER' && userId != null) {
      joinDriverRoom(userId);
    } else if (userType == 'ADMIN' && auth.schoolId != null) {
      joinSchoolRoom(auth.schoolId!);
    }
  }

  void sendLocationUpdate(
    String tripId,
    double latitude,
    double longitude, {
    double? speed,
    double? heading,
    double? accuracy,
  }) {
    _socket?.emit('driver:location-update', {
      'tripId': tripId,
      'latitude': latitude,
      'longitude': longitude,
      'speed': speed,
      'heading': heading,
      'accuracy': accuracy,
    });
  }

  void startTrip(String busId, String type) {
    _socket?.emit('driver:start-trip', {
      'busId': busId,
      'type': type,
    });
  }

  void endTrip(String tripId) {
    _socket?.emit('driver:end-trip', {
      'tripId': tripId,
    });
  }

  void markBoarding(String studentId, String tripId) {
    _socket?.emit('driver:student-boarding', {
      'studentId': studentId,
      'tripId': tripId,
    });
  }

  void markDropoff(String studentId, String tripId) {
    _socket?.emit('driver:student-drop', {
      'studentId': studentId,
      'tripId': tripId,
    });
  }

  void triggerEmergency(String tripId, String message) {
    _socket?.emit('driver:emergency', {
      'tripId': tripId,
      'message': message,
    });
  }

  void triggerParentEmergency({String? studentName, String message = 'Emergency triggered by parent'}) {
    _socket?.emit('parent:emergency', {
      'studentName': studentName,
      'message': message,
    });
  }

  void dispose() {
    disconnect();
    _locationController.close();
    _tripController.close();
    _attendanceController.close();
    _emergencyController.close();
    _notificationController.close();
    _approachingStopController.close();
  }
}
