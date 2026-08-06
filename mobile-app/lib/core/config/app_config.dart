class AppConfig {
  static const String appName = 'School Bus Tracker';
  static const String appVersion = '1.0.0';
  
  // API Configuration
  static const String apiBaseUrl = 'http://localhost:3000/api';
  
  // Map Configuration (OpenStreetMap)
  static const String mapTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  static const String mapAttribution = '© OpenStreetMap contributors';
  
  // Location Update Interval
  static const int locationUpdateInterval = 5; // seconds
  static const int locationUpdateDistance = 10; // meters
  
  // Notification Settings
  static const String fcmSenderId = 'YOUR_FCM_SENDER_ID';
}
