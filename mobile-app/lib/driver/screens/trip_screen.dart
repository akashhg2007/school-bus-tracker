import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/config/theme.dart';
import '../../core/services/api_service.dart';
import '../../core/services/location_service.dart';
import '../../core/services/socket_service.dart';
import '../../shared/map/osm_map_widget.dart';

class TripScreen extends StatefulWidget {
  final String? busId;
  final String? busNumber;

  const TripScreen({super.key, this.busId, this.busNumber});

  @override
  State<TripScreen> createState() => _TripScreenState();
}

class _TripScreenState extends State<TripScreen> {
  final MapController _mapController = MapController();
  final LocationService _locationService = LocationService();
  final SocketService _socketService = SocketService();
  bool _isTripActive = false;
  String? _activeTripId;
  List<Map<String, dynamic>> _students = [];
  Map<String, bool> _boardedStudents = {};
  bool _loading = true;
  LatLng? _currentLocation;
  bool _permissionGranted = false;

  @override
  void initState() {
    super.initState();
    _loadStudents();
    _connectSocket();
    _requestLocationPermission();
  }

  @override
  void dispose() {
    if (_isTripActive) {
      _locationService.stopTracking();
    }
    super.dispose();
  }

  void _connectSocket() {
    _socketService.connect();
  }

  Future<void> _requestLocationPermission() async {
    final hasPermission = await _locationService.checkAndRequestPermission();
    if (mounted) {
      setState(() {
        _permissionGranted = hasPermission;
      });
      if (hasPermission) {
        _getCurrentLocation();
      }
    }
  }

  Future<void> _getCurrentLocation() async {
    final position = await _locationService.getCurrentPosition();
    if (position != null && mounted) {
      setState(() {
        _currentLocation = LatLng(position.latitude, position.longitude);
      });
    }
  }

  Future<void> _loadStudents() async {
    if (widget.busId == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final api = ApiService();
      final response = await api.dio.get('/students/bus/${widget.busId}');
      if (response.statusCode == 200) {
        final data = response.data['data'];
        setState(() {
          _students = List<Map<String, dynamic>>.from(data);
          _loading = false;
        });
      }
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _startTrip() async {
    if (widget.busId == null) return;

    if (!_permissionGranted) {
      if (mounted) {
        final shouldRequest = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Location Permission Required'),
            content: const Text(
              'This app needs access to your location to track the bus in real-time. '
              'Please allow location access when prompted.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Allow'),
              ),
            ],
          ),
        );

        if (shouldRequest != true) return;
      }

