class Student {
  final String id;
  final String name;
  final String rollNumber;
  final String parentId;
  final String? busId;
  final String? stopId;
  final BusInfo? bus;
  final StopInfo? stop;

  Student({
    required this.id,
    required this.name,
    required this.rollNumber,
    required this.parentId,
    this.busId,
    this.stopId,
    this.bus,
    this.stop,
  });

  factory Student.fromJson(Map<String, dynamic> json) {
    return Student(
      id: json['id'],
      name: json['name'],
      rollNumber: json['rollNumber'],
      parentId: json['parentId'],
      busId: json['busId'],
      stopId: json['stopId'],
      bus: json['bus'] != null ? BusInfo.fromJson(json['bus']) : null,
      stop: json['stop'] != null ? StopInfo.fromJson(json['stop']) : null,
    );
  }
}

class BusInfo {
  final String id;
  final String busNumber;

  BusInfo({
    required this.id,
    required this.busNumber,
  });

  factory BusInfo.fromJson(Map<String, dynamic> json) {
    return BusInfo(
      id: json['id'],
      busNumber: json['busNumber'],
    );
  }
}

class StopInfo {
  final String id;
  final String name;

  StopInfo({
    required this.id,
    required this.name,
  });

  factory StopInfo.fromJson(Map<String, dynamic> json) {
    return StopInfo(
      id: json['id'],
      name: json['name'],
    );
  }
}
