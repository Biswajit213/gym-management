// Firebase Backend Services for Gym Management System
// Comprehensive backend functionality with advanced features

class FirebaseServices {
    constructor() {
        this.db = window.firebase.db;
        this.auth = window.firebase.auth;
        this.storage = window.firebase.storage;
        this.collections = window.firebase.collections;
        this.storageRefs = window.firebase.storageRefs;
        
        // Initialize services
        this.init();
    }

    // Initialize services
    async init() {
        try {
            // Set up real-time listeners
            this.setupRealtimeListeners();
            
            // Initialize offline persistence
            await this.setupOfflinePersistence();
            
            console.log('Firebase Services initialized successfully');
            
        } catch (error) {
            console.error('Error initializing Firebase Services:', error);
            await logError('FIREBASE_SERVICES_INIT_ERROR', error);
        }
    }

    // Setup offline persistence
    async setupOfflinePersistence() {
        try {
            await this.db.enablePersistence({
                synchronizeTabs: true
            });
        } catch (error) {
            if (error.code === 'failed-precondition') {
                console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time');
            } else if (error.code === 'unimplemented') {
                console.warn('Persistence not supported by browser');
            }
        }
    }

    // Setup real-time listeners
    setupRealtimeListeners() {
        // Listen for authentication state changes
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.handleUserLogin(user);
            } else {
                await this.handleUserLogout();
            }
        });

        // Listen for network state changes
        window.addEventListener('online', () => {
            this.handleOnlineStatus();
        });

        window.addEventListener('offline', () => {
            this.handleOfflineStatus();
        });
    }

    // Handle user login
    async handleUserLogin(user) {
        try {
            // Update user's last login
            await this.updateUserLastLogin(user.uid);
            
            // Log login event
            await logUserAction('USER_LOGIN', {
                email: user.email,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error handling user login:', error);
            await logError('USER_LOGIN_HANDLER_ERROR', error);
        }
    }

    // Handle user logout
    async handleUserLogout() {
        try {
            await logUserAction('USER_LOGOUT', {
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error handling user logout:', error);
            await logError('USER_LOGOUT_HANDLER_ERROR', error);
        }
    }

    // Handle online status
    handleOnlineStatus() {
        console.log('Application is online');
        utils.domUtils.showAlert('Connection restored', 'success', 3000);
    }

    // Handle offline status
    handleOfflineStatus() {
        console.log('Application is offline');
        utils.domUtils.showAlert('You are currently offline. Some features may be limited.', 'warning', 5000);
    }

    // ==================== MEMBER MANAGEMENT ====================

    // Create new member
    async createMember(memberData) {
        try {
            const memberId = utils.formatters.generateMemberId();
            
            const memberDoc = {
                id: memberId,
                ...memberData,
                joinDate: new Date(),
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.db.collection(this.collections.MEMBERS).doc(memberId).set(memberDoc);

            // Create user account
            await this.createUserAccount(memberData.email, memberData.password, 'member', memberId);

            await logMemberOperation('MEMBER_CREATED', memberId, true, memberData);

            return memberId;

        } catch (error) {
            console.error('Error creating member:', error);
            await logError('MEMBER_CREATION_ERROR', error);
            throw error;
        }
    }

    // Get member by ID
    async getMember(memberId) {
        try {
            const doc = await this.db.collection(this.collections.MEMBERS).doc(memberId).get();
            
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            } else {
                throw new Error('Member not found');
            }

        } catch (error) {
            console.error('Error getting member:', error);
            await logError('MEMBER_GET_ERROR', error);
            throw error;
        }
    }

    // Update member
    async updateMember(memberId, updateData) {
        try {
            const updateDoc = {
                ...updateData,
                updatedAt: new Date()
            };

            await this.db.collection(this.collections.MEMBERS).doc(memberId).update(updateDoc);

            await logMemberOperation('MEMBER_UPDATED', memberId, true, updateData);

        } catch (error) {
            console.error('Error updating member:', error);
            await logError('MEMBER_UPDATE_ERROR', error);
            throw error;
        }
    }

    // Delete member
    async deleteMember(memberId) {
        try {
            await this.db.collection(this.collections.MEMBERS).doc(memberId).delete();

            await logMemberOperation('MEMBER_DELETED', memberId, true);

        } catch (error) {
            console.error('Error deleting member:', error);
            await logError('MEMBER_DELETE_ERROR', error);
            throw error;
        }
    }

    // Get all members with pagination
    async getMembers(page = 1, limit = 20, filters = {}) {
        try {
            let query = this.db.collection(this.collections.MEMBERS);

            // Apply filters
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            if (filters.membershipType) {
                query = query.where('membershipType', '==', filters.membershipType);
            }

            // Apply pagination
            const offset = (page - 1) * limit;
            query = query.orderBy('createdAt', 'desc').limit(limit);

            const snapshot = await query.get();
            const members = [];

            snapshot.forEach(doc => {
                members.push({ id: doc.id, ...doc.data() });
            });

            return members;

        } catch (error) {
            console.error('Error getting members:', error);
            await logError('MEMBERS_GET_ERROR', error);
            throw error;
        }
    }

    // Search members
    async searchMembers(searchTerm, limit = 20) {
        try {
            const membersSnapshot = await this.db.collection(this.collections.MEMBERS)
                .where('name', '>=', searchTerm)
                .where('name', '<=', searchTerm + '\uf8ff')
                .limit(limit)
                .get();

            const members = [];
            membersSnapshot.forEach(doc => {
                members.push({ id: doc.id, ...doc.data() });
            });

            return members;

        } catch (error) {
            console.error('Error searching members:', error);
            await logError('MEMBERS_SEARCH_ERROR', error);
            throw error;
        }
    }

    // ==================== BILLING & PAYMENTS ====================

    // Create bill
    async createBill(billData) {
        try {
            const billId = utils.formatters.generateReceiptNumber();
            
            const billDoc = {
                id: billId,
                ...billData,
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.db.collection(this.collections.BILLS).doc(billId).set(billDoc);

            await logPayment('BILL_CREATED', billData.amount, true, billData);

            return billId;

        } catch (error) {
            console.error('Error creating bill:', error);
            await logError('BILL_CREATION_ERROR', error);
            throw error;
        }
    }

    // Process payment
    async processPayment(paymentData) {
        try {
            const receiptId = utils.formatters.generateReceiptNumber();
            
            const receiptDoc = {
                id: receiptId,
                ...paymentData,
                paymentDate: new Date(),
                status: 'completed',
                createdAt: new Date()
            };

            await this.db.collection(this.collections.RECEIPTS).doc(receiptId).set(receiptDoc);

            // Update bill status
            if (paymentData.billId) {
                await this.updateBillStatus(paymentData.billId, 'paid');
            }

            await logPayment('PAYMENT_PROCESSED', paymentData.amount, true, paymentData);

            return receiptId;

        } catch (error) {
            console.error('Error processing payment:', error);
            await logError('PAYMENT_PROCESSING_ERROR', error);
            throw error;
        }
    }

    // Update bill status
    async updateBillStatus(billId, status) {
        try {
            await this.db.collection(this.collections.BILLS).doc(billId).update({
                status: status,
                updatedAt: new Date()
            });

        } catch (error) {
            console.error('Error updating bill status:', error);
            await logError('BILL_STATUS_UPDATE_ERROR', error);
            throw error;
        }
    }

    // Get member bills
    async getMemberBills(memberId) {
        try {
            const billsSnapshot = await this.db.collection(this.collections.BILLS)
                .where('memberId', '==', memberId)
                .orderBy('createdAt', 'desc')
                .get();

            const bills = [];
            billsSnapshot.forEach(doc => {
                bills.push({ id: doc.id, ...doc.data() });
            });

            return bills;

        } catch (error) {
            console.error('Error getting member bills:', error);
            await logError('MEMBER_BILLS_GET_ERROR', error);
            throw error;
        }
    }

    // Get member receipts
    async getMemberReceipts(memberId) {
        try {
            const receiptsSnapshot = await this.db.collection(this.collections.RECEIPTS)
                .where('memberId', '==', memberId)
                .orderBy('paymentDate', 'desc')
                .get();

            const receipts = [];
            receiptsSnapshot.forEach(doc => {
                receipts.push({ id: doc.id, ...doc.data() });
            });

            return receipts;

        } catch (error) {
            console.error('Error getting member receipts:', error);
            await logError('MEMBER_RECEIPTS_GET_ERROR', error);
            throw error;
        }
    }

    // ==================== SUPPLEMENTS & DIET ====================

    // Add supplement
    async addSupplement(supplementData) {
        try {
            const supplementId = utils.formatters.generateRandomString(8);
            
            const supplementDoc = {
                id: supplementId,
                ...supplementData,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.db.collection(this.collections.SUPPLEMENTS).doc(supplementId).set(supplementDoc);

            await logSupplementOperation('SUPPLEMENT_ADDED', supplementId, true, supplementData);

            return supplementId;

        } catch (error) {
            console.error('Error adding supplement:', error);
            await logError('SUPPLEMENT_ADDITION_ERROR', error);
            throw error;
        }
    }

    // Get supplements
    async getSupplements(category = null) {
        try {
            let query = this.db.collection(this.collections.SUPPLEMENTS);

            if (category) {
                query = query.where('category', '==', category);
            }

            const snapshot = await query.get();
            const supplements = [];

            snapshot.forEach(doc => {
                supplements.push({ id: doc.id, ...doc.data() });
            });

            return supplements;

        } catch (error) {
            console.error('Error getting supplements:', error);
            await logError('SUPPLEMENTS_GET_ERROR', error);
            throw error;
        }
    }

    // Create diet plan
    async createDietPlan(dietData) {
        try {
            const dietId = utils.formatters.generateRandomString(8);
            
            const dietDoc = {
                id: dietId,
                ...dietData,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.db.collection(this.collections.DIETS).doc(dietId).set(dietDoc);

            await logDietOperation('DIET_CREATED', dietData.memberId, true, dietData);

            return dietId;

        } catch (error) {
            console.error('Error creating diet plan:', error);
            await logError('DIET_CREATION_ERROR', error);
            throw error;
        }
    }

    // Get member diet plans
    async getMemberDietPlans(memberId) {
        try {
            const dietsSnapshot = await this.db.collection(this.collections.DIETS)
                .where('memberId', '==', memberId)
                .orderBy('createdAt', 'desc')
                .get();

            const diets = [];
            dietsSnapshot.forEach(doc => {
                diets.push({ id: doc.id, ...doc.data() });
            });

            return diets;

        } catch (error) {
            console.error('Error getting member diet plans:', error);
            await logError('MEMBER_DIET_PLANS_GET_ERROR', error);
            throw error;
        }
    }

    // ==================== NOTIFICATIONS ====================

    // Send notification
    async sendNotification(notificationData) {
        try {
            const notificationId = utils.formatters.generateRandomString(8);
            
            const notificationDoc = {
                id: notificationId,
                ...notificationData,
                status: 'unread',
                createdAt: new Date()
            };

            await this.db.collection(this.collections.NOTIFICATIONS).doc(notificationId).set(notificationDoc);

            await logNotification('NOTIFICATION_SENT', notificationData.type, true, notificationData);

            return notificationId;

        } catch (error) {
            console.error('Error sending notification:', error);
            await logError('NOTIFICATION_SEND_ERROR', error);
            throw error;
        }
    }

    // Get member notifications
    async getMemberNotifications(memberId, limit = 20) {
        try {
            const notificationsSnapshot = await this.db.collection(this.collections.NOTIFICATIONS)
                .where('memberId', '==', memberId)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const notifications = [];
            notificationsSnapshot.forEach(doc => {
                notifications.push({ id: doc.id, ...doc.data() });
            });

            return notifications;

        } catch (error) {
            console.error('Error getting member notifications:', error);
            await logError('MEMBER_NOTIFICATIONS_GET_ERROR', error);
            throw error;
        }
    }

    // Mark notification as read
    async markNotificationAsRead(notificationId) {
        try {
            await this.db.collection(this.collections.NOTIFICATIONS).doc(notificationId).update({
                status: 'read',
                readAt: new Date()
            });

        } catch (error) {
            console.error('Error marking notification as read:', error);
            await logError('NOTIFICATION_MARK_READ_ERROR', error);
            throw error;
        }
    }

    // ==================== FILE UPLOADS ====================

    // Upload profile image
    async uploadProfileImage(file, userId) {
        try {
            const fileName = `profile-${userId}-${Date.now()}.jpg`;
            const storageRef = this.storage.ref().child(`${this.storageRefs.PROFILE_IMAGES}/${fileName}`);
            
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            // Update user profile with image URL
            await this.updateUserProfileImage(userId, downloadURL);

            await logFileOperation('PROFILE_IMAGE_UPLOADED', fileName, true, {
                userId: userId,
                fileSize: file.size,
                downloadURL: downloadURL
            });

            return downloadURL;

        } catch (error) {
            console.error('Error uploading profile image:', error);
            await logError('PROFILE_IMAGE_UPLOAD_ERROR', error);
            throw error;
        }
    }

    // Upload receipt PDF
    async uploadReceiptPDF(file, receiptId) {
        try {
            const fileName = `receipt-${receiptId}-${Date.now()}.pdf`;
            const storageRef = this.storage.ref().child(`${this.storageRefs.RECEIPT_PDFS}/${fileName}`);
            
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            // Update receipt with PDF URL
            await this.updateReceiptPDF(receiptId, downloadURL);

            await logFileOperation('RECEIPT_PDF_UPLOADED', fileName, true, {
                receiptId: receiptId,
                fileSize: file.size,
                downloadURL: downloadURL
            });

            return downloadURL;

        } catch (error) {
            console.error('Error uploading receipt PDF:', error);
            await logError('RECEIPT_PDF_UPLOAD_ERROR', error);
            throw error;
        }
    }

    // ==================== USER MANAGEMENT ====================

    // Create user account
    async createUserAccount(email, password, role, memberId = null) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Add user to Firestore
            await this.db.collection(this.collections.USERS).doc(user.uid).set({
                email: email,
                role: role,
                memberId: memberId,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await logUserAction('USER_ACCOUNT_CREATED', {
                email: email,
                role: role,
                memberId: memberId
            });

            return user.uid;

        } catch (error) {
            console.error('Error creating user account:', error);
            await logError('USER_ACCOUNT_CREATION_ERROR', error);
            throw error;
        }
    }

    // Update user profile image
    async updateUserProfileImage(userId, imageURL) {
        try {
            await this.db.collection(this.collections.USERS).doc(userId).update({
                profileImage: imageURL,
                updatedAt: new Date()
            });

        } catch (error) {
            console.error('Error updating user profile image:', error);
            await logError('USER_PROFILE_IMAGE_UPDATE_ERROR', error);
            throw error;
        }
    }

    // Update user last login
    async updateUserLastLogin(userId) {
        try {
            await this.db.collection(this.collections.USERS).doc(userId).update({
                lastLogin: new Date(),
                updatedAt: new Date()
            });

        } catch (error) {
            console.error('Error updating user last login:', error);
            await logError('USER_LAST_LOGIN_UPDATE_ERROR', error);
        }
    }

    // Update receipt PDF
    async updateReceiptPDF(receiptId, pdfURL) {
        try {
            await this.db.collection(this.collections.RECEIPTS).doc(receiptId).update({
                pdfURL: pdfURL,
                updatedAt: new Date()
            });

        } catch (error) {
            console.error('Error updating receipt PDF:', error);
            await logError('RECEIPT_PDF_UPDATE_ERROR', error);
            throw error;
        }
    }

    // ==================== REPORTING & ANALYTICS ====================

    // Generate revenue report
    async generateRevenueReport(startDate, endDate) {
        try {
            const receiptsSnapshot = await this.db.collection(this.collections.RECEIPTS)
                .where('paymentDate', '>=', startDate)
                .where('paymentDate', '<=', endDate)
                .get();

            let totalRevenue = 0;
            const monthlyRevenue = {};
            const paymentMethods = {};

            receiptsSnapshot.forEach(doc => {
                const receipt = doc.data();
                totalRevenue += receipt.amount || 0;

                // Monthly breakdown
                const month = new Date(receipt.paymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (receipt.amount || 0);

                // Payment method breakdown
                const method = receipt.paymentMethod || 'Unknown';
                paymentMethods[method] = (paymentMethods[method] || 0) + (receipt.amount || 0);
            });

            const report = {
                totalRevenue,
                monthlyRevenue,
                paymentMethods,
                period: { startDate, endDate },
                generatedAt: new Date()
            };

            await logReportGeneration('REVENUE_REPORT', true, report);

            return report;

        } catch (error) {
            console.error('Error generating revenue report:', error);
            await logError('REVENUE_REPORT_GENERATION_ERROR', error);
            throw error;
        }
    }

    // Generate membership report
    async generateMembershipReport() {
        try {
            const membersSnapshot = await this.db.collection(this.collections.MEMBERS).get();

            let totalMembers = 0;
            let activeMembers = 0;
            let expiredMembers = 0;
            const membershipTypes = {};
            const joinDates = {};

            membersSnapshot.forEach(doc => {
                const member = doc.data();
                totalMembers++;

                if (member.status === 'active') {
                    activeMembers++;
                } else if (member.status === 'expired') {
                    expiredMembers++;
                }

                // Membership type breakdown
                const type = member.membershipType || 'Unknown';
                membershipTypes[type] = (membershipTypes[type] || 0) + 1;

                // Join date breakdown (by month)
                const joinMonth = new Date(member.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                joinDates[joinMonth] = (joinDates[joinMonth] || 0) + 1;
            });

            const report = {
                totalMembers,
                activeMembers,
                expiredMembers,
                membershipTypes,
                joinDates,
                generatedAt: new Date()
            };

            await logReportGeneration('MEMBERSHIP_REPORT', true, report);

            return report;

        } catch (error) {
            console.error('Error generating membership report:', error);
            await logError('MEMBERSHIP_REPORT_GENERATION_ERROR', error);
            throw error;
        }
    }

    // ==================== DATA EXPORT/IMPORT ====================

    // Export data to JSON
    async exportData(collection, filters = {}) {
        try {
            let query = this.db.collection(collection);

            // Apply filters
            Object.keys(filters).forEach(key => {
                query = query.where(key, '==', filters[key]);
            });

            const snapshot = await query.get();
            const data = [];

            snapshot.forEach(doc => {
                data.push({ id: doc.id, ...doc.data() });
            });

            const exportData = {
                collection: collection,
                filters: filters,
                data: data,
                exportedAt: new Date(),
                totalRecords: data.length
            };

            await logFileOperation('DATA_EXPORTED', `${collection}-export.json`, true, exportData);

            return exportData;

        } catch (error) {
            console.error('Error exporting data:', error);
            await logError('DATA_EXPORT_ERROR', error);
            throw error;
        }
    }

    // Import data from JSON
    async importData(collection, data) {
        try {
            const batch = this.db.batch();
            let successCount = 0;
            let errorCount = 0;

            for (const item of data) {
                try {
                    const docRef = this.db.collection(collection).doc(item.id || utils.formatters.generateRandomString(8));
                    batch.set(docRef, {
                        ...item,
                        importedAt: new Date(),
                        updatedAt: new Date()
                    });
                    successCount++;
                } catch (error) {
                    errorCount++;
                    console.error('Error importing item:', error);
                }
            }

            await batch.commit();

            await logFileOperation('DATA_IMPORTED', `${collection}-import.json`, true, {
                collection: collection,
                successCount: successCount,
                errorCount: errorCount,
                totalRecords: data.length
            });

            return { successCount, errorCount, totalRecords: data.length };

        } catch (error) {
            console.error('Error importing data:', error);
            await logError('DATA_IMPORT_ERROR', error);
            throw error;
        }
    }

    // ==================== BACKUP & RESTORE ====================

    // Create backup
    async createBackup() {
        try {
            const collections = [
                this.collections.MEMBERS,
                this.collections.BILLS,
                this.collections.RECEIPTS,
                this.collections.SUPPLEMENTS,
                this.collections.DIETS,
                this.collections.NOTIFICATIONS,
                this.collections.USERS
            ];

            const backup = {
                timestamp: new Date(),
                collections: {}
            };

            for (const collection of collections) {
                backup.collections[collection] = await this.exportData(collection);
            }

            await logFileOperation('BACKUP_CREATED', `backup-${new Date().toISOString().split('T')[0]}.json`, true, backup);

            return backup;

        } catch (error) {
            console.error('Error creating backup:', error);
            await logError('BACKUP_CREATION_ERROR', error);
            throw error;
        }
    }

    // Restore from backup
    async restoreFromBackup(backup) {
        try {
            let totalSuccess = 0;
            let totalErrors = 0;

            for (const [collection, data] of Object.entries(backup.collections)) {
                try {
                    const result = await this.importData(collection, data.data);
                    totalSuccess += result.successCount;
                    totalErrors += result.errorCount;
                } catch (error) {
                    console.error(`Error restoring collection ${collection}:`, error);
                    totalErrors++;
                }
            }

            await logFileOperation('BACKUP_RESTORED', 'backup-restore.json', true, {
                totalSuccess,
                totalErrors,
                backupTimestamp: backup.timestamp
            });

            return { totalSuccess, totalErrors };

        } catch (error) {
            console.error('Error restoring from backup:', error);
            await logError('BACKUP_RESTORE_ERROR', error);
            throw error;
        }
    }
}

// Create global Firebase services instance
const firebaseServices = new FirebaseServices();

// Export for use in other modules
window.firebaseServices = firebaseServices;

// Export individual service functions for backward compatibility
window.createMember = async function(memberData) {
    return await firebaseServices.createMember(memberData);
};

window.getMember = async function(memberId) {
    return await firebaseServices.getMember(memberId);
};

window.updateMember = async function(memberId, updateData) {
    return await firebaseServices.updateMember(memberId, updateData);
};

window.deleteMember = async function(memberId) {
    return await firebaseServices.deleteMember(memberId);
};

window.getMembers = async function(page, limit, filters) {
    return await firebaseServices.getMembers(page, limit, filters);
};

window.searchMembers = async function(searchTerm, limit) {
    return await firebaseServices.searchMembers(searchTerm, limit);
};

window.createBill = async function(billData) {
    return await firebaseServices.createBill(billData);
};

window.processPayment = async function(paymentData) {
    return await firebaseServices.processPayment(paymentData);
};

window.getMemberBills = async function(memberId) {
    return await firebaseServices.getMemberBills(memberId);
};

window.getMemberReceipts = async function(memberId) {
    return await firebaseServices.getMemberReceipts(memberId);
};

window.addSupplement = async function(supplementData) {
    return await firebaseServices.addSupplement(supplementData);
};

window.getSupplements = async function(category) {
    return await firebaseServices.getSupplements(category);
};

window.createDietPlan = async function(dietData) {
    return await firebaseServices.createDietPlan(dietData);
};

window.getMemberDietPlans = async function(memberId) {
    return await firebaseServices.getMemberDietPlans(memberId);
};

window.sendNotification = async function(notificationData) {
    return await firebaseServices.sendNotification(notificationData);
};

window.getMemberNotifications = async function(memberId, limit) {
    return await firebaseServices.getMemberNotifications(memberId, limit);
};

window.markNotificationAsRead = async function(notificationId) {
    return await firebaseServices.markNotificationAsRead(notificationId);
};

window.uploadProfileImage = async function(file, userId) {
    return await firebaseServices.uploadProfileImage(file, userId);
};

window.uploadReceiptPDF = async function(file, receiptId) {
    return await firebaseServices.uploadReceiptPDF(file, receiptId);
};

window.generateRevenueReport = async function(startDate, endDate) {
    return await firebaseServices.generateRevenueReport(startDate, endDate);
};

window.generateMembershipReport = async function() {
    return await firebaseServices.generateMembershipReport();
};

window.exportData = async function(collection, filters) {
    return await firebaseServices.exportData(collection, filters);
};

window.importData = async function(collection, data) {
    return await firebaseServices.importData(collection, data);
};

window.createBackup = async function() {
    return await firebaseServices.createBackup();
};

window.restoreFromBackup = async function(backup) {
    return await firebaseServices.restoreFromBackup(backup);
}; 