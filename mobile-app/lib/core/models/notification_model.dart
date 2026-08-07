import 'dart:convert';

class AppNotification {
  final String id;
  final String userId;
  final String userType;
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final bool isRead;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.userId,
    required this.userType,
    required this.title,
    required this.body,
    this.data,
    required this.isRead,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? parsedData;
    final rawData = json['data'];
    if (rawData is String && rawData.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawData);
        if (decoded is Map<String, dynamic>) parsedData = decoded;
      } catch (_) {
        parsedData = null;
      }
    } else if (rawData is Map<String, dynamic>) {
      parsedData = rawData;
    }

    return AppNotification(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      userType: json['userType'] as String? ?? '',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      data: parsedData,
      isRead: (json['isRead'] ?? 0) == 1 || json['isRead'] == true,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  String get timeAgo {
    final now = DateTime.now();
    final difference = now.difference(createdAt);

    if (difference.inDays > 0) {
      return '${difference.inDays} day${difference.inDays > 1 ? 's' : ''} ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hour${difference.inHours > 1 ? 's' : ''} ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} minute${difference.inMinutes > 1 ? 's' : ''} ago';
    } else {
      return 'Just now';
    }
  }

  String get notificationIcon {
    if (title.contains('🟢') || title.contains('started')) return '🟢';
    if (title.contains('📍') || title.contains('approaching')) return '📍';
    if (title.contains('👦') || title.contains('boarded')) return '👦';
    if (title.contains('🏫') || title.contains('reached school')) return '🏫';
    if (title.contains('🚌') || title.contains('return')) return '🚌';
    if (title.contains('🏠') || title.contains('home')) return '🏠';
    return '🔔';
  }
}
