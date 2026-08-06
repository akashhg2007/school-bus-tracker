import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../core/config/theme.dart';
import '../../core/services/auth_service.dart';
import '../screens/login_screen.dart';
import '../../parent/screens/parent_home_screen.dart';
import '../../driver/screens/driver_home_screen.dart';
import '../../admin/screens/admin_home_screen.dart';

class PermissionScreen extends StatefulWidget {
  const PermissionScreen({super.key});

  @override
  State<PermissionScreen> createState() => _PermissionScreenState();
}

class _PermissionScreenState extends State<PermissionScreen> {
  bool _isRequesting = false;
  bool _allGranted = false;
  Map<String, bool> _permissionStatus = {};

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    final status = <String, bool>{};

    status['location'] = await Geolocator.isLocationServiceEnabled();

    final locPerm = await Geolocator.checkPermission();
    status['location_perm'] = locPerm == LocationPermission.always ||
        locPerm == LocationPermission.whileInUse;

    status['notification'] = await Permission.notification.isGranted;
    status['phone'] = await Permission.phone.isGranted;
    status['sms'] = await Permission.sms.isGranted;
    status['camera'] = await Permission.camera.isGranted;
    status['storage'] = await Permission.storage.isGranted;

    final allOk = status.values.every((v) => v);

    if (mounted) {
      setState(() {
        _permissionStatus = status;
        _allGranted = allOk;
      });
    }
  }

  Future<void> _requestAllPermissions() async {
    setState(() => _isRequesting = true);

    await Geolocator.openLocationSettings();
    await Future.delayed(const Duration(seconds: 2));

    final locPerm = await Geolocator.requestPermission();
    if (locPerm == LocationPermission.deniedForever) {
      await Geolocator.openAppSettings();
    }

    await Permission.notification.request();
    await Permission.phone.request();
    await Permission.sms.request();
    await Permission.camera.request();
    await Permission.storage.request();

    await _checkPermissions();

    if (mounted) {
      setState(() => _isRequesting = false);

      if (_allGranted) {
        _navigateToApp();
      }
    }
  }

  void _navigateToApp() {
    if (!mounted) return;
    final auth = AuthService();
    Widget screen;

    if (!auth.isAuthenticated) {
      screen = LoginScreen();
    } else {
      switch (auth.userType) {
        case 'PARENT':
          screen = const ParentHomeScreen();
          break;
        case 'DRIVER':
          screen = const DriverHomeScreen();
          break;
        case 'ADMIN':
          screen = const AdminHomeScreen();
          break;
        default:
          screen = LoginScreen(onLogin: (_) => _navigateToApp());
      }
    }

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => screen),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: AppColors.deepBlue,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.security, size: 60, color: AppColors.white),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Permissions Required',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.deepBlue),
                ),
                const SizedBox(height: 8),
                const Text(
                  'This app needs the following permissions to work properly',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: AppColors.medium),
                ),
                const SizedBox(height: 32),
                _buildPermissionTile(Icons.location_on, 'Location', 'Track bus location in real-time', _permissionStatus['location_perm'] ?? false),
                _buildPermissionTile(Icons.notifications, 'Notifications', 'Receive trip updates and alerts', _permissionStatus['notification'] ?? false),
                _buildPermissionTile(Icons.phone, 'Phone', 'Emergency contact features', _permissionStatus['phone'] ?? false),
                _buildPermissionTile(Icons.message, 'SMS', 'Send emergency messages', _permissionStatus['sms'] ?? false),
                _buildPermissionTile(Icons.camera, 'Camera', 'Scan QR codes', _permissionStatus['camera'] ?? false),
                _buildPermissionTile(Icons.storage, 'Storage', 'Save offline data', _permissionStatus['storage'] ?? false),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isRequesting ? null : (_allGranted ? _navigateToApp : _requestAllPermissions),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _allGranted ? AppColors.safeGreen : AppColors.deepBlue,
                    ),
                    child: _isRequesting
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2),
                          )
                        : Text(
                            _allGranted ? 'Continue' : 'Grant All Permissions',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
                if (_allGranted) ...[
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: _navigateToApp,
                    child: const Text('Skip for now', style: TextStyle(color: AppColors.medium)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPermissionTile(IconData icon, String title, String subtitle, bool granted) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: granted ? AppColors.safeGreen.withOpacity(0.1) : AppColors.alertOrange.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: granted ? AppColors.safeGreen : AppColors.alertOrange, size: 24),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.medium)),
        trailing: Icon(
          granted ? Icons.check_circle : Icons.arrow_forward_ios,
          color: granted ? AppColors.safeGreen : AppColors.medium,
          size: 20,
        ),
      ),
    );
  }
}
