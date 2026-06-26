import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  String? _errorMessage;
  
  Map<String, dynamic>? _walletData;
  List<dynamic> _transactions = [];

  @override
  void initState() {
    super.initState();
    _fetchWalletDetails();
  }

  Future<void> _fetchWalletDetails() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiClient.get('/wallet');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          setState(() {
            _walletData = body['data']['wallet'];
            _transactions = body['data']['transactions'] ?? [];
            _errorMessage = null;
          });
        }
      } else {
        setState(() => _errorMessage = 'Failed to load wallet balance details');
      }
    } catch (e) {
      setState(() => _errorMessage = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showWithdrawalSheet() {
    final amountController = TextEditingController();
    final upiController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF161E2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        final double maxAmount = _walletData != null ? (_walletData!['balance'] as num).toDouble() : 0.0;
        
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 24, left: 24, right: 24,
          ),
          child: StatefulBuilder(
            builder: (context, setSheetState) {
              return Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      "Request Fund Payout",
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "Available Balance: ₹${maxAmount.toStringAsFixed(2)}",
                      style: const TextStyle(color: Colors.indigoAccent, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    const Divider(color: Color(0xFF334155), height: 24),

                    // Amount Input
                    TextFormField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        hintText: "Enter amount (₹)",
                        prefixIcon: Icon(Icons.currency_rupee_rounded, color: Colors.indigoAccent),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return "Please enter withdrawal amount";
                        }
                        final val = double.tryParse(value);
                        if (val == null || val <= 0) {
                          return "Enter a valid positive number";
                        }
                        if (val > maxAmount) {
                          return "Insufficient wallet balance";
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // UPI Input
                    TextFormField(
                      controller: upiController,
                      decoration: const InputDecoration(
                        hintText: "Enter UPI ID (e.g. user@ybl)",
                        prefixIcon: Icon(Icons.account_balance_wallet_rounded, color: Colors.indigoAccent),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return "Please enter your settlement UPI ID";
                        }
                        if (!value.contains('@')) {
                          return "Enter a valid UPI address format";
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),

                    isSubmitting
                        ? const Center(child: SpinKitRing(color: Colors.indigo, size: 36))
                        : ElevatedButton(
                            onPressed: () async {
                              if (formKey.currentState!.validate()) {
                                setSheetState(() => isSubmitting = true);
                                try {
                                  final response = await _apiClient.post('/wallet/withdraw', {
                                    'amount': double.parse(amountController.text),
                                    'payoutMethod': 'UPI',
                                    'referenceDetails': upiController.text,
                                  });

                                  if (response.statusCode == 200 && context.mounted) {
                                    Navigator.of(context).pop();
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Withdrawal completed. Payout sent to UPI ID!"),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                    _fetchWalletDetails();
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(e.toString()), backgroundColor: Colors.redAccent),
                                    );
                                  }
                                } finally {
                                  setSheetState(() => isSubmitting = false);
                                }
                              }
                            },
                            child: const Text("Request Payout Settlement"),
                          ),
                    const SizedBox(height: 24),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final double balance = _walletData != null ? (_walletData!['balance'] as num).toDouble() : 0.0;
    final double accumulated = _walletData != null ? (_walletData!['accumulatedEarnings'] as num).toDouble() : 0.0;
    final double withdrawn = _walletData != null ? (_walletData!['withdrawnEarnings'] as num).toDouble() : 0.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Wallet & Earnings", style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: SpinKitRing(color: Colors.indigo, size: 40))
            : _errorMessage != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: Colors.redAccent),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  )
                : Column(
                    children: [
                      // Top balances dashboard panel
                      Padding(
                        padding: const EdgeInsets.all(20.0),
                        child: Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Colors.indigo.shade900, Colors.indigo.shade700],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(28),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text("TOTAL WALLET BALANCE", style: TextStyle(color: Colors.white60, fontSize: 10, letterSpacing: 1)),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "₹${balance.toStringAsFixed(2)}",
                                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                  if (balance > 0)
                                    ElevatedButton(
                                      onPressed: _showWithdrawalSheet,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.white,
                                        foregroundColor: Colors.indigo,
                                        minimumSize: const Size(110, 36),
                                        padding: const EdgeInsets.symmetric(horizontal: 16),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                      child: const Text("Withdraw", style: TextStyle(fontSize: 13)),
                                    )
                                ],
                              ),
                              const Divider(color: Colors.white24, height: 28),
                              
                              // Split cards metrics
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text("ACCUMULATED", style: TextStyle(color: Colors.white60, fontSize: 9)),
                                        const SizedBox(height: 4),
                                        Text("₹${accumulated.toStringAsFixed(1)}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
                                      ],
                                    ),
                                  ),
                                  Container(width: 1, height: 30, color: Colors.white24),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text("WITHDRAWN", style: TextStyle(color: Colors.white60, fontSize: 9)),
                                        const SizedBox(height: 4),
                                        Text("₹${withdrawn.toStringAsFixed(1)}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
                                      ],
                                    ),
                                  ),
                                ],
                              )
                            ],
                          ),
                        ),
                      ),

                      // Transactions list panel
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text("Wallet Ledger Details", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ),
                      ),

                      Expanded(
                        child: _transactions.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.history_rounded, size: 40, color: Colors.white.withValues(alpha: 0.1)),
                                    const SizedBox(height: 12),
                                    const Text("No transactions recorded.", style: TextStyle(color: Color(0xFF64748B))),
                                  ],
                                ),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 20),
                                itemCount: _transactions.length,
                                itemBuilder: (context, index) {
                                  final t = _transactions[index];
                                  final isCredit = t['type'] == 'earning';
                                  final parsedDate = DateTime.parse(t['createdAt']);

                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF161E2E).withValues(alpha: 0.5),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(color: Colors.white.withValues(alpha: 0.04)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            CircleAvatar(
                                              backgroundColor: isCredit
                                                  ? Colors.green.withValues(alpha: 0.12)
                                                  : Colors.red.withValues(alpha: 0.12),
                                              child: Icon(
                                                isCredit ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                                                color: isCredit ? Colors.greenAccent : Colors.redAccent,
                                                size: 18,
                                              ),
                                            ),
                                            const SizedBox(width: 16),
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  isCredit ? "Booking Earnings" : "Fund Withdrawal",
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                                ),
                                                Text(
                                                  DateFormat('MMM dd, hh:mm a').format(parsedDate),
                                                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                                ),
                                              ],
                                            )
                                          ],
                                        ),
                                        Text(
                                          "${isCredit ? '+' : '-'} ₹${t['amount']}",
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 16,
                                            color: isCredit ? Colors.greenAccent : Colors.redAccent,
                                          ),
                                        )
                                      ],
                                    ),
                                  );
                                },
                              ),
                      )
                    ],
                  ),
      ),
    );
  }
}
