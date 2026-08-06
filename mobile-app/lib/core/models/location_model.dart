class BusLocation {
  final String tripId;
  final String busId;
  final String busNumber;
  final double latitude;
  final double longitude;
  final double? speed;
  final double? heading;
  final String? driverName;
  final NextStop? nextStop;
  final DateTime timestamp;

  BusLocation({
    required this.tripId,
    required this.busId,
    required this.busNumber,
    required this.latitude,
    required this.longitude,
    this.speed,
    this.heading,
    this.driverName,
    this.nextStop,
    required this.timestamp,
  });

  factory BusLocation.fromJson(Map<String, dynamic> json) {
    return BusLocation(
      tripId: json['tripId'],
      busId: json['busId'],
      busNumber: json['busNumber'],
      latitude: json['latitude'].toDouble(),
      longitude: json['longitude'].toDouble(),
      speed: json['speed']?.toDouble(),
      heading: json['heading']?.toDouble(),
      driverName: json['driverName'],
      nextStop: json['nextStop'] != null ? NextStop.fromJson(json['nextStop']) : null,
      timestamp: DateTime.parse(json['timestamp']),
    );
  }
}

class NextStop {
  final String id;
  final String name;
  final int? eta;
  final double? distance;

  NextStop({
    required this.id,
    required this.name,
    this.eta,
    this.distance,
  });

  factory NextStop.fromJson(Map<String, dynamic> json) {
    return NextStop(
      id: json['id'],
      name: json['name'],
      eta: json['eta'],
      distance: json['distance']?.toDouble(),
    );
  }
}

class GpsLocation {
  final String id;
  final String tripId;
  final double latitude;
  final double longitude;
  final double? speed;
  final double? heading;
  final double? accuracy;
  final DateTime createdAt;

  GpsLocation({
    required this.id,
    required this.tripId,
    required this.latitude,
    required this.longitude,
    this.speed,
    this.heading,
    this.accuracy,
    required this.createdAt,
  });

  factory GpsLocation.fromJson(Map<String, dynamic> json) {
    return GpsLocation(
      id: json['id'],
      tripId: json['tripId'],
      latitude: json['latitude'].toDouble(),
      longitude: json['longitude'].toDouble(),
      speed: json['speed']?.toDouble(),
      heading: json['heading']?.toDouble(),
      accuracy: json['accuracy']?.toDouble(),
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
