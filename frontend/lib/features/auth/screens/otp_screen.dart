import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../providers/auth_provider.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String phoneNumber;
  final String email;
  final String selectedRole;
  final String verificationId;

  const OtpScreen({
    super.key,
    required this.phoneNumber,
    required this.email,
    required this.selectedRole,
    required this.verificationId,
  });

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final List<TextEditingController> _controllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  late String _currentVerificationId;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _currentVerificationId = widget.verificationId;
  }

  @override
  void dispose() {
    for (var controller in _controllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  void _nextField(String value, int index) {
    if (value.length == 1 && index < 5) {
      _focusNodes[index + 1].requestFocus();
    }
    if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
  }

  Future<void> _handleVerify() async {
    final code = _controllers.map((c) => c.text).join();
    if (code.length < 6) {
      setState(() => _errorMessage = "Please enter all 6 digits");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: _currentVerificationId,
        smsCode: code,
      );

      final userCredential = await FirebaseAuth.instance.signInWithCredential(credential);
      final idToken = await userCredential.user?.getIdToken();

      if (idToken == null) {
        throw Exception("Failed to retrieve Firebase ID Token");
      }

      final success = await ref.read(authProvider.notifier).login(
        idToken,
        widget.selectedRole,
      );

      if (mounted) {
        setState(() => _isLoading = false);
        if (success) {
          Navigator.of(context).pop();
        } else {
          setState(() {
            _errorMessage = ref.read(authProvider).errorMessage ?? 'Verification failed';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceAll("Exception: ", "");
        });
      }
    }
  }

  Future<void> _resendOtp() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      await FirebaseAuth.instance.verifyPhoneNumber(
        phoneNumber: widget.phoneNumber,
        verificationCompleted: (PhoneAuthCredential credential) async {
          try {
            final userCredential = await FirebaseAuth.instance.signInWithCredential(credential);
            final idToken = await userCredential.user?.getIdToken();
            if (idToken != null) {
              final success = await ref.read(authProvider.notifier).login(
                idToken,
                widget.selectedRole,
              );
              if (mounted && success) {
                Navigator.of(context).pop();
              }
            }
          } catch (e) {
            if (mounted) {
              setState(() {
                _isLoading = false;
                _errorMessage = e.toString();
              });
            }
          }
        },
        verificationFailed: (FirebaseAuthException e) {
          if (mounted) {
            setState(() {
              _isLoading = false;
              _errorMessage = e.message ?? 'Verification failed';
            });
          }
        },
        codeSent: (String verificationId, int? resendToken) {
          if (mounted) {
            setState(() {
              _isLoading = false;
              _currentVerificationId = verificationId;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("OTP Resent successfully")),
            );
          }
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          if (mounted) {
            setState(() {
              _isLoading = false;
            });
          }
        },
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              const Text(
                "Verify Code",
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                "Enter the 6-digit OTP sent to ${widget.phoneNumber}",
                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 15),
              ),
              const SizedBox(height: 40),

              // OTP Input boxes
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: List.generate(6, (index) {
                  return SizedBox(
                    width: 45,
                    height: 60,
                    child: TextFormField(
                      controller: _controllers[index],
                      focusNode: _focusNodes[index],
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      maxLength: 1,
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        counterText: "",
                        fillColor: const Color(0xFF161E2E),
                        filled: true,
                        contentPadding: EdgeInsets.zero,
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: Colors.indigo, width: 2),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                        ),
                      ),
                      onChanged: (value) => _nextField(value, index),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 24),

              if (_errorMessage != null)
                Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                ),
              const SizedBox(height: 40),

              _isLoading
                  ? const Center(child: SpinKitRing(color: Colors.indigo, size: 40))
                  : ElevatedButton(
                      onPressed: _handleVerify,
                      child: const Text("Verify & Login"),
                    ),
              const SizedBox(height: 24),

              // Resend Code timer
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Haven't received the OTP? ", style: TextStyle(color: Color(0xFF64748B))),
                  TextButton(
                    onPressed: _resendOtp,
                    child: const Text("Resend"),
                  )
                ],
              )
            ],
          ),
        ),
      ),
    );
  }
}
