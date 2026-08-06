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
    return AppNotification(
      id: json['id'],
      userId: json['userId'],
      userType: json['userType'],
      title: json['title'],
      body: json['body'],
      data: json['data'],
      isRead: json['isRead'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
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
