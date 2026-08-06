import 'dart:async';
import 'package:flutter/material.dart';
import 'core/config/theme.dart';
import 'core/services/api_service.dart';
import 'core/services/auth_service.dart';
import 'core/services/firebase_service.dart';
import 'shared/screens/permission_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  ApiService().init();
  await AuthService().init();
  unawaited(FirebaseService().initPush());
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'School Bus Tracker',
      theme: AppTheme.lightTheme,
      debugShowCheckedModeBanner: false,
      home: const PermissionScreen(),
    );
  }
}
