import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'api_service.dart';
import 'socket_service.dart';
import '../config/app_config.dart';

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  Timer? _locationTimer;
  bool _isTracking = false;
  String? _currentTripId;

  bool get isTracking => _isTracking;
  String? get currentTripId => _currentTripId;

  Future<bool> checkAndRequestPermission() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('Location services are disabled');
        return false;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      debugPrint('Current permission status: $permission');

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        debugPrint('Permission after request: $permission');
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

      debugPrint('Location permission granted');
      return true;
    } catch (e) {
      debugPrint('Error checking/requesting location permission: $e');
      return false;
    }
  }

  Future<Position?> getCurrentPosition() async {
    try {
      bool hasPermission = await checkAndRequestPermission();
      if (!hasPermission) return null;

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );
    } on TimeoutException {
      debugPrint('Getting position timed out, trying last known position');
      try {
        return await Geolocator.getLastKnownPosition();
      } catch (e) {
        debugPrint('Error getting last known position: $e');
        return null;
      }
    } catch (e) {
      debugPrint('Error getting current position: $e');
      return null;
    }
  }

  void startTracking(String tripId) {
    if (_isTracking) return;

    _currentTripId = tripId;
    _isTracking = true;

    _locationTimer = Timer.periodic(
      const Duration(seconds: AppConfig.locationUpdateInterval),
      (_) => _sendLocationUpdate(),
    );

    _sendLocationUpdate();
    debugPrint('Location tracking started for trip: $tripId');
  }

  void stopTracking() {
    _locationTimer?.cancel();
    _locationTimer = null;
    _isTracking = false;
    _currentTripId = null;
    debugPrint('Location tracking stopped');
  }

  Future<void> _sendLocationUpdate() async {
    if (!_isTracking || _currentTripId == null) return;

    try {
      final position = await getCurrentPosition();
      if (position == null) {
        debugPrint('No position available, skipping update');
        return;
      }

      debugPrint('Sending location: ${position.latitude}, ${position.longitude}');

      final api = ApiService();
      await api.updateLocation(
        _currentTripId!,
        position.latitude,
        position.longitude,
        speed: position.speed,
        heading: position.heading,
        accuracy: position.accuracy,
      );

      final socket = SocketService();
      if (socket.isConnected) {
        socket.sendLocationUpdate(
          _currentTripId!,
          position.latitude,
          position.longitude,
          speed: position.speed,
          heading: position.heading,
          accuracy: position.accuracy,
        );
      }
    } catch (e) {
      debugPrint('Error sending location update: $e');
    }
  }

  void dispose() {
    stopTracking();
  }
}
