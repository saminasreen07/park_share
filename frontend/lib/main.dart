import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/home/screens/driver_home_screen.dart';
import 'features/home/screens/owner_home_screen.dart';

void main() {
  runApp(
    const ProviderScope(
      child: ParkShareApp(),
    ),
  );
}

class ParkShareApp extends ConsumerWidget {
  const ParkShareApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'ParkShare',
      theme: AppTheme.darkTheme, // Default Dark theme
      debugShowCheckedModeBanner: false,
      home: _getHomeWidget(authState),
    );
  }

  Widget _getHomeWidget(AuthState state) {
    if (state.isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                "🅿️",
                style: TextStyle(fontSize: 48),
              ),
              SizedBox(height: 16),
              CircularProgressIndicator(color: Colors.indigoAccent),
            ],
          ),
        ),
      );
    }

    if (state.user != null) {
      if (state.user!.role == 'owner') {
        return const OwnerHomeScreen();
      }
      return const DriverHomeScreen();
    }

    return const LoginScreen();
  }
}