      final hasPermission = await _locationService.checkAndRequestPermission();
      if (!hasPermission) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission is required to start trip')),
          );
        }
        return;
      }
      setState(() => _permissionGranted = true);
      _getCurrentLocation();
    }

    try {
      final api = ApiService();
      final response = await api.startTrip(widget.busId!, 'MORNING');
      if (response.statusCode == 200 || response.statusCode == 201) {
        final trip = response.data['data'];
        setState(() {
          _activeTripId = trip['id'];
          _isTripActive = true;
        });

        _locationService.startTracking(trip['id']);

        _socketService.joinBusRoom(widget.busId!);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to start trip: $e')),
        );
      }
    }
  }

  Future<void> _endTrip() async {
    if (_activeTripId == null) return;
    try {
      final api = ApiService();
      final response = await api.endTrip(_activeTripId!);
      if (response.statusCode == 200) {
        _locationService.stopTracking();
        _socketService.leaveBusRoom(widget.busId!);
        setState(() {
          _isTripActive = false;
          _activeTripId = null;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to end trip: $e')),
        );
      }
    }
  }

  Future<void> _markBoarding(String studentId) async {
    if (_activeTripId == null) return;
    try {
      final api = ApiService();
      final response = await api.markBoarding(studentId, _activeTripId!);
      if (response.statusCode == 200 || response.statusCode == 201) {
        setState(() => _boardedStudents[studentId] = true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to mark boarding: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final boardedCount = _boardedStudents.values.where((v) => v).length;
    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.busNumber ?? 'Bus'} Trip'),
        actions: [
          if (_isTripActive)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.safeGreen,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Text(
                    'ACTIVE',
                    style: TextStyle(
                      color: AppColors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
            ),
          if (_isTripActive)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _locationService.isTracking ? AppColors.safeGreen : AppColors.alertOrange,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.location_on,
                        color: AppColors.white,
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _locationService.isTracking ? 'GPS Active' : 'GPS Off',
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 10,
                        ),
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
                  flex: 2,
                  child: Stack(
                    children: [
                      OsmMapWidget(
                        center: _currentLocation ?? const LatLng(12.9716, 77.5946),
                        zoom: 15.0,
                        controller: _mapController,
                        markers: [
                          if (_currentLocation != null)
                            buildBusMarker(_currentLocation!, 90, widget.busNumber ?? 'BUS', true),
                        ],
                      ),
                      if (_isTripActive)
                        Positioned(
                          bottom: 16,
                          left: 16,
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(8),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.circle,
                                    color: _locationService.isTracking ? AppColors.safeGreen : AppColors.alertOrange,
                                    size: 12,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    _locationService.isTracking ? 'Sending GPS every 5s' : 'Waiting for GPS...',
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      if (!_permissionGranted)
                        Positioned(
                          top: 8,
                          left: 8,
                          right: 8,
                          child: Card(
                            color: AppColors.alertOrange.withOpacity(0.9),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                children: [
                                  const Icon(Icons.warning_amber, color: AppColors.white, size: 20),
                                  const SizedBox(width: 8),
                                  const Expanded(
                                    child: Text(
                                      'Location permission needed for GPS tracking',
                                      style: TextStyle(color: AppColors.white, fontSize: 12),
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: _requestLocationPermission,
                                    child: const Text('Grant', style: TextStyle(color: AppColors.white, fontWeight: FontWeight.bold)),
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
                  flex: 3,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          width: double.infinity,
                          height: 60,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _isTripActive ? AppColors.dangerRed : AppColors.safeGreen,
                            ),
                            onPressed: _isTripActive ? _endTrip : _startTrip,
                            icon: Icon(_isTripActive ? Icons.stop : Icons.play_arrow, size: 30),
                            label: Text(
                              _isTripActive ? 'End Trip' : 'Start Trip',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                Column(
                                  children: [
                                    Text(
                                      '$boardedCount',
                                      style: const TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.safeGreen,
                                      ),
                                    ),
                                    const Text('Boarded'),
                                  ],
                                ),
                                Column(
                                  children: [
                                    Text(
                                      '${_students.length - boardedCount}',
                                      style: const TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.alertOrange,
                                      ),
                                    ),
                                    const Text('Pending'),
                                  ],
                                ),
                                Column(
                                  children: [
                                    Text(
                                      '${_students.length}',
                                      style: const TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.skyBlue,
                                      ),
                                    ),
                                    const Text('Total'),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text('Students', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        ..._students.map((student) => _buildStudentCard(student)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildStudentCard(Map<String, dynamic> student) {
    final id = student['id'];
    final boarded = _boardedStudents[id] == true;
    final stop = student['stop'];
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: boarded ? AppColors.safeGreen : AppColors.medium,
          child: Icon(boarded ? Icons.check : Icons.person, color: AppColors.white),
        ),
        title: Text(student['name'] ?? ''),
        subtitle: Text('Stop: ${stop?['name'] ?? 'N/A'}'),
        trailing: boarded
            ? const Chip(
                label: Text('Boarded'),
                backgroundColor: AppColors.safeGreen,
                labelStyle: TextStyle(color: AppColors.white),
              )
            : ElevatedButton(
                onPressed: _isTripActive ? () => _markBoarding(id) : null,
                child: const Text('Mark'),
              ),
      ),
    );
  }
}
