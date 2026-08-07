import 'dart:async';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  Dio? _dio;
  String? _token;
  SharedPreferences? _prefs;

  Future<SharedPreferences> get _sharedPrefs async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  void init() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    _dio!.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_token != null) {
          options.headers['Authorization'] = 'Bearer $_token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          clearToken();
        }
        final isTimeout = error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.receiveTimeout;
        if (isTimeout) {
          final count = error.requestOptions.extra['retryCount'] as int? ?? 0;
          if (count < 3) {
            error.requestOptions.extra['retryCount'] = count + 1;
            await Future.delayed(Duration(seconds: count + 1));
            try {
              final response = await _dio!.fetch(error.requestOptions);
              return handler.resolve(response);
            } catch (_) {}
          }
        }
        return handler.next(error);
      },
    ));
  }

  Future<void> setToken(String token) async {
    _token = token;
    final prefs = await _sharedPrefs;
    await prefs.setString('auth_token', token);
  }

  Future<String?> getToken() async {
    if (_token != null) return _token;
    final prefs = await _sharedPrefs;
    _token = prefs.getString('auth_token');
    return _token;
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await _sharedPrefs;
    await prefs.remove('auth_token');
  }

  Dio get dio {
    if (_dio == null) {
      init();
    }
    return _dio!;
  }

  Future<Response> sendOtp(String phone) {
    return dio.post('/auth/send-otp', data: {'phone': phone});
  }

  Future<Response> verifyOtp(String phone) {
    return dio.post('/auth/verify-otp', data: {'phone': phone});
  }

  Future<Response> loginWithPassword(String identifier, String password) {
    return dio.post('/auth/login', data: {'identifier': identifier, 'password': password});
  }

  Future<Response> activateAccount(String token, String password) {
    return dio.post('/auth/activate', data: {'token': token, 'password': password});
  }

  Future<Response> getBuses({int page = 1, int limit = 10}) {
    return dio.get('/buses', queryParameters: {'page': page, 'limit': limit});
  }

  Future<Response> getBusById(String id) {
    return dio.get('/buses/$id');
  }

  Future<Response> getBusLiveLocation(String busId) {
    return dio.get('/buses/$busId/live-location');
  }

  Future<Response> getStudents({int page = 1, int limit = 10}) {
    return dio.get('/students', queryParameters: {'page': page, 'limit': limit});
  }

  Future<Response> getMyChildren() {
    return dio.get('/students/my-children');
  }

  Future<Response> getActiveTrips() {
    return dio.get('/trips/active');
  }

  Future<Response> getTripHistory({int page = 1, int limit = 10}) {
    return dio.get('/trips/history', queryParameters: {'page': page, 'limit': limit});
  }

  Future<Response> startTrip(String busId, String type) {
    return dio.post('/trips/start', data: {'busId': busId, 'type': type});
  }

  Future<Response> endTrip(String tripId) {
    return dio.post('/trips/$tripId/end');
  }

  Future<Response> markBoarding(String studentId, String tripId) {
    return dio.post('/attendance/board', data: {'studentId': studentId, 'tripId': tripId});
  }

  Future<Response> markDropoff(String studentId, String tripId) {
    return dio.post('/attendance/drop', data: {'studentId': studentId, 'tripId': tripId});
  }

  Future<Response> getTripAttendance(String tripId) {
    return dio.get('/attendance/trip/$tripId');
  }

  Future<Response> updateLocation(String tripId, double latitude, double longitude, {
    double? speed,
    double? heading,
    double? accuracy,
  }) {
    return dio.post('/location/update', data: {
      'tripId': tripId,
      'latitude': latitude,
      'longitude': longitude,
      'speed': speed,
      'heading': heading,
      'accuracy': accuracy,
    }, options: Options(receiveTimeout: const Duration(seconds: 10)));
  }

  Future<Response> getFleetLocations() {
    return dio.get('/location/fleet');
  }

  Future<Response> getNotifications({int page = 1, int limit = 20}) {
    return dio.get('/notifications', queryParameters: {'page': page, 'limit': limit});
  }

  Future<Response> markNotificationAsRead(String id) {
    return dio.put('/notifications/$id/read');
  }

  Future<Response> markAllNotificationsAsRead() {
    return dio.put('/notifications/read-all');
  }

  Future<Response> getRoutes({int page = 1, int limit = 10}) {
    return dio.get('/routes', queryParameters: {'page': page, 'limit': limit});
  }

  Future<Response> getDriverProfile() {
    return dio.get('/drivers/profile');
  }

  Future<Response> sendFcmToken(String fcmToken) {
    return dio.post('/auth/fcm-token', data: {'fcmToken': fcmToken});
  }

  Future<Response> createLeaveRequest(String studentId, String date, {String reason = ''}) {
    return dio.post('/leaves', data: {'studentId': studentId, 'date': date, 'reason': reason});
  }

  Future<Response> getMyLeaveRequests() {
    return dio.get('/leaves');
  }

  Future<Response> reportIncident(String tripId, String type, {String details = ''}) {
    return dio.post('/notifications/incident-report', data: {'tripId': tripId, 'type': type, 'details': details});
  }

  Future<Response> getAnnouncements({int page = 1, int limit = 20}) {
    return dio.get('/announcements', queryParameters: {'page': page, 'limit': limit});
  }
}
