// Firebase Configuration
// Replace with your Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyCNaU76OrN5K3KyjfYB1Kcu0BI9NzMil90",
    authDomain: "gym-management-95df3.firebaseapp.com",
    projectId: "gym-management-95df3",
    storageBucket: "gym-management-95df3.firebasestorage.app",
    messagingSenderId: "974671308402",
    appId: "1:974671308402:web:8f998b948fea38b2bd04eb"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const analytics = firebase.analytics();

// Enable Firestore offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a time
            console.log('Persistence failed - multiple tabs open');
        } else if (err.code == 'unimplemented') {
            // The current browser doesn't support persistence
            console.log('Persistence not supported by browser');
        }
    });

// Firebase Auth State Observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        console.log('User signed in:', user.email);
        
        // Log the authentication event
        logAction('AUTH_LOGIN', user.uid, {
            email: user.email,
            timestamp: new Date().toISOString()
        });
        
        // Store user info in localStorage
        localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        }));
        
        // Check user role and redirect accordingly
        checkUserRole(user.uid);
        
    } else {
        // User is signed out
        console.log('User signed out');
        
        // Log the logout event
        logAction('AUTH_LOGOUT', 'anonymous', {
            timestamp: new Date().toISOString()
        });
        
        // Clear user info from localStorage
        localStorage.removeItem('currentUser');
        
        // Redirect to home page if not already there
        if (window.location.pathname !== '/' && 
            !window.location.pathname.includes('index.html')) {
            window.location.href = '/';
        }
    }
});

// Check user role and redirect
async function checkUserRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const role = userData.role;
            
            // Store role in localStorage
            localStorage.setItem('userRole', role);
            
            // Redirect based on role
            const currentPath = window.location.pathname;
            
            if (role === 'admin') {
                if (!currentPath.includes('/admin/')) {
                    window.location.href = '/admin/dashboard.html';
                }
            } else if (role === 'member') {
                if (!currentPath.includes('/member/')) {
                    window.location.href = '/member/dashboard.html';
                }
            }
        } else {
            console.log('User document not found');
        }
    } catch (error) {
        console.error('Error checking user role:', error);
        logAction('ERROR', uid, {
            action: 'checkUserRole',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Firebase Firestore Collections
const collections = {
    USERS: 'users',
    MEMBERS: 'members',
    BILLS: 'bills',
    RECEIPTS: 'receipts',
    NOTIFICATIONS: 'notifications',
    SUPPLEMENTS: 'supplements',
    DIETS: 'diets',
    LOGS: 'logs',
    PAYMENTS: 'payments',
    MEMBERSHIPS: 'memberships'
};

// Firebase Storage References
const storageRefs = {
    PROFILE_IMAGES: 'profile-images',
    RECEIPT_PDFS: 'receipt-pdfs',
    REPORTS: 'reports',
    SUPPLEMENT_IMAGES: 'supplement-images'
};

// Export Firebase instances for use in other modules
window.firebase = {
    auth,
    db,
    storage,
    analytics,
    collections,
    storageRefs
};

// Initialize default admin user if not exists
async function initializeDefaultAdmin() {
    try {
        const adminEmail = 'admin@gym.com';
        const adminPassword = 'admin123';
        
        // Check if admin user exists
        const adminQuery = await db.collection(collections.USERS)
            .where('email', '==', adminEmail)
            .where('role', '==', 'admin')
            .get();
        
        if (adminQuery.empty) {
            // Create admin user
            const userCredential = await auth.createUserWithEmailAndPassword(adminEmail, adminPassword);
            const adminUser = userCredential.user;
            
            // Send email verification
            await adminUser.sendEmailVerification();
            
            // Add admin user to Firestore
            await db.collection(collections.USERS).doc(adminUser.uid).set({
                email: adminEmail,
                role: 'admin',
                name: 'System Administrator',
                phone: '+1234567890',
                joinDate: new Date(),
                isActive: true,
                permissions: ['all'],
                emailVerified: false
            });
            
            console.log('Default admin user created');
            logAction('ADMIN_CREATED', adminUser.uid, {
                email: adminEmail,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error initializing default admin:', error);
        logAction('ERROR', 'system', {
            action: 'initializeDefaultAdmin',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Initialize default member user if not exists
async function initializeDefaultMember() {
    try {
        const memberEmail = 'member@gym.com';
        const memberPassword = 'member123';
        
        // Check if member user exists
        const memberQuery = await db.collection(collections.USERS)
            .where('email', '==', memberEmail)
            .where('role', '==', 'member')
            .get();
        
        if (memberQuery.empty) {
            // Create member user
            const userCredential = await auth.createUserWithEmailAndPassword(memberEmail, memberPassword);
            const memberUser = userCredential.user;
            
            // Send email verification
            await memberUser.sendEmailVerification();
            
            // Add member user to Firestore
            await db.collection(collections.USERS).doc(memberUser.uid).set({
                email: memberEmail,
                role: 'member',
                name: 'John Doe',
                phone: '+1987654321',
                joinDate: new Date(),
                isActive: true,
                membershipType: 'Basic',
                monthlyFee: 50,
                emailVerified: false
            });
            
            // Add member to members collection
            await db.collection(collections.MEMBERS).doc(memberUser.uid).set({
                email: memberEmail,
                name: 'John Doe',
                phone: '+1987654321',
                joinDate: new Date(),
                membershipType: 'Basic',
                monthlyFee: 50,
                isActive: true,
                emergencyContact: 'Jane Doe',
                address: '123 Main St, City, State'
            });
            
            console.log('Default member user created');
            logAction('MEMBER_CREATED', memberUser.uid, {
                email: memberEmail,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error initializing default member:', error);
        logAction('ERROR', 'system', {
            action: 'initializeDefaultMember',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Initialize system on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Firebase initialized successfully');
    
    // Initialize default users (only on first load)
    if (!localStorage.getItem('usersInitialized')) {
        initializeDefaultAdmin();
        initializeDefaultMember();
        localStorage.setItem('usersInitialized', 'true');
    }
});

// Utility function to get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

// Utility function to get user role
function getUserRole() {
    return localStorage.getItem('userRole');
}

// Utility function to check if user is admin
function isAdmin() {
    return getUserRole() === 'admin';
}

// Utility function to check if user is member
function isMember() {
    return getUserRole() === 'member';
}

// Export utility functions
window.authUtils = {
    getCurrentUser,
    getUserRole,
    isAdmin,
    isMember
}; 