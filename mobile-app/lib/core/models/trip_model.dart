class Trip {
  final String id;
  final String busId;
  final String driverId;
  final String type;
  final String status;
  final DateTime? startTime;
  final DateTime? endTime;
  final BusInfo? bus;
  final DriverInfo? driver;
  final int? studentCount;

  Trip({
    required this.id,
    required this.busId,
    required this.driverId,
    required this.type,
    required this.status,
    this.startTime,
    this.endTime,
    this.bus,
    this.driver,
    this.studentCount,
  });

  factory Trip.fromJson(Map<String, dynamic> json) {
    return Trip(
      id: json['id'],
      busId: json['busId'],
      driverId: json['driverId'],
      type: json['type'],
      status: json['status'],
      startTime: json['startTime'] != null ? DateTime.parse(json['startTime']) : null,
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime']) : null,
      bus: json['bus'] != null ? BusInfo.fromJson(json['bus']) : null,
      driver: json['driver'] != null ? DriverInfo.fromJson(json['driver']) : null,
      studentCount: json['_count']?['attendance'],
    );
  }

  bool get isActive => status == 'IN_PROGRESS';
  bool get isMorning => type == 'MORNING';
}

class BusInfo {
  final String id;
  final String busNumber;
  final String? plateNumber;

  BusInfo({
    required this.id,
    required this.busNumber,
    this.plateNumber,
  });

  factory BusInfo.fromJson(Map<String, dynamic> json) {
    return BusInfo(
      id: json['id'],
      busNumber: json['busNumber'],
      plateNumber: json['plateNumber'],
    );
  }
}

class DriverInfo {
  final String id;
  final String name;
  final String? phone;

  DriverInfo({
    required this.id,
    required this.name,
    this.phone,
  });

  factory DriverInfo.fromJson(Map<String, dynamic> json) {
    return DriverInfo(
      id: json['id'],
      name: json['name'],
      phone: json['phone'],
    );
  }
}
