class AppConfig {
  static const String appName = 'School Bus Tracker';
  static const String appVersion = '1.0.0';

  static String get apiBaseUrl {
    const override = String.fromEnvironment('API_BASE_URL');
    if (override.isNotEmpty) return override;
    return 'https://school-bus-tracker-atim.onrender.com/api';
  }

  static const String mapTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  static const String mapAttribution = '\u00a9 OpenStreetMap contributors';
  static const double mapMinZoom = 3;
  static const double mapMaxZoom = 19;
  static const double mapDefaultZoom = 15;
  static const double mapFollowZoom = 17;
  static const double mapRouteZoom = 13;
  static const double mapSouthLimit = 6.0;
  static const double mapNorthLimit = 37.0;
  static const double mapWestLimit = 68.0;
  static const double mapEastLimit = 97.0;
  static const Duration mapFollowDuration = Duration(milliseconds: 900);

  static const int locationUpdateInterval = 5;
  static const int locationUpdateDistance = 10;

  static String get fcmSenderId {
    const override = String.fromEnvironment('FCM_SENDER_ID');
    if (override.isNotEmpty) return override;
    return '';
  }
}
