import 'package:flutter/material.dart';

class AppColors {
  static const Color deepBlue = Color(0xFF1E3A5F);
  static const Color skyBlue = Color(0xFF4A90D9);
  static const Color safeGreen = Color(0xFF27AE60);
  static const Color alertOrange = Color(0xFFF39C12);
  static const Color dangerRed = Color(0xFFE74C3C);
  static const Color dark = Color(0xFF2C3E50);
  static const Color medium = Color(0xFF7F8C8D);
  static const Color light = Color(0xFFECF0F1);
  static const Color white = Color(0xFFFFFFFF);
  static const Color cardBg = Color(0xFFFFFFFF);
  static const Color pageBg = Color(0xFFF5F7FA);
  static const Color mapBg = Color(0xFFE8F4FD);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.deepBlue,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: AppColors.pageBg,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.deepBlue,
        foregroundColor: AppColors.white,
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.deepBlue,
          foregroundColor: AppColors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.light),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.light),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.skyBlue),
        ),
      ),
    );
  }
}
