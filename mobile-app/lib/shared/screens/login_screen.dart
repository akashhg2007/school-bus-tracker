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
  final TextEditingController _identifierController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _error;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _isLoading = true; _error = null; });
    final auth = AuthService();
    final errorMessage = await auth.loginWithPassword(
      _identifierController.text.trim(),
      _passwordController.text,
    );
    setState(() => _isLoading = false);

    if (errorMessage == null && mounted) {
      if (widget.onLogin != null) {
        widget.onLogin!.call(auth.userType ?? 'PARENT');
      } else {
        _navigateToHome(auth.userType ?? 'PARENT');
      }
    } else if (mounted) {
      setState(() => _error = errorMessage ?? 'Login failed. Please try again.');
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
                  TextFormField(
                    controller: _identifierController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email or Phone',
                      prefixIcon: Icon(Icons.person),
                      hintText: 'Enter email or phone number',
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) return 'Please enter your email or phone number';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: const Icon(Icons.lock),
                      hintText: 'Enter your password',
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) return 'Please enter your password';
                      if (value.length < 6) return 'Password must be at least 6 characters';
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _login,
                      child: _isLoading
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
                          : const Text('Login', style: TextStyle(fontSize: 16)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
