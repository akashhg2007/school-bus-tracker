import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:dio/dio.dart';
import '../../core/config/theme.dart';
import '../../core/config/app_config.dart';
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
  final Map<String, bool> _boardedStudents = {};
  final Map<String, bool> _droppedStudents = {};
  String _markMode = 'BOARDING';
  bool _loading = true;
  LatLng? _currentLocation;
  bool _permissionGranted = false;
  bool _followGps = true;
  StreamSubscription? _gpsSubscription;
  Map<String, dynamic>? _gpsStatus;

  @override
  void initState() {
    super.initState();
    _loadStudents();
    _connectSocket();
    _requestLocationPermission();
    _listenGps();
  }

  @override
  void dispose() {
    _gpsSubscription?.cancel();
    if (_isTripActive) {
      _locationService.stopTracking();
    }
    super.dispose();
  }

  void _listenGps() {
    _gpsSubscription = _locationService.statusStream.listen((status) {
      if (!mounted) return;
      final lat = status['latitude'];
      final lng = status['longitude'];
      if (lat == null || lng == null) return;
      final pos = LatLng(lat.toDouble(), lng.toDouble());
      setState(() {
        _currentLocation = pos;
        _gpsStatus = status;
      });
      if (_followGps) _moveCamera(pos);
    });
  }

  void _moveCamera(LatLng pos) {
    try {
      _mapController.move(pos, _mapController.camera.zoom);
    } catch (_) {
      _mapController.move(pos, AppConfig.mapFollowZoom);
    }
  }

  void _recenterToMyLocation() {
    if (_currentLocation == null) {
      _requestLocationPermission();
      return;
    }
    setState(() => _followGps = true);
    _moveCamera(_currentLocation!);
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
      _recenterToMyLocation();
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
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load students: ${_extractError(e)}')),
        );
      }
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
      final tripType = await _pickTripType();
      if (tripType == null) return;

      final response = await api.startTrip(widget.busId!, tripType);
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
      final message = _extractError(e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to start trip')),
        );
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message)),
        );
      }
    }
  }

  Future<String?> _pickTripType() async {
    if (!mounted) return 'MORNING';
    return showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Select Trip Type'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, 'MORNING'),
            child: const Row(
              children: [
                Icon(Icons.wb_sunny, color: AppColors.alertOrange),
                SizedBox(width: 12),
                Text('Morning (School)'),
              ],
            ),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, 'EVENING'),
            child: const Row(
              children: [
                Icon(Icons.nights_stay, color: AppColors.deepBlue),
                SizedBox(width: 12),
                Text('Evening (Return)'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _extractError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      final serverMsg = data is Map<String, dynamic> ? data['message'] : null;
      if (serverMsg is String && serverMsg.isNotEmpty) return serverMsg;
    }
    return e.toString();
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
          SnackBar(content: Text('Failed to end trip: ${_extractError(e)}')),
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

  Future<void> _markDropoff(String studentId) async {
    if (_activeTripId == null) return;
    try {
      final api = ApiService();
      final response = await api.markDropoff(studentId, _activeTripId!);
      if (response.statusCode == 200 || response.statusCode == 201) {
        setState(() => _droppedStudents[studentId] = true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to mark drop-off: $e')),
        );
      }
    }
  }

  Future<void> _triggerSos() async {
    if (_activeTripId == null) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Emergency SOS'),
        content: const Text(
          'This will immediately alert the school administration and trigger an emergency protocol. '\
          'Are you sure you want to continue?'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.dangerRed,
              foregroundColor: AppColors.white,
            ),
            child: const Text('YES, TRIGGER SOS'),
          ),
        ],
      ),
    );
    if (confirm == true) {
      _socketService.triggerEmergency(_activeTripId!, 'Emergency triggered by driver (SOS)');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🚨 SOS alert sent to school! Emergency protocol activated.'),
            backgroundColor: AppColors.dangerRed,
            behavior: SnackBarBehavior.fixed,
            duration: Duration(seconds: 5),
          ),
        );
      }
    }
  }

  Future<void> _reportIncident(String type) async {
    if (_activeTripId == null) return;
    try {
      final api = ApiService();
      await api.reportIncident(_activeTripId!, type);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(type == 'DELAY' ? 'Delay reported to school' : 'Breakdown reported to school')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to report: $e')),
        );
      }
    }
  }

  void _showReportSheet() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ListTile(
              leading: Icon(Icons.report_problem),
              title: Text('Report issue to school'),
              textColor: AppColors.dark,
            ),
            ListTile(
              leading: Icon(Icons.schedule, color: AppColors.alertOrange),
              title: const Text('Bus delayed'),
              onTap: () {
                Navigator.pop(ctx);
                _reportIncident('DELAY');
              },
            ),
            ListTile(
              leading: Icon(Icons.build, color: AppColors.dangerRed),
              title: const Text('Breakdown'),
              onTap: () {
                Navigator.pop(ctx);
                _reportIncident('BREAKDOWN');
              },
            ),
          ],
        ),
      ),
    );
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
              child: Center(child: _buildGpsChip()),
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
                        zoom: AppConfig.mapFollowZoom,
                        controller: _mapController,
                        myLocation: _currentLocation,
                        myLocationAccuracy: _gpsStatus?['accuracy']?.toDouble(),
                        myLocationHeading: _gpsStatus?['heading']?.toDouble(),
                        onMapEvent: (event) {
                          if (event.source == MapEventSource.onDrag ||
                              event.source == MapEventSource.onMultiFinger ||
                              event.source == MapEventSource.multiFingerGestureStart ||
                              event.source == MapEventSource.flingAnimationController) {
                            if (_followGps && mounted) setState(() => _followGps = false);
                          }
                        },
                        markers: [
                          if (_currentLocation != null)
                            buildBusMarker(_currentLocation!, _gpsStatus?['heading']?.toDouble() ?? 0,
                                widget.busNumber ?? 'BUS', true),
                        ],
                      ),
                      if (_isTripActive)
                        Positioned(
                          bottom: 16,
                          left: 16,
                          child: StreamBuilder<Map<String, dynamic>>(
                            stream: _locationService.statusStream,
                            builder: (context, snapshot) {
                              final status = snapshot.data;
                              final hasFix = status?['hasFix'] == true;
                              final fresh = status?['fresh'] == true;
                              final age = status?['ageSeconds'] ?? -1;
                              final Color color = !hasFix
                                  ? AppColors.dangerRed
                                  : fresh
                                      ? AppColors.safeGreen
                                      : AppColors.alertOrange;
                              final String label = !hasFix
                                  ? 'Waiting for GPS...'
                                  : fresh
                                      ? 'GPS live (age ${age}s)'
                                      : 'GPS stale (age ${age}s)';
                              return Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(8),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.circle, color: color, size: 12),
                                      const SizedBox(width: 8),
                                      Text(
                                        label,
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      if (_isTripActive)
                        Positioned(
                          top: 12,
                          left: 0,
                          right: 0,
                          child: Center(
                            child: StreamBuilder<Map<String, dynamic>>(
                              stream: _locationService.statusStream,
                              builder: (context, snapshot) {
                                final speed = snapshot.data?['speed']?.toDouble() ?? 0;
                                final heading = snapshot.data?['heading']?.toDouble() ?? 0;
                                return Card(
                                  elevation: 4,
                                  child: Padding(
                                    padding:
                                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.speed,
                                          color: speed > 0 ? AppColors.safeGreen : AppColors.medium,
                                          size: 22,
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '${(speed).toStringAsFixed(0)} km/h',
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Icon(
                                          Icons.navigation,
                                          color: AppColors.skyBlue,
                                          size: 18,
                                        ),
                                        const SizedBox(width: 4),
                                        Text('${heading.toStringAsFixed(0)}°'),
                                      ],
                                    ),
                                  ),
                                );
                              },
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
                      Positioned(
                        right: 12,
                        top: 12,
                        child: FloatingActionButton.small(
                          heroTag: 'locate_me',
                          backgroundColor: AppColors.skyBlue,
                          onPressed: _recenterToMyLocation,
                          child: const Icon(Icons.my_location, color: AppColors.white),
                        ),
                      ),
                    ],
                  ),
                ),
                  Expanded(
                  flex: 3,
                  child: RefreshIndicator(
                    onRefresh: _loadStudents,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
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
                        if (_isTripActive)
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _triggerSos,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.dangerRed,
                                    side: const BorderSide(color: AppColors.dangerRed),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                  icon: const Icon(Icons.warning_amber),
                                  label: const Text('SOS', style: TextStyle(fontWeight: FontWeight.bold)),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _showReportSheet,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.alertOrange,
                                    side: const BorderSide(color: AppColors.alertOrange),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                  icon: const Icon(Icons.report_problem),
                                  label: const Text('Report', style: TextStyle(fontWeight: FontWeight.bold)),
                                ),
                              ),
                            ],
                          ),
                        const SizedBox(height: 16),
                        if (_isTripActive)
                          SegmentedButton<String>(
                            segments: const [
                              ButtonSegment(
                                value: 'BOARDING',
                                label: Text('Boarding'),
                                icon: Icon(Icons.airline_seat_recline_normal),
                              ),
                              ButtonSegment(
                                value: 'DROPOFF',
                                label: Text('Drop-off'),
                                icon: Icon(Icons.airline_seat_individual_suite),
                              ),
                            ],
                            selected: {_markMode},
                            onSelectionChanged: (selection) =>
                                setState(() => _markMode = selection.first),
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
                                      '${_markMode == 'BOARDING' ? boardedCount : _droppedStudents.values.where((v) => v).length}',
                                      style: const TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.safeGreen,
                                      ),
                                    ),
                                    Text(_markMode == 'BOARDING' ? 'Boarded' : 'Dropped Off'),
                                  ],
                                ),
                                Column(
                                  children: [
                                    Text(
                                      '${_students.length - (boardedCount)}',
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

  Widget _buildGpsChip() {
    return StreamBuilder<Map<String, dynamic>>(
      stream: _locationService.statusStream,
      builder: (context, snapshot) {
        final status = snapshot.data;
        final hasFix = status?['hasFix'] == true;
        final fresh = status?['fresh'] == true;
        final Color color = !hasFix
            ? AppColors.dangerRed
            : fresh
                ? AppColors.safeGreen
                : AppColors.alertOrange;
        final String label = !hasFix
            ? _locationService.isTracking
                ? 'GPS Searching'
                : 'GPS Off'
            : fresh
                ? 'GPS Active'
                : 'GPS Stale';
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.location_on, color: AppColors.white, size: 14),
              const SizedBox(width: 4),
              Text(
                label,
                style: const TextStyle(color: AppColors.white, fontSize: 10),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStudentCard(Map<String, dynamic> student) {
    final id = student['id'];
    final boarded = _boardedStudents[id] == true;
    final dropped = _droppedStudents[id] == true;
    final stop = student['stop'];
    final isBoardingMode = _markMode == 'BOARDING';
    final done = isBoardingMode ? boarded : dropped;
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: done ? AppColors.safeGreen : AppColors.medium,
          child: Icon(done ? Icons.check : Icons.person, color: AppColors.white),
        ),
        title: Text(student['name'] ?? ''),
        subtitle: Text('Stop: ${stop?['name'] ?? 'N/A'}'),
        trailing: done
            ? Chip(
                label: Text(isBoardingMode ? 'Boarded' : 'Dropped'),
                backgroundColor: AppColors.safeGreen,
                labelStyle: const TextStyle(color: AppColors.white),
              )
            : ElevatedButton(
                onPressed: _isTripActive
                    ? () => isBoardingMode ? _markBoarding(id) : _markDropoff(id)
                    : null,
                child: Text(isBoardingMode ? 'Board' : 'Drop'),
              ),
      ),
    );
  }
}
