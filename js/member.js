// Member Module for Gym Management System
// Handles member-specific functionality

class MemberManager {
    constructor() {
        this.currentUser = null;
        this.memberData = {};
        this.init();
    }

    // Initialize member functionality
    async init() {
        try {
            // Check authentication
            if (!window.authManager || !window.authManager.isAuthenticated) {
                window.location.href = '/member/login.html';
                return;
            }

            // Check if user is member
            if (!window.authManager.isMember()) {
                utils.domUtils.showAlert('Access denied. Member privileges required.', 'error');
                window.location.href = '/';
                return;
            }

            this.currentUser = window.authManager.getCurrentUser();
            
            // Log member page access
            await logMemberAction('MEMBER_PAGE_ACCESS', {
                page: window.location.pathname,
                timestamp: new Date().toISOString()
            });

            // Load member data
            await this.loadMemberData();

        } catch (error) {
            console.error('Error initializing member:', error);
            await logError('MEMBER_INIT_ERROR', error);
        }
    }

    // Load member data
    async loadMemberData() {
        try {
            const db = window.firebase.db;
            
            // Get member data from Firestore
            const memberDoc = await db.collection('members')
                .where('email', '==', this.currentUser.email)
                .get();

            if (!memberDoc.empty) {
                const memberData = memberDoc.docs[0].data();
                this.memberData = {
                    id: memberDoc.docs[0].id,
                    ...memberData
                };
            }

            // Load member's bills
            await this.loadMemberBills();
            
            // Load member's receipts
            await this.loadMemberReceipts();

        } catch (error) {
            console.error('Error loading member data:', error);
            await logError('MEMBER_DATA_LOAD_ERROR', error);
        }
    }

