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
  bool _hasMore = true;
  int _currentPage = 1;
  final int _pageSize = 20;
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
      final response = await api.getNotifications(page: _currentPage, limit: _pageSize);
      if (response.statusCode == 200) {
        final data = response.data['data'];
        final newItems = List<Map<String, dynamic>>.from(data is Map ? data['notifications'] ?? [] : data ?? []);
        setState(() {
          if (_currentPage == 1) {
            _notifications = newItems;
          } else {
            _notifications.addAll(newItems);
          }
          _hasMore = newItems.length >= _pageSize;
          _loading = false;
        });
      }
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load notifications: $e')),
        );
      }
    }
  }

  void _loadMore() {
    if (!_hasMore || _loading) return;
    _currentPage++;
    _loadNotifications();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? const Center(child: Text('No notifications'))
              : NotificationListener<ScrollNotification>(
                  onNotification: (notification) {
                    if (notification is ScrollEndNotification &&
                        notification.metrics.pixels >= notification.metrics.maxScrollExtent - 100) {
                      _loadMore();
                    }
                    return false;
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _notifications.length + (_hasMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _notifications.length) {
                        return const Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }
                      final n = _notifications[index];
                      final isRead = n['isRead'] == 1;
                      return Card(
                        color: !isRead ? AppColors.skyBlue.withValues(alpha: 0.05) : null,
                        child: ListTile(
                          leading: Container(
                            width: 40, height: 40,
                            decoration: BoxDecoration(color: AppColors.skyBlue.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                            child: const Icon(Icons.notifications, color: AppColors.skyBlue),
                          ),
                          title: Text(n['title'] ?? '', style: TextStyle(fontWeight: !isRead ? FontWeight.bold : FontWeight.normal)),
                          subtitle: Text(n['body'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                          trailing: Text(_formatTime(n['createdAt']), style: const TextStyle(color: AppColors.medium, fontSize: 12)),
                        ),
                      );
                    },
                  ),
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
