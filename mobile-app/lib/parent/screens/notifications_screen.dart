import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/config/theme.dart';
import '../../core/services/api_service.dart';
import '../../core/services/socket_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _notifications = [];
  bool _loading = true;
  StreamSubscription? _notificationSubscription;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _notificationSubscription = SocketService().notificationStream.listen((n) {
      if (!mounted) return;
      setState(() {
        _notifications.insert(0, n);
      });
    });
  }

  @override
  void dispose() {
    _notificationSubscription?.cancel();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    try {
      final api = ApiService();
      final response = await api.getNotifications();
      if (response.statusCode == 200) {
        final data = response.data['data'];
        setState(() {
          _notifications = List<Map<String, dynamic>>.from(data is Map ? data['notifications'] ?? [] : data ?? []);
          _loading = false;
        });
      }
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? const Center(child: Text('No notifications'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _notifications.length,
                  itemBuilder: (context, index) {
                    final n = _notifications[index];
                    final isRead = n['isRead'] == 1;
                    return Card(
                      color: !isRead ? AppColors.skyBlue.withOpacity(0.05) : null,
                      child: ListTile(
                        leading: Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(color: AppColors.skyBlue.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                          child: const Icon(Icons.notifications, color: AppColors.skyBlue),
                        ),
                        title: Text(n['title'] ?? '', style: TextStyle(fontWeight: !isRead ? FontWeight.bold : FontWeight.normal)),
                        subtitle: Text(n['body'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                        trailing: Text(_formatTime(n['createdAt']), style: const TextStyle(color: AppColors.medium, fontSize: 12)),
                      ),
                    );
                  },
                ),
    );
  }

  String _formatTime(String? dateTime) {
    if (dateTime == null) return '';
    try {
      final dt = DateTime.parse(dateTime);
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (_) {
      return '';
    }
  }
}
