import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'socket_service.dart';
import '../config/app_config.dart';

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  static const double _minSendDistance = 10;
  static const int _heartbeatSeconds = 30;

  StreamSubscription<Position>? _positionSub;
  Timer? _sendTimer;
  bool _isTracking = false;
  String? _currentTripId;

  Position? _lastFix;
  DateTime? _lastFixAt;
  Position? _lastSent;
  DateTime? _lastSentAt;

  static const int _maxBufferSize = 50;
  final List<Map<String, dynamic>> _offlineBuffer = [];

  final StreamController<Map<String, dynamic>> _statusController =
      StreamController<Map<String, dynamic>>.broadcast();

  bool get isTracking => _isTracking;
  String? get currentTripId => _currentTripId;
  Position? get lastFix => _lastFix;
  DateTime? get lastFixAt => _lastFixAt;

  Stream<Map<String, dynamic>> get statusStream => _statusController.stream;

  bool get _hasFreshFix {
    if (_lastFixAt == null) return false;
    return DateTime.now().difference(_lastFixAt!) < const Duration(seconds: 30);
  }

  Future<bool> checkAndRequestPermission() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        debugPrint('Location services are disabled');
        return false;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('Location permission denied by user');
          return false;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        debugPrint('Location permission denied forever - opening settings');
        await Geolocator.openAppSettings();
        return false;
      }

      return true;
    } catch (e) {
      debugPrint('Error checking/requesting location permission: $e');
      return false;
    }
  }

  Future<Position?> getCurrentPosition() async {
    if (!await checkAndRequestPermission()) return null;
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );
    } catch (e) {
      debugPrint('Error getting current position: $e');
      return null;
    }
  }

  Future<LatLng?> getCurrentLatLng() async {
    final position = await getCurrentPosition();
    if (position == null) return null;
    return LatLng(position.latitude, position.longitude);
  }

  Future<void> startTracking(String tripId, {String? busId}) async {
    if (_isTracking) return;

    _currentTripId = tripId;
    _isTracking = true;
    _lastFix = null;
    _lastFixAt = null;
    _lastSent = null;
    _lastSentAt = null;

    try {
      await FlutterForegroundTask.startService(
        serviceTypes: [ForegroundServiceTypes.location],
        notificationTitle: 'School Bus Tracker',
        notificationText: 'Sharing live GPS location for active trip',
      );
    } catch (e) {
      debugPrint('Foreground service start skipped: $e');
    }

    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: AppConfig.locationUpdateDistance,
      ),
    ).listen(
      _onPosition,
      onError: (Object error) {
        debugPrint('Position stream error: $error');
        _emitStatus();
      },
      onDone: () {
        debugPrint('Position stream closed');
        _emitStatus();
      },
      cancelOnError: false,
    );

    _sendTimer = Timer.periodic(
      const Duration(seconds: AppConfig.locationUpdateInterval),
      (_) => _sendLatest(),
    );

    _emitStatus();
    debugPrint('Location tracking started for trip: $tripId');
  }

  Future<void> stopTracking() async {
    _positionSub?.cancel();
    _positionSub = null;
    _sendTimer?.cancel();
    _sendTimer = null;

    try {
      if (await FlutterForegroundTask.isRunningService) {
        await FlutterForegroundTask.stopService();
      }
    } catch (e) {
      debugPrint('Foreground service stop failed: $e');
    }

    _isTracking = false;
    _currentTripId = null;
    _lastFix = null;
    _lastFixAt = null;
    _lastSent = null;
    _lastSentAt = null;

    _emitStatus();
    debugPrint('Location tracking stopped');
  }

  void _onPosition(Position position) {
    _lastFix = position;
    _lastFixAt = DateTime.now();
    _emitStatus();
    _sendLatest();
  }

  Future<void> _sendLatest() async {
    if (!_isTracking || _currentTripId == null) return;
    final position = _lastFix;
    if (position == null) {
      _emitStatus();
      return;
    }

    final sent = _lastSent;
    final now = DateTime.now();
    final age = _lastSentAt == null ? 0 : now.difference(_lastSentAt!).inSeconds;

    if (sent != null) {
      final moved = _distanceMeters(sent, position);
      if (moved < _minSendDistance && age < _heartbeatSeconds) {
        _emitStatus();
        return;
      }
    }

    _lastSent = position;
    _lastSentAt = now;

    final socket = SocketService();
    if (!socket.isConnected) {
      if (_offlineBuffer.length < _maxBufferSize) {
        _offlineBuffer.add({
          'tripId': _currentTripId,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'speed': position.speed,
          'heading': position.heading,
          'accuracy': position.accuracy,
        });
      }
      _emitStatus();
      return;
    }

    _flushOfflineBuffer(socket);

    socket.sendLocationUpdate(
      _currentTripId!,
      position.latitude,
      position.longitude,
      speed: position.speed,
      heading: position.heading,
      accuracy: position.accuracy,
    );
    _emitStatus();
  }

  void _flushOfflineBuffer(SocketService socket) {
    if (_offlineBuffer.isEmpty) return;
    final pending = List<Map<String, dynamic>>.from(_offlineBuffer);
    _offlineBuffer.clear();
    for (final entry in pending) {
      socket.sendLocationUpdate(
        entry['tripId'],
        entry['latitude'],
        entry['longitude'],
        speed: entry['speed'],
        heading: entry['heading'],
        accuracy: entry['accuracy'],
      );
    }
  }

  double _distanceMeters(Position a, Position b) {
    const earthRadius = 6371000.0;
    final dLat = (b.latitude - a.latitude) * math.pi / 180;
    final dLng = (b.longitude - a.longitude) * math.pi / 180;
    final h = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(a.latitude * math.pi / 180) *
            math.cos(b.latitude * math.pi / 180) *
            math.sin(dLng / 2) * math.sin(dLng / 2);
    return earthRadius * 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h));
  }

  void _emitStatus() {
    if (_statusController.isClosed) return;
    final now = DateTime.now();
    _statusController.add({
      'tracking': _isTracking,
      'hasFix': _lastFix != null,
      'fresh': _hasFreshFix,
      'ageSeconds': _lastFixAt == null ? -1 : now.difference(_lastFixAt!).inSeconds,
      'latitude': _lastFix?.latitude,
      'longitude': _lastFix?.longitude,
      'accuracy': _lastFix?.accuracy,
      'speed': _lastFix?.speed,
      'heading': _lastFix?.heading,
    });
  }

  void dispose() {
    stopTracking();
    if (!_statusController.isClosed) {
      _statusController.close();
    }
  }
}