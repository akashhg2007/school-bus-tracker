import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/config/theme.dart';
import '../../core/config/app_config.dart';
import '../../core/services/api_service.dart';
import '../../core/services/location_service.dart';
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
  final ValueNotifier<LatLng?> _busLocationNotifier = ValueNotifier(null);
  LatLng? _userLocation;
  final ValueNotifier<bool> _followGpsNotifier = ValueNotifier(true);
  List<Map<String, dynamic>> _stops = [];
  String? _driverName;
  final ValueNotifier<String?> _nextStopName = ValueNotifier(null);
  final ValueNotifier<int?> _nextStopEta = ValueNotifier(null);
  final ValueNotifier<double?> _nextStopDistance = ValueNotifier(null);
  final ValueNotifier<double?> _busHeading = ValueNotifier(null);
  bool _loading = true;
  final ValueNotifier<bool> _isRealTimeActive = ValueNotifier(false);
  StreamSubscription? _locationSubscription;
  StreamSubscription? _approachingSubscription;
  String? _lastAlertKey;

  @override
  void initState() {
    super.initState();
    _loadBusData();
    _connectSocket();
    _getUserLocation();
  }

  Future<void> _getUserLocation() async {
    final location = await LocationService().getCurrentLatLng();
    if (location != null && mounted) {
      _userLocation = location;
      if (_busLocationNotifier.value == null) {
        _moveCamera(location, 15);
      }
    }
  }

  void _moveCamera(LatLng pos, double zoom) {
    try {
      _mapController.move(pos, zoom);
    } catch (_) {}
  }

  void _recenter() {
    final target = _busLocationNotifier.value ?? _userLocation;
    if (target == null) return;
    _followGpsNotifier.value = true;
    _moveCamera(target, 16);
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _approachingSubscription?.cancel();
    _busLocationNotifier.dispose();
    _followGpsNotifier.dispose();
    _isRealTimeActive.dispose();
    _busHeading.dispose();
    _nextStopName.dispose();
    _nextStopEta.dispose();
    _nextStopDistance.dispose();
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
          final pos = LatLng(lat.toDouble(), lng.toDouble());
          _busLocationNotifier.value = pos;
          _isRealTimeActive.value = true;
          _busHeading.value = data['heading']?.toDouble();
          if (nextStop != null) {
            _nextStopName.value = nextStop['name'];
            _nextStopEta.value = nextStop['eta']?.round();
            _nextStopDistance.value = nextStop['distance']?.toDouble();
          } else {
            _nextStopName.value = null;
            _nextStopEta.value = null;
            _nextStopDistance.value = null;
          }
          if (_followGpsNotifier.value) _moveCamera(pos, 15);
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
          _busLocationNotifier.value = LatLng(loc['latitude'], loc['longitude']);
        }
      } catch (_) {}

      setState(() => _loading = false);
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load bus data: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Track ${widget.busNumber ?? 'Bus'}'),
        actions: [
          ValueListenableBuilder<bool>(
            valueListenable: _isRealTimeActive,
            builder: (context, isActive, _) {
              if (!isActive) return const SizedBox.shrink();
              return Padding(
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
                        Text('Live', style: TextStyle(color: AppColors.white, fontSize: 10)),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Expanded(
                  flex: 3,
                  child: _buildMapSection(),
                ),
                Expanded(
                  flex: 2,
                  child: _buildInfoSection(),
                ),
              ],
            ),
    );
  }

  Widget _buildMapSection() {
    return ValueListenableBuilder<LatLng?>(
      valueListenable: _busLocationNotifier,
      builder: (context, busLocation, _) {
        return ValueListenableBuilder<bool>(
          valueListenable: _followGpsNotifier,
          builder: (context, followGps, _) {
            return ValueListenableBuilder<double?>(
              valueListenable: _busHeading,
              builder: (context, heading, _) {
                return Stack(
                  children: [
                    RepaintBoundary(
                      child: OsmMapWidget(
                        center: busLocation ?? _userLocation ?? _defaultLocation,
                        zoom: AppConfig.mapFollowZoom,
                        controller: _mapController,
                        myLocation: _userLocation,
                        myLocationAccuracy: null,
                        onMapEvent: (event) {
                          if (event.source == MapEventSource.onDrag ||
                              event.source == MapEventSource.onMultiFinger ||
                              event.source == MapEventSource.multiFingerGestureStart ||
                              event.source == MapEventSource.flingAnimationController) {
                            if (_followGpsNotifier.value && mounted) {
                              _followGpsNotifier.value = false;
                            }
                          }
                        },
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
                              color: AppColors.skyBlue.withValues(alpha: 0.7),
                            ),
                        ],
                        markers: [
                          if (busLocation != null)
                            buildBusMarker(busLocation, heading ?? 0, widget.busNumber ?? 'BUS', true),
                          if (_userLocation != null)
                            buildParentMarker(_userLocation!, 'You'),
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
                    ),
                    Positioned(
                      right: 12,
                      top: 12,
                      child: FloatingActionButton.small(
                        heroTag: 'locate_bus',
                        backgroundColor: AppColors.skyBlue,
                        onPressed: _recenter,
                        child: const Icon(Icons.my_location, color: AppColors.white),
                      ),
                    ),
                    _buildInfoCard(busLocation),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildInfoCard(LatLng? busLocation) {
    return Positioned(
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
                  color: busLocation != null
                      ? AppColors.safeGreen.withValues(alpha: 0.1)
                      : AppColors.medium.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  busLocation != null ? Icons.directions_bus : Icons.offline_bolt,
                  color: busLocation != null ? AppColors.safeGreen : AppColors.medium,
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
                      busLocation != null ? 'Bus is active' : 'Bus not active',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    ValueListenableBuilder<String?>(
                      valueListenable: _nextStopName,
                      builder: (context, nextStopName, _) {
                        if (nextStopName == null) return const SizedBox.shrink();
                        return ValueListenableBuilder<int?>(
                          valueListenable: _nextStopEta,
                          builder: (context, eta, _) {
                            if (eta == null) return const SizedBox.shrink();
                            return ValueListenableBuilder<double?>(
                              valueListenable: _nextStopDistance,
                              builder: (context, dist, _) {
                                return Text(
                                  'Next stop: $nextStopName \u2014 $eta min${dist != null ? ' \u00b7 ${dist.toStringAsFixed(1)} km' : ''}',
                                  style: const TextStyle(color: AppColors.alertOrange, fontSize: 12),
                                );
                              },
                            );
                          },
                        );
                      },
                    ),
                    Text(
                      _driverName != null ? 'Driver: $_driverName' : 'No driver assigned',
                      style: const TextStyle(color: AppColors.medium, fontSize: 12),
                    ),
                    ValueListenableBuilder<bool>(
                      valueListenable: _isRealTimeActive,
                      builder: (context, isActive, _) {
                        if (!isActive) return const SizedBox.shrink();
                        return const Text(
                          'Real-time tracking active',
                          style: TextStyle(color: AppColors.safeGreen, fontSize: 10),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoSection() {
    return RefreshIndicator(
      onRefresh: _loadBusData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  ValueListenableBuilder<LatLng?>(
                    valueListenable: _busLocationNotifier,
                    builder: (context, busLocation, _) {
                      return Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: busLocation != null ? AppColors.safeGreen : AppColors.medium,
                          shape: BoxShape.circle,
                        ),
                      );
                    },
                  ),
                  const SizedBox(width: 12),
                  ValueListenableBuilder<LatLng?>(
                    valueListenable: _busLocationNotifier,
                    builder: (context, busLocation, _) {
                      return Text(
                        busLocation != null ? 'Bus is on the way' : 'Waiting for GPS data',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      );
                    },
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
            SizedBox(
              height: _stops.length * 72.0,
              child: ListView.builder(
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _stops.length,
                itemBuilder: (context, index) {
                  final stop = _stops[index];
                  return _buildStopItem(stop['name'] ?? '', stop['order']);
                },
              ),
            ),
          ],
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
