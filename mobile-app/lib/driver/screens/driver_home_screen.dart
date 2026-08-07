import 'package:flutter/material.dart';
import '../../core/config/theme.dart';
import '../../core/services/api_service.dart';
import '../../core/services/auth_service.dart';
import '../../shared/screens/login_screen.dart';
import 'trip_screen.dart';

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  int _currentIndex = 0;
  Map<String, dynamic>? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final api = ApiService();
      final response = await api.getDriverProfile();
      if (response.statusCode == 200) {
        setState(() {
          _profile = response.data['data'];
          _loading = false;
        });
      }
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load profile: $e')),
        );
      }
    }
  }

  void _confirmLogout() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await AuthService().logout();
              if (mounted) {
                Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => LoginScreen()));
              }
            },
            child: const Text('Logout', style: TextStyle(color: AppColors.dangerRed)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _confirmLogout,
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: [_buildHomeTab(), _buildProfileTab()],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildHomeTab() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final bus = _profile?['bus'];
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Hello, ${_profile?['name'] ?? 'Driver'}!', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.deepBlue)),
                  const SizedBox(height: 8),
                  Text(bus != null ? 'Bus: ${bus['plateNumber']}' : 'No bus assigned', style: const TextStyle(color: AppColors.medium)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (bus != null)
            Card(
              color: AppColors.safeGreen.withValues(alpha: 0.1),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(children: [
                  const CircleAvatar(backgroundColor: AppColors.safeGreen, child: Icon(Icons.directions_bus, color: AppColors.white)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(bus['busNumber'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text('Capacity: ${bus['capacity']} seats', style: const TextStyle(color: AppColors.medium)),
                  ])),
                ]),
              ),
            ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 60,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.safeGreen),
              onPressed: bus != null ? () => Navigator.push(context, MaterialPageRoute(builder: (context) => TripScreen(busId: bus['id'], busNumber: bus['busNumber']))) : null,
              icon: const Icon(Icons.play_arrow, size: 30),
              label: const Text('Start Trip', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileTab() {
    final bus = _profile?['bus'];
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          const SizedBox(height: 20),
          const CircleAvatar(radius: 50, backgroundColor: AppColors.deepBlue, child: Icon(Icons.person, size: 60, color: AppColors.white)),
          const SizedBox(height: 16),
          Text(_profile?['name'] ?? 'Driver', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.dark)),
          const SizedBox(height: 8),
          Text(_profile?['phone'] ?? '', style: const TextStyle(color: AppColors.medium)),
          const SizedBox(height: 32),
          if (bus != null)
            _buildProfileMenuItem(icon: Icons.directions_bus, title: 'My Bus: ${bus['busNumber'] ?? ''}', onTap: () {}),
          _buildProfileMenuItem(icon: Icons.logout, title: 'Logout', color: AppColors.dangerRed, onTap: _confirmLogout),
        ],
      ),
    );
  }

  Widget _buildProfileMenuItem({required IconData icon, required String title, Color? color, required VoidCallback onTap}) {
    return Card(
      child: ListTile(leading: Icon(icon, color: color ?? AppColors.dark), title: Text(title, style: TextStyle(color: color ?? AppColors.dark)), trailing: const Icon(Icons.chevron_right), onTap: onTap),
    );
  }
}
