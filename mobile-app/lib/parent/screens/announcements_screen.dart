import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/config/theme.dart';
import '../../core/services/api_service.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  final ApiService _api = ApiService();
  List<Map<String, dynamic>> _announcements = [];
  bool _loading = true;
  bool _hasMore = true;
  int _currentPage = 1;
  final int _pageSize = 20;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await _api.getAnnouncements(page: _currentPage, limit: _pageSize);
      final newItems = List<Map<String, dynamic>>.from(response.data['data']['announcements'] ?? []);
      setState(() {
        if (_currentPage == 1) {
          _announcements = newItems;
        } else {
          _announcements.addAll(newItems);
        }
        _hasMore = newItems.length >= _pageSize;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load announcements: $e')),
        );
      }
    }
  }

  void _loadMore() {
    if (!_hasMore || _loading) return;
    _currentPage++;
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Announcements')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () async {
                _currentPage = 1;
                await _load();
              },
              child: _announcements.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 120),
                        Center(child: Text('No announcements yet')),
                      ],
                    )
                  : NotificationListener<ScrollNotification>(
                      onNotification: (notification) {
                        if (notification is ScrollEndNotification &&
                            notification.metrics.pixels >= notification.metrics.maxScrollExtent - 100) {
                          _loadMore();
                        }
                        return false;
                      },
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        itemCount: _announcements.length + (_hasMore ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index == _announcements.length) {
                            return const Padding(
                              padding: EdgeInsets.all(16),
                              child: Center(child: CircularProgressIndicator()),
                            );
                          }
                          final a = _announcements[index];
                          final date = DateTime.tryParse(a['createdAt'] ?? '');
                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.campaign, size: 20, color: AppColors.deepBlue),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          a['title'] ?? '',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.dark),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (date != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      DateFormat('MMM d, yyyy').format(date),
                                      style: const TextStyle(fontSize: 12, color: AppColors.medium),
                                    ),
                                  ],
                                  const SizedBox(height: 8),
                                  Text(a['body'] ?? '', style: const TextStyle(fontSize: 14, color: AppColors.dark)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
            ),
    );
  }
}
