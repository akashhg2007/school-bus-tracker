import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/config/theme.dart';
import '../../core/services/api_service.dart';

class LeaveRequestScreen extends StatefulWidget {
  const LeaveRequestScreen({super.key});

  @override
  State<LeaveRequestScreen> createState() => _LeaveRequestScreenState();
}

class _LeaveRequestScreenState extends State<LeaveRequestScreen> {
  final ApiService _api = ApiService();
  final _reasonController = TextEditingController();

  List<Map<String, dynamic>> _children = [];
  List<Map<String, dynamic>> _leaveRequests = [];
  String? _selectedStudentId;
  DateTime _selectedDate = DateTime.now();
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final childrenRes = await _api.getMyChildren();
      final leavesRes = await _api.getMyLeaveRequests();
      setState(() {
        _children = List<Map<String, dynamic>>.from(childrenRes.data['data']);
        _leaveRequests = List<Map<String, dynamic>>.from(leavesRes.data['data'] ?? []);
        if (_children.isNotEmpty) {
          _selectedStudentId = _children.first['id'];
        }
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 60)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _submit() async {
    if (_selectedStudentId == null) return;
    if (_reasonController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a reason (e.g. sick, family function)')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final date = DateFormat('yyyy-MM-dd').format(_selectedDate);
      await _api.createLeaveRequest(_selectedStudentId!, date, reason: _reasonController.text.trim());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Leave request submitted')),
      );
      _reasonController.clear();
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      String message = 'Failed to submit leave request';
      if (e.toString().contains('already')) {
        message = 'A leave request for this date already exists';
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    }
    setState(() => _submitting = false);
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Pending';
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'APPROVED':
        return AppColors.safeGreen;
      case 'REJECTED':
        return AppColors.dangerRed;
      default:
        return AppColors.medium;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Leave Request')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Submit a new request', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.dark)),
                          const SizedBox(height: 16),
                          DropdownButtonFormField<String>(
                            value: _selectedStudentId,
                            decoration: const InputDecoration(
                              labelText: 'Child',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.child_care),
                            ),
items: _children.map<DropdownMenuItem<String>>((c) {
              return DropdownMenuItem<String>(
                value: c['id'] as String?,
                child: Text('${c['name']} (${c['rollNumber'] ?? ''})'),
              );
            }).toList(),
                            onChanged: (v) => setState(() => _selectedStudentId = v),
                          ),
                          const SizedBox(height: 12),
                          InkWell(
                            onTap: _pickDate,
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: 'Date',
                                border: OutlineInputBorder(),
                                prefixIcon: Icon(Icons.calendar_today),
                              ),
                              child: Text(DateFormat('yyyy-MM-dd').format(_selectedDate)),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _reasonController,
                            maxLines: 3,
                            decoration: const InputDecoration(
                              labelText: 'Reason',
                              hintText: 'e.g. Medical appointment, family function',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.notes),
                            ),
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _submitting ? null : _submit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.deepBlue,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                              child: _submitting
                                  ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                                  : const Text('Submit Leave Request'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                  const Text('My Requests', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.dark)),
                  const SizedBox(height: 8),
                  if (_leaveRequests.isEmpty)
                    const Card(child: Padding(padding: EdgeInsets.all(16), child: Center(child: Text('No leave requests yet'))))
                  else
                    ..._leaveRequests.map((r) {
                      final student = r['student'];
                      final date = DateTime.tryParse(r['date'] ?? '') ?? DateTime.now();
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(backgroundColor: AppColors.skyBlue, child: const Icon(Icons.event_busy, color: AppColors.white)),
                          title: Text(student?['name'] ?? 'Child'),
                          subtitle: Text('${DateFormat('yyyy-MM-dd').format(date)}\n${r['reason'] ?? ''}'),
                          isThreeLine: true,
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            margin: const EdgeInsets.only(top: 18),
                            decoration: BoxDecoration(color: _statusColor(r['status'] ?? 'PENDING').withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
                            child: Text(_statusLabel(r['status'] ?? 'PENDING'), style: TextStyle(color: _statusColor(r['status'] ?? 'PENDING'), fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}