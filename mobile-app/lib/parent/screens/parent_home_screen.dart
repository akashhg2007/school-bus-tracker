import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/config/theme.dart';
import '../../core/services/api_service.dart';
import '../../core/services/auth_service.dart';
import '../../shared/map/osm_map_widget.dart';
import '../../shared/screens/login_screen.dart';
import 'bus_tracking_screen.dart';
import 'notifications_screen.dart';

class ParentHomeScreen extends StatefulWidget {
  const ParentHomeScreen({super.key});

  @override
  State<ParentHomeScreen> createState() => _ParentHomeScreenState();
}

class _ParentHomeScreenState extends State<ParentHomeScreen> {
  int _currentIndex = 0;
  final MapController _mapController = MapController();
  final LatLng _defaultLocation = const LatLng(12.9716, 77.5946);
  List<Map<String, dynamic>> _children = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadChildren();
  }

  Future<void> _loadChildren() async {
    try {
      final api = ApiService();
      final response = await api.getMyChildren();
      if (response.statusCode == 200) {
        final data = response.data['data'];
        setState(() {
          _children = List<Map<String, dynamic>>.from(data);
          _loading = false;
        });
      }
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthService();
    return Scaffold(
      appBar: AppBar(
        title: const Text('School Bus Tracker'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const NotificationsScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              auth.logout();
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => LoginScreen()));
            },
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: [_buildHomeTab(), _buildRouteTab(), _buildProfileTab()],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.map), label: 'Route'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildHomeTab() {
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
                  Text('Welcome, ${AuthService().userName ?? 'Parent'}!', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.deepBlue)),
                  const SizedBox(height: 8),
                  const Text('Track your child\'s bus in real-time', style: TextStyle(color: AppColors.medium)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            clipBehavior: Clip.antiAlias,
            child: SizedBox(
              height: 200,
              child: OsmMapWidget(center: _defaultLocation, zoom: 13.0, controller: _mapController),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Quick Actions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.dark)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildActionCard(icon: Icons.directions_bus, title: 'Track Bus', color: AppColors.skyBlue, onTap: () {
                if (_children.isNotEmpty) {
                  final child = _children.first;
                  final bus = child['bus'];
                  if (bus != null) {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => BusTrackingScreen(busId: bus['id'], busNumber: bus['busNumber'])));
                  }
                }
              })),
              const SizedBox(width: 12),
              Expanded(child: _buildActionCard(icon: Icons.route, title: 'View Route', color: AppColors.safeGreen, onTap: () => setState(() => _currentIndex = 1))),
            ],
          ),
          const SizedBox(height: 16),
          const Text('My Children', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.dark)),
          const SizedBox(height: 12),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_children.isEmpty)
            const Card(child: Padding(padding: EdgeInsets.all(16), child: Center(child: Text('No children registered'))))
          else
            ..._children.map((child) {
              final bus = child['bus'];
              final stop = child['stop'];
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _buildChildCard(
                  name: child['name'] ?? '',
                  busNumber: bus?['busNumber'] ?? 'N/A',
                  stop: stop?['name'] ?? 'N/A',
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildRouteTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.route, size: 80, color: AppColors.medium.withOpacity(0.5)),
          const SizedBox(height: 16),
          const Text('Route Information', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.dark)),
        ],
      ),
    );
  }

  Widget _buildProfileTab() {
    final auth = AuthService();
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          const SizedBox(height: 20),
          const CircleAvatar(radius: 50, backgroundColor: AppColors.deepBlue, child: Icon(Icons.person, size: 60, color: AppColors.white)),
          const SizedBox(height: 16),
          Text(auth.userName ?? 'Parent', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.dark)),
          const SizedBox(height: 32),
          _buildProfileMenuItem(icon: Icons.child_care, title: 'My Children', onTap: () {}),
          _buildProfileMenuItem(icon: Icons.notifications, title: 'Notifications', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const NotificationsScreen()))),
          _buildProfileMenuItem(icon: Icons.logout, title: 'Logout', color: AppColors.dangerRed, onTap: () {
            auth.logout();
            Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => LoginScreen()));
          }),
        ],
      ),
    );
  }

  Widget _buildActionCard({required IconData icon, required String title, required Color color, required VoidCallback onTap}) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [Icon(icon, size: 40, color: color), const SizedBox(height: 8), Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.dark))]),
        ),
      ),
    );
  }

  Widget _buildChildCard({required String name, required String busNumber, required String stop}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const CircleAvatar(backgroundColor: AppColors.skyBlue, child: Icon(Icons.child_care, color: AppColors.white)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 4),
                  Text('Bus: $busNumber \u2022 Stop: $stop', style: const TextStyle(color: AppColors.medium, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileMenuItem({required IconData icon, required String title, Color? color, required VoidCallback onTap}) {
    return Card(
      child: ListTile(
        leading: Icon(icon, color: color ?? AppColors.dark),
        title: Text(title, style: TextStyle(color: color ?? AppColors.dark)),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
