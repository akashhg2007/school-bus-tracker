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

  final StreamController<Map<String, dynamic>> _locationController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _tripController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _attendanceController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _emergencyController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get locationStream => _locationController.stream;
  Stream<Map<String, dynamic>> get tripStream => _tripController.stream;
  Stream<Map<String, dynamic>> get attendanceStream => _attendanceController.stream;
  Stream<Map<String, dynamic>> get emergencyStream => _emergencyController.stream;

  bool get isConnected => _isConnected;

  void connect() {
    if (_socket?.connected == true) return;

    final auth = AuthService();
    final token = auth.token;

    _socket = IO.io(
      AppConfig.apiBaseUrl.replaceAll('/api', ''),
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(1000)
          .setAuth({'token': token})
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      debugPrint('Socket.IO connected');

      if (_currentBusId != null) joinBusRoom(_currentBusId!);
      if (_currentSchoolId != null) joinSchoolRoom(_currentSchoolId!);
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      debugPrint('Socket.IO disconnected');
    });

    _socket!.onConnectError((error) {
      debugPrint('Socket.IO connection error: $error');
      _isConnected = false;
    });

    _socket!.onError((error) {
      debugPrint('Socket.IO error: $error');
    });

    _socket!.on('location-update', (data) {
      _locationController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('bus-location-update', (data) {
      _locationController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('trip:started', (data) {
      _tripController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('trip:ended', (data) {
      _tripController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('attendance:marked', (data) {
      _attendanceController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('fleet:emergency-alert', (data) {
      _emergencyController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('error', (data) {
      debugPrint('Socket error: $data');
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _currentBusId = null;
    _currentSchoolId = null;
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

  void dispose() {
    disconnect();
    _locationController.close();
    _tripController.close();
    _attendanceController.close();
    _emergencyController.close();
  }
}
