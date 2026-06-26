import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../providers/auth_provider.dart';
import 'otp_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  String _selectedRole = 'driver'; // default role selector
  bool _isOtpRequesting = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleRequestOtp() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isOtpRequesting = true;
    });

    String phone = _phoneController.text.trim();
    if (!phone.startsWith('+')) {
      phone = '+91$phone'; // Prepend India country code by default if not present
    }

    try {
      await FirebaseAuth.instance.verifyPhoneNumber(
        phoneNumber: phone,
        verificationCompleted: (PhoneAuthCredential credential) async {
          // If auto-retrieval succeeds, we can automatically sign in and proceed
          try {
            final userCredential = await FirebaseAuth.instance.signInWithCredential(credential);
            final idToken = await userCredential.user?.getIdToken();
            if (idToken != null) {
              final success = await ref.read(authProvider.notifier).login(
                idToken,
                _selectedRole,
              );
              if (!success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(ref.read(authProvider).errorMessage ?? 'Login Failed'),
                    backgroundColor: Colors.redAccent,
                  ),
                );
              }
            }
          } catch (e) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(e.toString()),
                  backgroundColor: Colors.redAccent,
                ),
              );
            }
          } finally {
            if (mounted) {
              setState(() {
                _isOtpRequesting = false;
              });
            }
          }
        },
        verificationFailed: (FirebaseAuthException e) {
          if (mounted) {
            setState(() {
              _isOtpRequesting = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(e.message ?? 'Verification failed'),
                backgroundColor: Colors.redAccent,
              ),
            );
          }
        },
        codeSent: (String verificationId, int? resendToken) {
          if (mounted) {
            setState(() {
              _isOtpRequesting = false;
            });
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => OtpScreen(
                  phoneNumber: phone,
                  email: _emailController.text,
                  selectedRole: _selectedRole,
                  verificationId: verificationId,
                ),
              ),
            );
          }
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          if (mounted) {
            setState(() {
              _isOtpRequesting = false;
            });
          }
        },
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _isOtpRequesting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }



  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: Stack(
        children: [
          // Background glowing graphics decoration
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.indigo.withValues(alpha: 0.18),
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.blue.withValues(alpha: 0.12),
              ),
            ),
          ),
          
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Brand Logo & Header
                      const Column(
                        children: [
                          Text(
                            "🅿️",
                            style: TextStyle(fontSize: 64),
                          ),
                          SizedBox(height: 12),
                          Text(
                            "ParkShare",
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            "AI-Powered Peer-to-Peer Parking",
                            style: TextStyle(
                              fontSize: 14,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 40),

                      // Glassmorphic selector Card
                      Container(
                        padding: const EdgeInsets.all(24.0),
                        decoration: BoxDecoration(
                          color: const Color(0xFF161E2E).withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.06),
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.3),
                              blurRadius: 30,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Role Switch tabs
                            Row(
                              children: [
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () => setState(() => _selectedRole = 'driver'),
                                    child: Container(
                                      alignment: Alignment.center,
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      decoration: BoxDecoration(
                                        color: _selectedRole == 'driver' 
                                            ? Colors.indigo.withValues(alpha: 0.3) 
                                            : Colors.transparent,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: _selectedRole == 'driver' 
                                              ? Colors.indigo.withValues(alpha: 0.4) 
                                              : Colors.transparent,
                                        ),
                                      ),
                                      child: const Text(
                                        "Driver",
                                        style: TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () => setState(() => _selectedRole = 'owner'),
                                    child: Container(
                                      alignment: Alignment.center,
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      decoration: BoxDecoration(
                                        color: _selectedRole == 'owner' 
                                            ? Colors.indigo.withValues(alpha: 0.3) 
                                            : Colors.transparent,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: _selectedRole == 'owner' 
                                              ? Colors.indigo.withValues(alpha: 0.4) 
                                              : Colors.transparent,
                                        ),
                                      ),
                                      child: const Text(
                                        "Host / Owner",
                                        style: TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),

                            // Phone Field
                            TextFormField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.phone_android_rounded, color: Colors.indigoAccent),
                                hintText: "Enter Mobile Number",
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return "Please enter your phone number";
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),

                            // Email Field
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.mail_outline_rounded, color: Colors.indigoAccent),
                                hintText: "Email (Optional)",
                              ),
                            ),
                            const SizedBox(height: 24),

                            // Submit Button
                            (authState.isLoading || _isOtpRequesting)
                                ? const Center(
                                    child: SpinKitRing(
                                      color: Colors.indigo,
                                      size: 40,
                                    ),
                                  )
                                : ElevatedButton(
                                    onPressed: _handleRequestOtp,
                                    child: const Text("Request OTP Code"),
                                  ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),


                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
