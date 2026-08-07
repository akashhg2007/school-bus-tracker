import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/theme.dart';
import '../../core/services/api_service.dart';
import '../../core/services/location_service.dart';
import '../../shared/map/osm_map_widget.dart';

class RouteView extends StatefulWidget {
  final String? busId;
  final String? busNumber;

  const RouteView({super.key, this.busId, this.busNumber});

  @override
  State<RouteView> createState() => _RouteViewState();
}

class _RouteViewState extends State<RouteView> {
  final MapController _mapController = MapController();
  final LatLng _defaultLocation = const LatLng(12.9716, 77.5946);
  LatLng? _userLocation;
  List<Map<String, dynamic>> _stops = [];
  String? _driverName;
  String? _driverPhone;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadRoute();
    _getUserLocation();
  }

  Future<void> _getUserLocation() async {
    try {
      final location = await LocationService().getCurrentLatLng();
      if (location != null && mounted) {
        setState(() => _userLocation = location);
        if (_stops.isEmpty) _moveCamera(location, 15);
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
    }
  }

  void _moveCamera(LatLng pos, double zoom) {
    try {
      _mapController.move(pos, zoom);
    } catch (_) {}
  }

  Future<void> _loadRoute() async {
    if (widget.busId == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final api = ApiService();
      final response = await api.getBusById(widget.busId!);
      if (response.statusCode == 200) {
        final bus = response.data['data'];
        setState(() {
          _stops = List<Map<String, dynamic>>.from(bus['route']?['stops'] ?? []);
          _driverName = bus['driver']?['name'];
          _driverPhone = bus['driver']?['phone'];
          _loading = false;
        });
      }
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load route: $e')),
        );
      }
    }
  }

  Future<void> _callDriver() async {
    final phone = _driverPhone;
    if (phone == null) return;
    final uri = Uri.parse('tel:+$phone');
    try {
      await launchUrl(uri);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: SizedBox(
                    height: 240,
                    child: OsmMapWidget(
                      center: _stops.isNotEmpty
                          ? LatLng(
                              (_stops.first['latitude'] as num).toDouble(),
                              (_stops.first['longitude'] as num).toDouble(),
                            )
                          : _defaultLocation,
                      zoom: 13.0,
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
                ),
                const SizedBox(height: 16),
                if (_driverName != null)
                  Card(
                    child: ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: AppColors.skyBlue,
                        child: Icon(Icons.person, color: AppColors.white),
                      ),
                      title: Text(_driverName!),
                      subtitle: Text(_driverPhone != null ? 'Driver \u2022 $_driverPhone' : 'Driver'),
                      trailing: _driverPhone != null
                          ? IconButton(
                              icon: const Icon(Icons.call, color: AppColors.safeGreen),
                              onPressed: _callDriver,
                            )
                          : null,
                    ),
                  ),
                const SizedBox(height: 16),
                const Text('Route Stops', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                if (_stops.isEmpty)
                  const Card(child: Padding(padding: EdgeInsets.all(16), child: Center(child: Text('No stops on this route')))),
                ..._stops.map((stop) => Card(
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
                              '${stop['order']}',
                              style: const TextStyle(
                                color: AppColors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        title: Text(stop['name'] ?? ''),
                      ),
                    )),
              ],
            ),
          );
  }
}
