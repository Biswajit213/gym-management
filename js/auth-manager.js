// Authentication Manager for Gym Management System
// Comprehensive authentication and authorization system

class AuthManager {
    constructor() {
        this.auth = window.firebase.auth;
        this.db = window.firebase.db;
        this.currentUser = null;
        this.userRole = null;
        this.isAuthenticated = false;
        
        // Initialize authentication
        this.init();
    }

    // Initialize authentication
    async init() {
        try {
            // Set up authentication state listener
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    await this.handleAuthStateChange(user);
                } else {
                    this.handleAuthStateChange(null);
                }
            });

            console.log('Authentication Manager initialized');

        } catch (error) {
            console.error('Error initializing Auth Manager:', error);
            await logError('AUTH_MANAGER_INIT_ERROR', error);
        }
    }

    // Handle authentication state change
    async handleAuthStateChange(user) {
        if (user) {
            this.currentUser = user;
            this.isAuthenticated = true;
            
            // Get user role from Firestore
            await this.loadUserRole(user.uid);
            
            // Store user info in localStorage
            this.storeUserInfo(user);
            
            console.log('User authenticated:', user.email);
            
        } else {
            this.currentUser = null;
            this.userRole = null;
            this.isAuthenticated = false;
            
            // Clear user info from localStorage
            this.clearUserInfo();
            
            console.log('User signed out');
        }
    }

    // Load user role from Firestore
    async loadUserRole(userId) {
        try {
            const userDoc = await this.db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.userRole = userData.role;
                localStorage.setItem('userRole', this.userRole);
            } else {
                console.warn('User document not found in Firestore');
                this.userRole = null;
            }

        } catch (error) {
            console.error('Error loading user role:', error);
            await logError('USER_ROLE_LOAD_ERROR', error);
            this.userRole = null;
        }
    }

    // Store user info in localStorage
    storeUserInfo(user) {
        const userInfo = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastLogin: new Date().toISOString()
        };
        
        localStorage.setItem('currentUser', JSON.stringify(userInfo));
    }

    // Clear user info from localStorage
    clearUserInfo() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
    }

    // ==================== AUTHENTICATION METHODS ====================

    // Sign up with email and password
    async signUp(email, password, userData = {}) {
        try {
            // Validate input
            if (!utils.validators.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }
            
            if (!utils.validators.isValidPassword(password)) {
                throw new Error('Password must be at least 6 characters long');
            }

            // Create user account
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Add user to Firestore
            await this.db.collection('users').doc(user.uid).set({
                email: email,
                role: userData.role || 'member',
                memberId: userData.memberId || null,
                name: userData.name || '',
                phone: userData.phone || '',
                joinDate: new Date(),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Send email verification
            await user.sendEmailVerification();

            await logUserAction('USER_SIGNUP', {
                email: email,
                role: userData.role || 'member'
            });

            utils.domUtils.showAlert('Account created successfully! Please check your email for verification.', 'success');

            return user;

        } catch (error) {
            console.error('Error during sign up:', error);
            await logError('SIGNUP_ERROR', error);
            
            let errorMessage = 'An error occurred during sign up';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'This email is already registered';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password should be at least 6 characters long';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            utils.domUtils.showAlert(errorMessage, 'error');
            throw error;
        }
    }

    // Sign in with email and password
    async signIn(email, password, rememberMe = false) {
        try {
            // Validate input
            if (!utils.validators.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }
            
            if (!password || password.trim() === '') {
                throw new Error('Password is required');
            }

            // Set persistence based on remember me
            const persistence = rememberMe ? 
                firebase.auth.Auth.Persistence.LOCAL : 
                firebase.auth.Auth.Persistence.SESSION;
            
            await this.auth.setPersistence(persistence);

            // Sign in
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Check if email is verified
            if (!user.emailVerified) {
                utils.domUtils.showAlert('Please verify your email address before signing in.', 'warning');
                await this.auth.signOut();
                throw new Error('Email not verified');
            }

            // Update last login
            await this.updateLastLogin(user.uid);

            await logUserAction('USER_SIGNIN', {
                email: email,
                rememberMe: rememberMe
            });

            utils.domUtils.showAlert('Welcome back!', 'success');

            return user;

        } catch (error) {
            console.error('Error during sign in:', error);
            await logError('SIGNIN_ERROR', error);
            
            let errorMessage = 'An error occurred during sign in';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email address';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            utils.domUtils.showAlert(errorMessage, 'error');
            throw error;
        }
    }

    // Sign out
    async signOut() {
        try {
            await this.auth.signOut();
            
            await logUserAction('USER_SIGNOUT', {
                timestamp: new Date().toISOString()
            });

            utils.domUtils.showAlert('Signed out successfully', 'success');

        } catch (error) {
            console.error('Error during sign out:', error);
            await logError('SIGNOUT_ERROR', error);
            utils.domUtils.showAlert('Error signing out', 'error');
            throw error;
        }
    }

    // ==================== PASSWORD MANAGEMENT ====================

    // Reset password
    async resetPassword(email) {
        try {
            // Validate email
            if (!utils.validators.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            await this.auth.sendPasswordResetEmail(email);

            await logUserAction('PASSWORD_RESET_REQUESTED', {
                email: email
            });

            utils.domUtils.showAlert('Password reset email sent! Please check your inbox.', 'success');

        } catch (error) {
            console.error('Error sending password reset email:', error);
            await logError('PASSWORD_RESET_ERROR', error);
            
            let errorMessage = 'An error occurred while sending reset email';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email address';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            utils.domUtils.showAlert(errorMessage, 'error');
            throw error;
        }
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        try {
            const user = this.auth.currentUser;
            
            if (!user) {
                throw new Error('No user is currently signed in');
            }

            // Validate new password
            if (!utils.validators.isValidPassword(newPassword)) {
                throw new Error('New password must be at least 6 characters long');
            }

            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);

            // Change password
            await user.updatePassword(newPassword);

            await logUserAction('PASSWORD_CHANGED', {
                timestamp: new Date().toISOString()
            });

            utils.domUtils.showAlert('Password changed successfully!', 'success');

        } catch (error) {
            console.error('Error changing password:', error);
            await logError('PASSWORD_CHANGE_ERROR', error);
            
            let errorMessage = 'An error occurred while changing password';
            
            switch (error.code) {
                case 'auth/wrong-password':
                    errorMessage = 'Current password is incorrect';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'New password should be at least 6 characters long';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            utils.domUtils.showAlert(errorMessage, 'error');
            throw error;
        }
    }

    // ==================== EMAIL VERIFICATION ====================

    // Send email verification
    async sendEmailVerification() {
        try {
            const user = this.auth.currentUser;
            
            if (!user) {
                throw new Error('No user is currently signed in');
            }

            await user.sendEmailVerification();

            await logUserAction('EMAIL_VERIFICATION_SENT', {
                email: user.email
            });

            utils.domUtils.showAlert('Verification email sent! Please check your inbox.', 'success');

        } catch (error) {
            console.error('Error sending email verification:', error);
            await logError('EMAIL_VERIFICATION_ERROR', error);
            utils.domUtils.showAlert('Error sending verification email', 'error');
            throw error;
        }
    }

    // Check email verification status
    async checkEmailVerification() {
        try {
            const user = this.auth.currentUser;
            
            if (!user) {
                return false;
            }

            // Reload user to get latest verification status
            await user.reload();
            
            return user.emailVerified;

        } catch (error) {
            console.error('Error checking email verification:', error);
            await logError('EMAIL_VERIFICATION_CHECK_ERROR', error);
            return false;
        }
    }

    // ==================== USER PROFILE MANAGEMENT ====================

    // Update user profile
    async updateProfile(profileData) {
        try {
            const user = this.auth.currentUser;
            
            if (!user) {
                throw new Error('No user is currently signed in');
            }

            // Update Firebase Auth profile
            const authUpdates = {};
            if (profileData.displayName) authUpdates.displayName = profileData.displayName;
            if (profileData.photoURL) authUpdates.photoURL = profileData.photoURL;

            if (Object.keys(authUpdates).length > 0) {
                await user.updateProfile(authUpdates);
            }

            // Update Firestore user document
            await this.db.collection('users').doc(user.uid).update({
                ...profileData,
                updatedAt: new Date()
            });

            await logUserAction('PROFILE_UPDATED', {
                updatedFields: Object.keys(profileData)
            });

            utils.domUtils.showAlert('Profile updated successfully!', 'success');

        } catch (error) {
            console.error('Error updating profile:', error);
            await logError('PROFILE_UPDATE_ERROR', error);
            utils.domUtils.showAlert('Error updating profile', 'error');
            throw error;
        }
    }

    // Delete user account
    async deleteAccount(password) {
        try {
            const user = this.auth.currentUser;
            
            if (!user) {
                throw new Error('No user is currently signed in');
            }

            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await user.reauthenticateWithCredential(credential);

            // Delete user document from Firestore
            await this.db.collection('users').doc(user.uid).delete();

            // Delete user account
            await user.delete();

            await logUserAction('ACCOUNT_DELETED', {
                timestamp: new Date().toISOString()
            });

            utils.domUtils.showAlert('Account deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting account:', error);
            await logError('ACCOUNT_DELETION_ERROR', error);
            
            let errorMessage = 'An error occurred while deleting account';
            
            switch (error.code) {
                case 'auth/wrong-password':
                    errorMessage = 'Password is incorrect';
                    break;
                case 'auth/requires-recent-login':
                    errorMessage = 'Please sign in again before deleting your account';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            utils.domUtils.showAlert(errorMessage, 'error');
            throw error;
        }
    }

    // ==================== AUTHORIZATION METHODS ====================

    // Check if user is admin
    isAdmin() {
        return this.userRole === 'admin';
    }

    // Check if user is member
    isMember() {
        return this.userRole === 'member';
    }

    // Check if user has specific role
    hasRole(role) {
        return this.userRole === role;
    }

    // Check if user has permission
    hasPermission(permission) {
        if (!this.isAuthenticated) return false;
        
        // Admin has all permissions
        if (this.isAdmin()) return true;
        
        // Add specific permission checks here
        const permissionMap = {
            'view_members': ['admin', 'member'],
            'edit_members': ['admin'],
            'delete_members': ['admin'],
            'view_bills': ['admin', 'member'],
            'create_bills': ['admin'],
            'process_payments': ['admin'],
            'view_reports': ['admin'],
            'manage_supplements': ['admin'],
            'create_diet_plans': ['admin']
        };
        
        return permissionMap[permission]?.includes(this.userRole) || false;
    }

    // Require authentication
    requireAuth() {
        if (!this.isAuthenticated) {
            window.location.href = '/member/login.html';
            return false;
        }
        return true;
    }

    // Require admin access
    requireAdmin() {
        if (!this.requireAuth()) return false;
        
        if (!this.isAdmin()) {
            utils.domUtils.showAlert('Access denied. Admin privileges required.', 'error');
            window.location.href = '/';
            return false;
        }
        return true;
    }

    // Require specific role
    requireRole(role) {
        if (!this.requireAuth()) return false;
        
        if (!this.hasRole(role)) {
            utils.domUtils.showAlert(`Access denied. ${role} privileges required.`, 'error');
            window.location.href = '/';
            return false;
        }
        return true;
    }

    // Require specific permission
    requirePermission(permission) {
        if (!this.requireAuth()) return false;
        
        if (!this.hasPermission(permission)) {
            utils.domUtils.showAlert('Access denied. Insufficient permissions.', 'error');
            window.location.href = '/';
            return false;
        }
        return true;
    }

    // ==================== SESSION MANAGEMENT ====================

    // Update last login
    async updateLastLogin(userId) {
        try {
            await this.db.collection('users').doc(userId).update({
                lastLogin: new Date(),
                updatedAt: new Date()
            });

        } catch (error) {
            console.error('Error updating last login:', error);
            await logError('LAST_LOGIN_UPDATE_ERROR', error);
        }
    }

    // Get current user
    getCurrentUser() {
        if (!this.isAuthenticated) return null;
        
        return {
            uid: this.currentUser.uid,
            email: this.currentUser.email,
            displayName: this.currentUser.displayName,
            photoURL: this.currentUser.photoURL,
            role: this.userRole
        };
    }

    // Get user role
    getUserRole() {
        return this.userRole;
    }

    // Check if user is authenticated
    getAuthStatus() {
        return this.isAuthenticated;
    }

    // ==================== SECURITY METHODS ====================

    // Validate session
    validateSession() {
        const userInfo = localStorage.getItem('currentUser');
        const userRole = localStorage.getItem('userRole');
        
        if (!userInfo || !userRole) {
            this.clearUserInfo();
            return false;
        }
        
        try {
            const user = JSON.parse(userInfo);
            const now = new Date();
            const lastLogin = new Date(user.lastLogin);
            
            // Check if session is older than 24 hours
            const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
            if (now - lastLogin > sessionTimeout) {
                this.clearUserInfo();
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('Error validating session:', error);
            this.clearUserInfo();
            return false;
        }
    }

    // Refresh session
    async refreshSession() {
        try {
            const user = this.auth.currentUser;
            
            if (user) {
                await user.reload();
                await this.updateLastLogin(user.uid);
                
                const userInfo = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    lastLogin: new Date().toISOString()
                };
                
                localStorage.setItem('currentUser', JSON.stringify(userInfo));
            }
            
        } catch (error) {
            console.error('Error refreshing session:', error);
            await logError('SESSION_REFRESH_ERROR', error);
        }
    }

    // ==================== UTILITY METHODS ====================

    // Generate secure password
    generateSecurePassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        return password;
    }

    // Validate password strength
    validatePasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };
        
        const score = Object.values(checks).filter(Boolean).length;
        
        return {
            score: score,
            isStrong: score >= 4,
            checks: checks
        };
    }

    // Get password strength message
    getPasswordStrengthMessage(strength) {
        if (strength.score <= 2) return 'Weak password';
        if (strength.score <= 3) return 'Fair password';
        if (strength.score <= 4) return 'Good password';
        return 'Strong password';
    }
}

