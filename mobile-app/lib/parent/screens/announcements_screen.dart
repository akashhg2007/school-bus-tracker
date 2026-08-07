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

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await _api.getAnnouncements();
      setState(() {
        _announcements = List<Map<String, dynamic>>.from(response.data['data']['announcements'] ?? []);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Announcements')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _announcements.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 120),
                        Center(child: Text('No announcements yet')),
                      ],
                    )
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      itemCount: _announcements.length,
                      itemBuilder: (context, index) {
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
    );
  }
}