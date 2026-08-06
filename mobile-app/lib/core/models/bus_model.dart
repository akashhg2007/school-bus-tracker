class Bus {
  final String id;
  final String busNumber;
  final String plateNumber;
  final int capacity;
  final String schoolId;
  final String? driverId;
  final String? routeId;
  final bool isActive;
  final int? studentCount;
  final DriverInfo? driver;
  final RouteInfo? route;

  Bus({
    required this.id,
    required this.busNumber,
    required this.plateNumber,
    required this.capacity,
    required this.schoolId,
    this.driverId,
    this.routeId,
    this.isActive = true,
    this.studentCount,
    this.driver,
    this.route,
  });

  factory Bus.fromJson(Map<String, dynamic> json) {
    return Bus(
      id: json['id'],
      busNumber: json['busNumber'],
      plateNumber: json['plateNumber'],
      capacity: json['capacity'],
      schoolId: json['schoolId'],
      driverId: json['driverId'],
      routeId: json['routeId'],
      isActive: json['isActive'] ?? true,
      studentCount: json['_count']?['students'],
      driver: json['driver'] != null ? DriverInfo.fromJson(json['driver']) : null,
      route: json['route'] != null ? RouteInfo.fromJson(json['route']) : null,
    );
  }
}

class DriverInfo {
  final String id;
  final String name;
  final String phone;

  DriverInfo({
    required this.id,
    required this.name,
    required this.phone,
  });

  factory DriverInfo.fromJson(Map<String, dynamic> json) {
    return DriverInfo(
      id: json['id'],
      name: json['name'],
      phone: json['phone'],
    );
  }
}

class RouteInfo {
  final String id;
  final String name;

  RouteInfo({
    required this.id,
    required this.name,
  });

  factory RouteInfo.fromJson(Map<String, dynamic> json) {
    return RouteInfo(
      id: json['id'],
      name: json['name'],
    );
  }
}
