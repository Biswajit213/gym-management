# Gym Management System

A comprehensive web-based gym management solution built with HTML, CSS, JavaScript, and Firebase.

## 🏋️‍♂️ Project Overview

The Gym Management System is designed to solve common issues faced by gym owners and members:
- **Digital Receipt Management**: Eliminates paper receipts and provides secure digital storage
- **Automated Notifications**: Streamlines communication about gym schedules and payments
- **Member Management**: Complete CRUD operations for gym members
- **Billing System**: Automated billing and receipt generation
- **Supplement Store**: Integrated supplement sales management
- **Diet Planning**: Nutrition advice and diet management

## 🚀 Features

### Admin Module
- ✅ Secure login system
- ✅ Add/Update/Delete members
- ✅ Create and manage bills
- ✅ Assign fee packages
- ✅ Send notifications
- ✅ Generate reports
- ✅ Manage supplement store
- ✅ Diet details management

### Member Module
- ✅ Member login
- ✅ View bill receipts
- ✅ Receive notifications
- ✅ Access personal dashboard

### User Module
- ✅ Public access to gym information
- ✅ Search member records
- ✅ View gym details

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Styling**: Custom CSS with responsive design
- **Logging**: JavaScript console logging with Firebase Analytics

## 📁 Project Structure

```
gym-management-system/
├── index.html                 # Main landing page
├── admin/
│   ├── login.html            # Admin login
│   ├── dashboard.html        # Admin dashboard
│   ├── members.html          # Member management
│   ├── billing.html          # Billing system
│   ├── notifications.html    # Notification center
│   ├── reports.html          # Report generation
│   ├── supplements.html      # Supplement store
│   └── diet.html             # Diet management
├── member/
│   ├── login.html            # Member login
│   ├── dashboard.html        # Member dashboard
│   └── receipts.html         # Receipt viewer
├── user/
│   ├── search.html           # Public search
│   └── details.html          # Gym details
├── css/
│   ├── style.css             # Main stylesheet
│   ├── admin.css             # Admin-specific styles
│   ├── member.css            # Member-specific styles
│   └── user.css              # User-specific styles
├── js/
│   ├── firebase-config.js    # Firebase configuration
│   ├── auth.js               # Authentication logic
│   ├── admin.js              # Admin functionality
│   ├── member.js             # Member functionality
│   ├── user.js               # User functionality
│   ├── billing.js            # Billing system
│   ├── notifications.js      # Notification system
│   ├── logging.js            # Logging utilities
│   └── utils.js              # Utility functions
├── assets/
│   ├── images/               # Image assets
│   └── icons/                # Icon assets
└── README.md                 # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase account
- Basic knowledge of HTML, CSS, and JavaScript

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gym-management-system.git
   cd gym-management-system
   ```

2. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create Firestore Database
   - Enable Storage
   - Get your Firebase configuration

3. **Configure Firebase**
   - Open `js/firebase-config.js`
   - Replace the Firebase configuration with your project details

4. **Run the application**
   - Open `index.html` in your web browser
   - Or use a local server:
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx http-server
     ```

## 🔐 Authentication

### Admin Access
- **Default Admin**: admin@gym.com / admin123
- **Capabilities**: Full system access, member management, billing, reports

### Member Access
- Members are created by admin
- Each member gets unique login credentials
- Access to personal dashboard and receipts

### User Access
- Public access to gym information
- No authentication required for basic features

## 📊 Database Schema

### Collections in Firestore

1. **users**
   - uid, email, role, name, phone, joinDate

2. **members**
   - id, name, email, phone, membershipType, joinDate, status

3. **bills**
   - id, memberId, amount, description, dueDate, status, createdAt

4. **receipts**
   - id, billId, memberId, amount, paymentDate, receiptNumber

5. **notifications**
   - id, title, message, type, targetUsers, createdAt, readBy

6. **supplements**
   - id, name, description, price, stock, category

7. **diets**
   - id, memberId, plan, description, startDate, endDate

8. **logs**
   - id, action, userId, details, timestamp

## 🔧 Configuration

### Firebase Configuration
Update `js/firebase-config.js` with your Firebase project details:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## 📝 Logging

The system implements comprehensive logging for all actions:
- User authentication events
- CRUD operations on members
- Billing and payment activities
- Notification sends
- Report generation
- Supplement store transactions

Logs are stored in Firebase Firestore and can be viewed in the admin dashboard.

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern Interface**: Clean, professional design
- **Dark/Light Mode**: Toggle between themes
- **Accessibility**: WCAG compliant design
- **Loading States**: Smooth user experience
- **Error Handling**: User-friendly error messages

## 🔒 Security Features

- Firebase Authentication
- Role-based access control
- Input validation and sanitization
- Secure data transmission
- Session management

## 📈 Performance Optimization

- Lazy loading of components
- Optimized images and assets
- Efficient database queries
- Caching strategies
- Code splitting

## 🧪 Testing

The application includes:
- Unit tests for utility functions
- Integration tests for Firebase operations
- UI testing with browser automation
- Performance testing

## 🚀 Deployment

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Other Platforms
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

## 📊 Monitoring and Analytics

- Firebase Analytics integration
- Performance monitoring
- Error tracking
- User behavior analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Your Name** - Initial work

## 🙏 Acknowledgments

- Firebase team for the excellent platform
- Open source community for inspiration
- Gym owners and members for feedback

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@gymmanagement.com
- Documentation: [Wiki](https://github.com/yourusername/gym-management-system/wiki)

## 🔄 Version History

- **v1.0.0** - Initial release with core features
- **v1.1.0** - Added supplement store
- **v1.2.0** - Enhanced reporting system
- **v1.3.0** - Mobile app integration

---

**Note**: This is a demonstration project. For production use, ensure proper security measures and compliance with local regulations. 