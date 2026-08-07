class AppConfig {
  static const String appName = 'School Bus Tracker';
  static const String appVersion = '1.0.0';
  
  // API Configuration
  static const String apiBaseUrl = 'https://school-bus-tracker-atim.onrender.com/api';
  
  // Map Configuration (OpenStreetMap) - tune manually here
  static const String mapTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  static const String mapAttribution = '\u00a9 OpenStreetMap contributors';
  static const double mapMinZoom = 3;
  static const double mapMaxZoom = 19;
  static const double mapDefaultZoom = 15;
  static const double mapFollowZoom = 17;     // zoom when following the bus/your location
  static const double mapRouteZoom = 13;     // zoom for route overview
  static const double mapSouthLimit = 6.0;   // clamp map to deployment area
  static const double mapNorthLimit = 37.0;
  static const double mapWestLimit = 68.0;
  static const double mapEastLimit = 97.0;
  static const Duration mapFollowDuration = Duration(milliseconds: 900);
  
  // Location Update Interval
  static const int locationUpdateInterval = 5; // seconds
  static const int locationUpdateDistance = 10; // meters
  
  // Notification Settings (configured via Firebase service account, not FCM sender ID)
  static const String fcmSenderId = '730117995890';
}
