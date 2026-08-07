import 'package:flutter/material.dart';
import '../../core/config/theme.dart';
import '../../core/services/api_service.dart';
import '../../core/services/auth_service.dart';
import '../../shared/screens/login_screen.dart';

class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  int _currentIndex = 0;
  List<Map<String, dynamic>> _buses = [];
  List<Map<String, dynamic>> _activeTrips = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final api = ApiService();

      // Load buses
      final busesRes = await api.getBuses();
      if (busesRes.statusCode == 200) {
        final data = busesRes.data['data'];
        _buses = List<Map<String, dynamic>>.from(data is Map ? data['buses'] ?? [] : data ?? []);
      }

      // Load active trips
      try {
        final tripsRes = await api.getActiveTrips();
        if (tripsRes.statusCode == 200) {
          final data = tripsRes.data['data'];
          _activeTrips = List<Map<String, dynamic>>.from(data is List ? data : []);
        }
      } catch (_) {}

      setState(() => _loading = false);
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load data: $e')),
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
            onPressed: () {
              Navigator.pop(context);
              AuthService().logout();
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => LoginScreen()));
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
        title: const Text('Admin Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _confirmLogout,
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: [_buildDashboardTab(), _buildSettingsTab()],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Settings'),
        ],
      ),
    );
  }

  Widget _buildDashboardTab() {
    if (_loading) return const Center(child: CircularProgressIndicator());
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
                  Text('Welcome, ${AuthService().userName ?? 'Admin'}!', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.deepBlue)),
                  const SizedBox(height: 8),
                  const Text('School Bus Management', style: TextStyle(color: AppColors.medium)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildStatCard(title: 'Buses', value: '${_buses.length}', icon: Icons.directions_bus, color: AppColors.skyBlue)),
              const SizedBox(width: 12),
              Expanded(child: _buildStatCard(title: 'Active Trips', value: '${_activeTrips.length}', icon: Icons.check_circle, color: AppColors.safeGreen)),
            ],
          ),
          const SizedBox(height: 16),
          const Text('Buses', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (_buses.isEmpty)
            const Card(child: Padding(padding: EdgeInsets.all(16), child: Center(child: Text('No buses found'))))
          else
            ..._buses.map((bus) {
              final driver = bus['driver'];
              return _buildTripCard(
                busNumber: bus['busNumber'] ?? '',
                driver: driver?['name'] ?? 'No driver',
                status: 'Active',
                statusColor: AppColors.safeGreen,
              );
            }),
          if (_activeTrips.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text('Active Trips', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._activeTrips.map((trip) {
              final bus = trip['bus'];
              return _buildTripCard(
                busNumber: bus?['busNumber'] ?? 'N/A',
                driver: trip['driver']?['name'] ?? 'N/A',
                status: trip['type'] ?? 'TRIP',
                statusColor: AppColors.alertOrange,
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildSettingsTab() {
    final auth = AuthService();
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          const SizedBox(height: 20),
          const CircleAvatar(radius: 50, backgroundColor: AppColors.deepBlue, child: Icon(Icons.person, size: 60, color: AppColors.white)),
          const SizedBox(height: 16),
          Text(auth.userName ?? 'Admin', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.dark)),
          const SizedBox(height: 32),
          _buildSettingsMenuItem(icon: Icons.school, title: 'School Bus Tracker v1.0', onTap: () {}),
          _buildSettingsMenuItem(icon: Icons.logout, title: 'Logout', color: AppColors.dangerRed, onTap: _confirmLogout),
        ],
      ),
    );
  }

  Widget _buildStatCard({required String title, required String value, required IconData icon, required Color color}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [Icon(icon, color: color, size: 24), const Spacer(), Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: color))]),
            const SizedBox(height: 8),
            Text(title, style: const TextStyle(color: AppColors.medium)),
          ],
        ),
      ),
    );
  }

  Widget _buildTripCard({required String busNumber, required String driver, required String status, required Color statusColor}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)), child: Icon(Icons.directions_bus, color: statusColor)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(busNumber, style: const TextStyle(fontWeight: FontWeight.bold)), Text(driver, style: const TextStyle(color: AppColors.medium, fontSize: 12))])),
            Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)), child: Text(status, style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold))),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsMenuItem({required IconData icon, required String title, Color? color, required VoidCallback onTap}) {
    return Card(
      child: ListTile(leading: Icon(icon, color: color ?? AppColors.dark), title: Text(title, style: TextStyle(color: color ?? AppColors.dark)), trailing: const Icon(Icons.chevron_right), onTap: onTap),
    );
  }
}