    // Load member's bills
    async loadMemberBills() {
        try {
            const db = window.firebase.db;
            
            const billsSnapshot = await db.collection('bills')
                .where('memberId', '==', this.memberData.id)
                .orderBy('createdAt', 'desc')
                .get();

            const bills = [];
            billsSnapshot.forEach(doc => {
                bills.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.memberData.bills = bills;

        } catch (error) {
            console.error('Error loading member bills:', error);
            this.memberData.bills = [];
        }
    }

    // Load member's receipts
    async loadMemberReceipts() {
        try {
            const db = window.firebase.db;
            
            const receiptsSnapshot = await db.collection('receipts')
                .where('memberId', '==', this.memberData.id)
                .orderBy('paymentDate', 'desc')
                .get();

            const receipts = [];
            receiptsSnapshot.forEach(doc => {
                receipts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.memberData.receipts = receipts;

        } catch (error) {
            console.error('Error loading member receipts:', error);
            this.memberData.receipts = [];
        }
    }

    // Get member's current bill
    getCurrentBill() {
        if (!this.memberData.bills || this.memberData.bills.length === 0) {
            return null;
        }

        // Return the most recent unpaid bill
        return this.memberData.bills.find(bill => bill.status === 'pending') || 
               this.memberData.bills.find(bill => bill.status === 'unpaid') ||
               this.memberData.bills[0];
    }

    // Get member's payment history
    getPaymentHistory() {
        return this.memberData.receipts || [];
    }

    // Get member's membership status
    getMembershipStatus() {
        if (!this.memberData) return 'unknown';
        
        const today = new Date();
        const joinDate = new Date(this.memberData.joinDate);
        const membershipEnd = new Date(this.memberData.membershipEndDate || joinDate);
        
        if (today > membershipEnd) {
            return 'expired';
        } else if (today.getTime() + (30 * 24 * 60 * 60 * 1000) > membershipEnd.getTime()) {
            return 'expiring_soon';
        } else {
            return 'active';
        }
    }

    // Update member profile
    async updateProfile(profileData) {
        try {
            const db = window.firebase.db;
            
            await db.collection('members').doc(this.memberData.id).update({
                ...profileData,
                updatedAt: new Date()
            });

            // Reload member data
            await this.loadMemberData();

            await logMemberAction('PROFILE_UPDATED', {
                updatedFields: Object.keys(profileData)
            });

            utils.domUtils.showAlert('Profile updated successfully!', 'success');

        } catch (error) {
            console.error('Error updating profile:', error);
            await logError('PROFILE_UPDATE_ERROR', error);
            utils.domUtils.showAlert('Error updating profile', 'error');
        }
    }

    // Download receipt
    async downloadReceipt(receiptId) {
        try {
            const receipt = this.memberData.receipts.find(r => r.id === receiptId);
            if (!receipt) {
                throw new Error('Receipt not found');
            }

            // Generate receipt PDF content
            const receiptContent = this.generateReceiptPDF(receipt);
            
            // Download the receipt
            const filename = `receipt-${receipt.receiptNumber}-${new Date(receipt.paymentDate).toISOString().split('T')[0]}.pdf`;
            utils.domUtils.downloadFile(receiptContent, filename, 'application/pdf');

            await logMemberAction('RECEIPT_DOWNLOADED', {
                receiptId: receiptId,
                receiptNumber: receipt.receiptNumber
            });

        } catch (error) {
            console.error('Error downloading receipt:', error);
            await logError('RECEIPT_DOWNLOAD_ERROR', error);
            utils.domUtils.showAlert('Error downloading receipt', 'error');
        }
    }

    // Generate receipt PDF content (simplified)
    generateReceiptPDF(receipt) {
        // This is a simplified version - in a real app, you'd use a PDF library
        const content = `
            <html>
                <head>
                    <title>Receipt - ${receipt.receiptNumber}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .receipt-details { margin-bottom: 20px; }
                        .amount { font-size: 24px; font-weight: bold; }
                        .footer { margin-top: 40px; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>GymPro</h1>
                        <h2>Payment Receipt</h2>
                    </div>
                    <div class="receipt-details">
                        <p><strong>Receipt Number:</strong> ${receipt.receiptNumber}</p>
                        <p><strong>Date:</strong> ${new Date(receipt.paymentDate).toLocaleDateString()}</p>
                        <p><strong>Amount:</strong> <span class="amount">$${receipt.amount}</span></p>
                        <p><strong>Payment Method:</strong> ${receipt.paymentMethod || 'Not specified'}</p>
                    </div>
                    <div class="footer">
                        <p>Thank you for your payment!</p>
                        <p>GymPro - Your Fitness Partner</p>
                    </div>
                </body>
            </html>
        `;
        
        return content;
    }

    // Logout member
    async logout() {
        try {
            await logMemberAction('LOGOUT_ATTEMPT', {
                timestamp: new Date().toISOString()
            });

            await window.authManager.logout();

        } catch (error) {
            console.error('Error during logout:', error);
            await logError('MEMBER_LOGOUT_ERROR', error);
        }
    }
}

// Create global member manager instance
const memberManager = new MemberManager();

// Global functions for member functionality
window.downloadReceipt = async function(receiptId) {
    return await memberManager.downloadReceipt(receiptId);
};

window.updateMemberProfile = async function(profileData) {
    return await memberManager.updateProfile(profileData);
};

// Initialize member login form
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('memberLoginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const email = formData.get('email');
            const password = formData.get('password');
            const rememberMe = formData.get('rememberMe') === 'on';
            
            try {
                const user = await window.authManager.signIn(email, password, rememberMe);
                const userRole = await window.authManager.getUserRole();
                if (userRole === 'member') {
                    await logMemberAction('MEMBER_LOGIN_SUCCESS', { email: email, timestamp: new Date().toISOString() });
                    window.location.href = '/member/dashboard.html';
                } else {
                    await window.authManager.signOut();
                    utils.domUtils.showAlert('Access denied. Member privileges required.', 'error');
                    await logError('MEMBER_LOGIN_DENIED', { email: email, reason: 'Non-member user attempted member login' });
                }
            } catch (error) {
                console.error('Member login error:', error);
                utils.domUtils.showAlert('An error occurred during login. Please try again.', 'error');
                await logError('MEMBER_LOGIN_ERROR', error);
            }
        });
    }
    
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(forgotPasswordForm);
            const email = formData.get('resetEmail');
            
            try {
                await window.authManager.resetPassword(email);
                closeForgotPassword();
                forgotPasswordForm.reset();
            } catch (error) {
                // Error is already handled in resetPassword method
            }
        });
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeForgotPassword();
            }
        });
    }
});

// Global functions for member login page
window.togglePassword = function() {
    const passwordInput = document.getElementById('password');
    const toggleButton = document.querySelector('.password-toggle i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleButton.className = 'fas fa-eye';
    }
};

window.showForgotPassword = function() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.closeForgotPassword = function() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Export member manager for use in other modules
window.memberManager = memberManager; 