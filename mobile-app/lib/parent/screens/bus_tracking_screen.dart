import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/config/theme.dart';
import '../../core/services/api_service.dart';
import '../../core/services/socket_service.dart';
import '../../shared/map/osm_map_widget.dart';

class BusTrackingScreen extends StatefulWidget {
  final String? busId;
  final String? busNumber;

  const BusTrackingScreen({super.key, this.busId, this.busNumber});

  @override
  State<BusTrackingScreen> createState() => _BusTrackingScreenState();
}

class _BusTrackingScreenState extends State<BusTrackingScreen> {
  final MapController _mapController = MapController();
  final SocketService _socketService = SocketService();
  final LatLng _defaultLocation = const LatLng(12.9716, 77.5946);
  LatLng? _busLocation;
  List<Map<String, dynamic>> _stops = [];
  String? _driverName;
  String? _nextStopName;
  int? _nextStopEta;
  bool _loading = true;
  bool _isRealTimeActive = false;
  StreamSubscription? _locationSubscription;
  StreamSubscription? _approachingSubscription;
  String? _lastAlertKey;

  @override
  void initState() {
    super.initState();
    _loadBusData();
    _connectSocket();
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _approachingSubscription?.cancel();
    if (widget.busId != null) {
      _socketService.leaveBusRoom(widget.busId!);
    }
    super.dispose();
  }

  void _connectSocket() {
    _socketService.connect();
    if (widget.busId != null) {
      _socketService.joinBusRoom(widget.busId!);
    }

    _locationSubscription = _socketService.locationStream.listen((data) {
      if (mounted && data['busId'] == widget.busId) {
        final lat = data['latitude'];
        final lng = data['longitude'];
        if (lat != null && lng != null) {
          final nextStop = data['nextStop'];
          setState(() {
            _busLocation = LatLng(lat.toDouble(), lng.toDouble());
            _isRealTimeActive = true;
            if (nextStop != null) {
              _nextStopName = nextStop['name'];
              _nextStopEta = nextStop['eta']?.round();
            } else {
              _nextStopName = null;
              _nextStopEta = null;
            }
          });
          _mapController.move(_busLocation!, _mapController.camera.zoom);
        }
      }
    });

    _approachingSubscription = _socketService.approachingStopStream.listen((data) {
      if (!mounted) return;
      final alertKey = '${data['studentId']}:${data['stopName']}:${data['eta']?.toStringAsFixed(0)}';
      if (alertKey == _lastAlertKey) return;
      _lastAlertKey = alertKey;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Bus ${data['busNumber']} approaching ${data['stopName']} in ~${data['eta']?.round()} min'),
          duration: const Duration(seconds: 5),
        ),
      );
    });
  }

  Future<void> _loadBusData() async {
    if (widget.busId == null) {
      setState(() => _loading = false);
      return;
    }

    try {
      final api = ApiService();

      final busResponse = await api.getBusById(widget.busId!);
      if (busResponse.statusCode == 200) {
        final bus = busResponse.data['data'];
        setState(() {
          _driverName = bus['driver']?['name'];
          _stops = List<Map<String, dynamic>>.from(bus['route']?['stops'] ?? []);
        });
      }

      try {
        final locResponse = await api.getBusLiveLocation(widget.busId!);
        if (locResponse.statusCode == 200 && locResponse.data['data'] != null) {
          final loc = locResponse.data['data'];
          setState(() {
            _busLocation = LatLng(loc['latitude'], loc['longitude']);
          });
        }
      } catch (_) {}

      setState(() => _loading = false);
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Track ${widget.busNumber ?? 'Bus'}'),
        actions: [
          if (_isRealTimeActive)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.safeGreen,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.wifi, color: AppColors.white, size: 14),
                      SizedBox(width: 4),
                      Text(
                        'Live',
                        style: TextStyle(color: AppColors.white, fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Expanded(
                  flex: 3,
                  child: Stack(
                    children: [
                      OsmMapWidget(
                        center: _busLocation ?? _defaultLocation,
                        zoom: 15.0,
                        controller: _mapController,
                        polylines: [
                          if (_stops.length > 1)
                            Polyline(
                              points: [
                                for (final stop in _stops)
                                  LatLng(
                                    (stop['latitude'] as num).toDouble(),
                                    (stop['longitude'] as num).toDouble(),
                                  ),
                              ],
                              strokeWidth: 4,
                              color: AppColors.skyBlue.withOpacity(0.7),
                            ),
                        ],
                        markers: [
                          if (_busLocation != null)
                            buildBusMarker(_busLocation!, 90, widget.busNumber ?? 'BUS', true),
                          buildParentMarker(_defaultLocation, 'Home'),
                          for (final stop in _stops)
                            if (stop['latitude'] != null && stop['longitude'] != null)
                              buildStopMarker(
                                LatLng(
                                  (stop['latitude'] as num).toDouble(),
                                  (stop['longitude'] as num).toDouble(),
                                ),
                                stop['name'] ?? '',
                                false,
                              ),
                        ],
                      ),
                      Positioned(
                        bottom: 16,
                        left: 16,
                        right: 16,
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: _busLocation != null
                                        ? AppColors.safeGreen.withOpacity(0.1)
                                        : AppColors.medium.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    _busLocation != null ? Icons.directions_bus : Icons.offline_bolt,
                                    color: _busLocation != null ? AppColors.safeGreen : AppColors.medium,
                                    size: 30,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        _busLocation != null ? 'Bus is active' : 'Bus not active',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                      ),
                                      if (_nextStopName != null && _nextStopEta != null) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          'Next stop: $_nextStopName (~$_nextStopEta min)',
                                          style: const TextStyle(color: AppColors.alertOrange, fontSize: 12),
                                        ),
                                      ],
                                      Text(
                                        _driverName != null ? 'Driver: $_driverName' : 'No driver assigned',
                                        style: const TextStyle(color: AppColors.medium, fontSize: 12),
                                      ),
                                      if (_isRealTimeActive)
                                        const Text(
                                          'Real-time tracking active',
                                          style: TextStyle(color: AppColors.safeGreen, fontSize: 10),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Container(
                                  width: 12,
                                  height: 12,
                                  decoration: BoxDecoration(
                                    color: _busLocation != null ? AppColors.safeGreen : AppColors.medium,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  _busLocation != null ? 'Bus is on the way' : 'Waiting for GPS data',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_driverName != null) ...[
                          const SizedBox(height: 12),
                          Card(
                            child: ListTile(
                              leading: const CircleAvatar(
                                backgroundColor: AppColors.skyBlue,
                                child: Icon(Icons.person, color: AppColors.white),
                              ),
                              title: Text(_driverName!),
                              subtitle: const Text('Driver'),
                            ),
                          ),
                        ],
                        if (_stops.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          const Text('Stops', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          ..._stops.map((stop) => _buildStopItem(stop['name'] ?? '', stop['order'])),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildStopItem(String name, int order) {
    return Card(
      child: ListTile(
        leading: Container(
          width: 24,
          height: 24,
          decoration: const BoxDecoration(
            color: AppColors.medium,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$order',
              style: const TextStyle(
                color: AppColors.white,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        title: Text(name),
      ),
    );
  }
}
