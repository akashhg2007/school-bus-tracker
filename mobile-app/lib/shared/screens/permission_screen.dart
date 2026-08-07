import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
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
  bool _locationGranted = false;

  @override
  void initState() {
    super.initState();
    _checkLocation();
  }

  Future<void> _checkLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) setState(() => _locationGranted = false);
      return;
    }

    final perm = await Geolocator.checkPermission();
    final granted = perm == LocationPermission.always || perm == LocationPermission.whileInUse;
    if (mounted) setState(() => _locationGranted = granted);
  }

  Future<void> _requestLocation() async {
    setState(() => _isRequesting = true);

    var serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      await Geolocator.openLocationSettings();
      await Future.delayed(const Duration(seconds: 3));
      serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) setState(() => _isRequesting = false);
        return;
      }
    }

    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.deniedForever) {
      await Geolocator.openAppSettings();
      await Future.delayed(const Duration(seconds: 2));
      perm = await Geolocator.checkPermission();
    }

    final granted = perm == LocationPermission.always || perm == LocationPermission.whileInUse;

    if (mounted) {
      setState(() {
        _locationGranted = granted;
        _isRequesting = false;
      });
      if (granted) _navigateToApp();
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
                  child: const Icon(Icons.directions_bus, size: 60, color: AppColors.white),
                ),
                const SizedBox(height: 24),
                const Text(
                  'School Bus Tracker',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.deepBlue),
                ),
                const SizedBox(height: 8),
                const Text(
                  'We need location access to track your bus in real-time',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: AppColors.medium),
                ),
                const SizedBox(height: 32),
                Card(
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: _locationGranted
                            ? AppColors.safeGreen.withOpacity(0.1)
                            : AppColors.alertOrange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.location_on,
                        color: _locationGranted ? AppColors.safeGreen : AppColors.alertOrange,
                        size: 24,
                      ),
                    ),
                    title: const Text('Location', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Required for bus tracking', style: TextStyle(fontSize: 12, color: AppColors.medium)),
                    trailing: Icon(
                      _locationGranted ? Icons.check_circle : Icons.arrow_forward_ios,
                      color: _locationGranted ? AppColors.safeGreen : AppColors.medium,
                      size: 20,
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isRequesting ? null : (_locationGranted ? _navigateToApp : _requestLocation),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _locationGranted ? AppColors.safeGreen : AppColors.deepBlue,
                    ),
                    child: _isRequesting
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2),
                          )
                        : Text(
                            _locationGranted ? 'Continue' : 'Enable Location',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: _navigateToApp,
                  child: const Text('Skip for now', style: TextStyle(color: AppColors.medium)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
