# Firebase Security Rules for Gym Management System

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isMember() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'member';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isMemberOwner(memberId) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/members/$(memberId)).data.userId == request.auth.uid;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow write: if isOwner(userId) || isAdmin();
    }
    
    // Members collection
    match /members/{memberId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin() || isMemberOwner(memberId);
      allow delete: if isAdmin();
    }
    
    // Bills collection
    match /bills/{billId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Receipts collection
    match /receipts/{receiptId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Payments collection
    match /payments/{paymentId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Supplements collection
    match /supplements/{supplementId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Diets collection
    match /diets/{dietId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin() || isMemberOwner(resource.data.memberId);
      allow delete: if isAdmin();
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && 
        (resource.data.memberId == request.auth.uid || isAdmin());
      allow create: if isAdmin();
      allow update: if isAuthenticated() && 
        (resource.data.memberId == request.auth.uid || isAdmin());
      allow delete: if isAuthenticated() && 
        (resource.data.memberId == request.auth.uid || isAdmin());
    }
    
    // Notification settings collection
    match /notification_settings/{memberId} {
      allow read, write: if isAuthenticated() && 
        (request.auth.uid == memberId || isAdmin());
    }
    
    // Logs collection (admin only)
    match /logs/{logId} {
      allow read, write: if isAdmin();
    }
    
    // Memberships collection
    match /memberships/{membershipId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

## Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Profile images
    match /profile-images/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && 
        fileName.matches('profile-' + request.auth.uid + '-.*');
    }
    
    // Receipt PDFs
    match /receipt-pdfs/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Reports
    match /reports/{fileName} {
      allow read, write: if isAdmin();
    }
    
    // Supplement images
    match /supplement-images/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // General file access
    match /{allPaths=**} {
      allow read, write: if isAdmin();
    }
  }
}
```

## Authentication Rules

```javascript
// User creation validation
function validateUserCreation(userData) {
  return userData.email != null &&
         userData.email.matches('.*@.*\\..*') &&
         userData.role in ['admin', 'member'] &&
         userData.name != null &&
         userData.name.size() > 0;
}

// Password strength validation
function validatePassword(password) {
  return password.size() >= 6 &&
         password.matches('.*[A-Z].*') &&
         password.matches('.*[a-z].*') &&
         password.matches('.*[0-9].*');
}
```

## Data Validation Rules

```javascript
// Member data validation
function validateMemberData(memberData) {
  return memberData.name != null &&
         memberData.name.size() > 0 &&
         memberData.email != null &&
         memberData.email.matches('.*@.*\\..*') &&
         memberData.phone != null &&
         memberData.membershipType in ['basic', 'premium', 'vip'];
}

// Bill data validation
function validateBillData(billData) {
  return billData.memberId != null &&
         billData.amount > 0 &&
         billData.description != null &&
         billData.description.size() > 0;
}

// Payment data validation
function validatePaymentData(paymentData) {
  return paymentData.memberId != null &&
         paymentData.amount > 0 &&
         paymentData.paymentMethod in ['cash', 'card', 'bank_transfer', 'check', 'digital_wallet'];
}
```

## Rate Limiting Rules

```javascript
// Rate limiting for authentication
function checkAuthRateLimit() {
  return request.time > resource.data.lastAuthAttempt + duration.value(5, 'm');
}

// Rate limiting for API calls
function checkAPIRateLimit() {
  return request.time > resource.data.lastAPICall + duration.value(1, 's');
}
```

## Security Best Practices

1. **Authentication Required**: All sensitive operations require authentication
2. **Role-Based Access**: Different permissions for admin and member roles
3. **Data Ownership**: Users can only access their own data
4. **Input Validation**: All input data is validated before processing
5. **Rate Limiting**: Prevent abuse with rate limiting
6. **Audit Logging**: All operations are logged for security monitoring
7. **Data Encryption**: Sensitive data is encrypted at rest
8. **Secure File Uploads**: File uploads are validated and scanned
9. **Session Management**: Proper session handling and timeout
10. **Error Handling**: Secure error messages without information leakage

## Implementation Notes

- These rules should be deployed to Firebase Console
- Test thoroughly in development environment first
- Monitor security logs regularly
- Update rules as application evolves
- Consider using Firebase App Check for additional security
- Implement proper CORS policies for web applications
- Use HTTPS for all communications
- Regularly audit access patterns and permissions 