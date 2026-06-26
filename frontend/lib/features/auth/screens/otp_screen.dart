import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../providers/auth_provider.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String phoneNumber;
  final String email;
  final String selectedRole;

  const OtpScreen({
    super.key,
    required this.phoneNumber,
    required this.email,
    required this.selectedRole,
  });

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final List<TextEditingController> _controllers = List.generate(4, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(4, (_) => FocusNode());
  bool _isLoading = false;
  String? _errorMessage;

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
    if (value.length == 1 && index < 3) {
      _focusNodes[index + 1].requestFocus();
    }
    if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
  }

  Future<void> _handleVerify() async {
    final code = _controllers.map((c) => c.text).join();
    if (code.length < 4) {
      setState(() => _errorMessage = "Please enter all 4 digits");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    // In mock mode, any 4-digit code works!
    // We send a request to login using email or phone
    final userIdentifier = widget.email.isNotEmpty ? widget.email : '${widget.phoneNumber}@parkshare.com';
    
    final success = await ref.read(authProvider.notifier).login(
      userIdentifier,
      widget.selectedRole,
    );

    if (mounted) {
      setState(() => _isLoading = false);
      if (success) {
        // Pop back to root (main router handles routing to Home automatically based on state change)
        Navigator.of(context).pop();
      } else {
        setState(() {
          _errorMessage = ref.read(authProvider).errorMessage ?? 'Verification failed';
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
                "Enter the 4-digit OTP sent to ${widget.phoneNumber}",
                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 15),
              ),
              const SizedBox(height: 40),

              // OTP Input boxes
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: List.generate(4, (index) {
                  return SizedBox(
                    width: 60,
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
                          borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
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

              // Resend Code timer Simulation
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Haven't received the OTP? ", style: TextStyle(color: Color(0xFF64748B))),
                  TextButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("OTP Resent successfully (Mock Mode)")),
                      );
                    },
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

