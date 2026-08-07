import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/config/theme.dart';
import '../../core/services/api_service.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/location_service.dart';
import '../../core/services/socket_service.dart';
import '../../shared/map/osm_map_widget.dart';
import '../../shared/screens/login_screen.dart';
import 'bus_tracking_screen.dart';
import 'route_screen.dart';
import 'leave_request_screen.dart';
import 'announcements_screen.dart';
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
  LatLng? _userLocation;
  List<Map<String, dynamic>> _children = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadChildren();
    _getUserLocation();
  }

  Future<void> _getUserLocation() async {
    try {
      final location = await LocationService().getCurrentLatLng();
      if (location != null && mounted) {
        setState(() => _userLocation = location);
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
    }
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
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load children: $e')),
        );
      }
    }
  }

  Future<void> _triggerEmergency() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Trigger emergency?'),
        content: const Text('This will alert the school transport office immediately.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Send Alert', style: TextStyle(color: AppColors.dangerRed))),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final socket = SocketService();
    socket.connect();
    socket.triggerParentEmergency(
      studentName: _children.isNotEmpty ? _children.first['name']?.toString() : null,
    );
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Emergency alert sent to school')),
    );
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
            onPressed: _confirmLogout,
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
    return RefreshIndicator(
      onRefresh: () async {
        await _loadChildren();
        await _getUserLocation();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
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
              child: OsmMapWidget(
                center: _userLocation ?? _defaultLocation,
                zoom: 13.0,
                controller: _mapController,
                markers: [
                  if (_userLocation != null)
                    buildParentMarker(_userLocation!, 'You'),
                ],
              ),
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
              const SizedBox(width: 12),
              Expanded(child: _buildActionCard(icon: Icons.event_busy, title: 'Leave', color: AppColors.dangerRed, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const LeaveRequestScreen())))),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _triggerEmergency(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.dangerRed,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              icon: const Icon(Icons.warning_amber, color: AppColors.white),
              label: const Text('EMERGENCY', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
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
      ),
    );
  }

  Widget _buildRouteTab() {
    Map<String, dynamic>? bus;
    if (_children.isNotEmpty) {
      final child = _children.first;
      bus = child['bus'];
    }
    if (bus == null) {
      return const Center(child: Text('No bus assigned to your children'));
    }
    return RouteView(busId: bus['id'], busNumber: bus['busNumber']);
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
          _buildProfileMenuItem(icon: Icons.child_care, title: 'My Children', onTap: () {
            showDialog(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('My Children'),
                content: SizedBox(
                  width: double.maxFinite,
                  child: _children.isEmpty
                      ? const Text('No children registered')
                      : ListView.builder(
                          shrinkWrap: true,
                          itemCount: _children.length,
                          itemBuilder: (context, index) {
                            final child = _children[index];
                            final bus = child['bus'];
                            final stop = child['stop'];
                            return ListTile(
                              leading: const CircleAvatar(child: Icon(Icons.child_care)),
                              title: Text(child['name'] ?? ''),
                              subtitle: Text('Bus: ${bus?['busNumber'] ?? 'N/A'} • Stop: ${stop?['name'] ?? 'N/A'}'),
                            );
                          },
                        ),
                ),
                actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
              ),
            );
          }),
          _buildProfileMenuItem(icon: Icons.event_busy, title: 'Leave Requests', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const LeaveRequestScreen()))),
          _buildProfileMenuItem(icon: Icons.campaign, title: 'Announcements', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const AnnouncementsScreen()))),
          _buildProfileMenuItem(icon: Icons.notifications, title: 'Notifications', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const NotificationsScreen()))),
          _buildProfileMenuItem(icon: Icons.logout, title: 'Logout', color: AppColors.dangerRed, onTap: _confirmLogout),
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