// Create global authentication manager instance
const authManager = new AuthManager();

// Export for use in other modules
window.authManager = authManager;

// Export individual auth functions for backward compatibility
window.signUp = async function(email, password, userData) {
    return await authManager.signUp(email, password, userData);
};

window.signIn = async function(email, password, rememberMe) {
    return await authManager.signIn(email, password, rememberMe);
};

window.signOut = async function() {
    return await authManager.signOut();
};

window.resetPassword = async function(email) {
    return await authManager.resetPassword(email);
};

window.changePassword = async function(currentPassword, newPassword) {
    return await authManager.changePassword(currentPassword, newPassword);
};

window.sendEmailVerification = async function() {
    return await authManager.sendEmailVerification();
};

window.checkEmailVerification = async function() {
    return await authManager.checkEmailVerification();
};

window.updateProfile = async function(profileData) {
    return await authManager.updateProfile(profileData);
};

window.deleteAccount = async function(password) {
    return await authManager.deleteAccount(password);
};

window.isAdmin = function() {
    return authManager.isAdmin();
};

window.isMember = function() {
    return authManager.isMember();
};

window.hasRole = function(role) {
    return authManager.hasRole(role);
};

window.hasPermission = function(permission) {
    return authManager.hasPermission(permission);
};

window.requireAuth = function() {
    return authManager.requireAuth();
};

window.requireAdmin = function() {
    return authManager.requireAdmin();
};

window.requireRole = function(role) {
    return authManager.requireRole(role);
};

window.requirePermission = function(permission) {
    return authManager.requirePermission(permission);
};

window.getCurrentUser = function() {
    return authManager.getCurrentUser();
};

window.getUserRole = function() {
    return authManager.getUserRole();
};

window.getAuthStatus = function() {
    return authManager.getAuthStatus();
}; 