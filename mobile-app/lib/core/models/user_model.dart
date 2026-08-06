class User {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String schoolId;
  final String userType;
  final String? fcmToken;
  final bool isActive;

  User({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    required this.schoolId,
    required this.userType,
    this.fcmToken,
    this.isActive = true,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      name: json['name'],
      phone: json['phone'],
      email: json['email'],
      schoolId: json['schoolId'],
      userType: json['userType'],
      fcmToken: json['fcmToken'],
      isActive: json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'schoolId': schoolId,
      'userType': userType,
      'fcmToken': fcmToken,
      'isActive': isActive,
    };
  }
}

class AuthResponse {
  final String token;
  final User user;

  AuthResponse({
    required this.token,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      token: json['token'],
      user: User.fromJson(json['user']),
    );
  }
}
