import 'package:flutter/material.dart';
import '../../core/config/theme.dart';
import '../../core/services/auth_service.dart';
import '../../parent/screens/parent_home_screen.dart';
import '../../driver/screens/driver_home_screen.dart';
import '../../admin/screens/admin_home_screen.dart';

class LoginScreen extends StatefulWidget {
  final Function(String userType)? onLogin;

  const LoginScreen({super.key, this.onLogin});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _otpController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _otpSent = false;
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _isLoading = true; _error = null; });
    final auth = AuthService();
    final success = await auth.sendOtp(_phoneController.text.trim());
    setState(() {
      _isLoading = false;
      if (success) {
        _otpSent = true;
      } else {
        _error = 'Failed to send OTP. Is the server running?';
      }
    });
  }

  Future<void> _verifyOtp() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _isLoading = true; _error = null; });
    final auth = AuthService();
    final success = await auth.verifyOtp(_phoneController.text.trim());
    setState(() => _isLoading = false);

    if (success && mounted) {
      if (widget.onLogin != null) {
        widget.onLogin!.call(auth.userType ?? 'PARENT');
      } else {
        _navigateToHome(auth.userType ?? 'PARENT');
      }
    } else if (mounted) {
      setState(() => _error = 'Phone number not registered. Contact your school.');
    }
  }

  void _navigateToHome(String userType) {
    if (!mounted) return;
    Widget screen;
    switch (userType) {
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
        return;
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
            child: Form(
              key: _formKey,
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
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.deepBlue),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Track your child\'s bus in real-time',
                    style: TextStyle(fontSize: 14, color: AppColors.medium),
                  ),
                  const SizedBox(height: 48),
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
                          ),
                        ],
                      ),
                    ),
                  if (!_otpSent) ...[
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number',
                        prefixIcon: Icon(Icons.phone),
                        hintText: 'Enter registered phone number',
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Please enter your phone number';
                        if (value.length < 10) return 'Please enter a valid phone number';
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _sendOtp,
                        child: _isLoading
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
                            : const Text('Send OTP', style: TextStyle(fontSize: 16)),
                      ),
                    ),
                  ] else ...[
                    Text('OTP sent to ${_phoneController.text}', style: const TextStyle(color: AppColors.medium)),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _otpController,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 24, letterSpacing: 8),
                      decoration: const InputDecoration(labelText: 'Enter OTP', hintText: '------', counterText: ''),
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Please enter the OTP';
                        if (value.length != 6) return 'OTP must be 6 digits';
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _verifyOtp,
                        child: _isLoading
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
                            : const Text('Verify & Login', style: TextStyle(fontSize: 16)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: () => setState(() { _otpSent = false; _error = null; }),
                      child: const Text('Change Phone Number', style: TextStyle(color: AppColors.skyBlue)),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
