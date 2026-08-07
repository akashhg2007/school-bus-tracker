import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/config/app_config.dart';
import '../../core/config/theme.dart';

class OsmMapWidget extends StatelessWidget {
  final LatLng center;
  final double zoom;
  final List<Marker> markers;
  final List<Polyline> polylines;
  final MapController? controller;
  final bool showMyLocation;
  final Function(TapPosition, LatLng)? onTap;
  final void Function(MapEvent)? onMapEvent;

  const OsmMapWidget({
    super.key,
    required this.center,
    this.zoom = 15.0,
    this.markers = const [],
    this.polylines = const [],
    this.controller,
    this.showMyLocation = false,
    this.onTap,
    this.onMapEvent,
  });

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: controller,
      options: MapOptions(
        initialCenter: center,
        initialZoom: zoom,
        onTap: onTap != null ? (tapPos, latLng) => onTap!(tapPos, latLng) : null,
        onMapEvent: onMapEvent,
      ),
      children: [
        TileLayer(
          urlTemplate: AppConfig.mapTileUrl,
          userAgentPackageName: 'com.schoolbustracker.app',
        ),
        PolylineLayer(
          polylines: polylines,
        ),
        MarkerLayer(
          markers: markers,
        ),
        RichAttributionWidget(
          attributions: [
            TextSourceAttribution(
              AppConfig.mapAttribution,
              textStyle: const TextStyle(fontSize: 10),
            ),
          ],
        ),
      ],
    );
  }
}

Marker buildBusMarker(LatLng position, double? heading, String busNumber, bool isActive) {
  return Marker(
    point: position,
    width: 50,
    height: 50,
    child: Transform.rotate(
      angle: heading != null ? heading * 3.14159 / 180 : 0,
      child: Container(
        decoration: BoxDecoration(
          color: isActive ? AppColors.safeGreen : AppColors.medium,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: const Icon(
          Icons.directions_bus,
          color: AppColors.white,
          size: 30,
        ),
      ),
    ),
  );
}

Marker buildStopMarker(LatLng position, String name, bool isNextStop) {
  return Marker(
    point: position,
    width: 40,
    height: 40,
    child: Container(
      decoration: BoxDecoration(
        color: isNextStop ? AppColors.alertOrange : AppColors.skyBlue,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: const Icon(
        Icons.stop_circle,
        color: AppColors.white,
        size: 24,
      ),
    ),
  );
}

Marker buildParentMarker(LatLng position, String studentName) {
  return Marker(
    point: position,
    width: 40,
    height: 40,
    child: Container(
      decoration: BoxDecoration(
        color: AppColors.dangerRed,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: const Icon(
        Icons.home,
        color: AppColors.white,
        size: 24,
      ),
    ),
  );
}
