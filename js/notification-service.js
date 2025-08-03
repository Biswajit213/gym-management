// Notification Service for Gym Management System
// Handles real-time notifications, email notifications, and notification management

class NotificationService {
    constructor() {
        this.db = window.firebase.db;
        this.collections = window.firebase.collections;
        this.auth = window.firebase.auth;
        
        // Notification types
        this.notificationTypes = {
            BILL_CREATED: 'bill_created',
            PAYMENT_CONFIRMED: 'payment_confirmed',
            MEMBERSHIP_EXPIRING: 'membership_expiring',
            MEMBERSHIP_EXPIRED: 'membership_expired',
            WELCOME: 'welcome',
            SYSTEM_UPDATE: 'system_update',
            PROMOTION: 'promotion',
            REMINDER: 'reminder'
        };
        
        // Notification priorities
        this.priorities = {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            URGENT: 'urgent'
        };
        
        // Initialize notification service
        this.init();
    }

    // Initialize notification service
    async init() {
        try {
            console.log('Notification Service initialized');
            
            // Set up real-time notification listeners
            this.setupNotificationListeners();
            
            // Set up notification badges
            this.setupNotificationBadges();
            
        } catch (error) {
            console.error('Error initializing Notification Service:', error);
            await logError('NOTIFICATION_SERVICE_INIT_ERROR', error);
        }
    }

    // Setup notification listeners
    setupNotificationListeners() {
        // Listen for new notifications
        this.db.collection(this.collections.NOTIFICATIONS)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.handleNewNotification(change.doc.data());
                    }
                });
            });
    }

    // Setup notification badges
    setupNotificationBadges() {
        // Update notification badge count
        this.updateNotificationBadge();
        
        // Update badge every 30 seconds
        setInterval(() => {
            this.updateNotificationBadge();
        }, 30000);
    }

    // Handle new notification
    async handleNewNotification(notification) {
        try {
            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
                this.showBrowserNotification(notification);
            }
            
            // Update notification badge
            this.updateNotificationBadge();
            
            // Play notification sound
            this.playNotificationSound();
            
        } catch (error) {
            console.error('Error handling new notification:', error);
            await logError('NEW_NOTIFICATION_HANDLER_ERROR', error);
        }
    }

    // Show browser notification
    showBrowserNotification(notification) {
        try {
            const browserNotification = new Notification(notification.title, {
                body: notification.message,
                icon: '/images/notification-icon.png',
                badge: '/images/badge-icon.png',
                tag: notification.id,
                requireInteraction: notification.priority === this.priorities.URGENT
            });

            // Handle notification click
            browserNotification.onclick = () => {
                this.handleNotificationClick(notification);
                browserNotification.close();
            };

            // Auto close after 5 seconds (except for urgent notifications)
            if (notification.priority !== this.priorities.URGENT) {
                setTimeout(() => {
                    browserNotification.close();
                }, 5000);
            }

        } catch (error) {
            console.error('Error showing browser notification:', error);
        }
    }

    // Handle notification click
    handleNotificationClick(notification) {
        try {
            // Mark notification as read
            this.markNotificationAsRead(notification.id);
            
            // Navigate based on notification type
            switch (notification.type) {
                case this.notificationTypes.BILL_CREATED:
                    window.location.href = '/member/bills.html';
                    break;
                case this.notificationTypes.PAYMENT_CONFIRMED:
                    window.location.href = '/member/receipts.html';
                    break;
                case this.notificationTypes.MEMBERSHIP_EXPIRING:
                    window.location.href = '/member/membership.html';
                    break;
                default:
                    window.location.href = '/member/notifications.html';
            }

        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    }

    // Play notification sound
    playNotificationSound() {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(error => {
                console.log('Could not play notification sound:', error);
            });
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }

    // Update notification badge
    async updateNotificationBadge() {
        try {
            const currentUser = window.authManager?.getCurrentUser();
            if (!currentUser) return;

            const unreadCount = await this.getUnreadNotificationCount(currentUser.uid);
            
            // Update badge in UI
            this.updateBadgeUI(unreadCount);
            
        } catch (error) {
            console.error('Error updating notification badge:', error);
        }
    }

    // Update badge UI
    updateBadgeUI(count) {
        const badgeElements = document.querySelectorAll('.notification-badge');
        
        badgeElements.forEach(badge => {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        });
    }

    // ==================== NOTIFICATION MANAGEMENT ====================

    // Send notification
    async sendNotification(notificationData) {
        try {
            const notificationId = utils.formatters.generateRandomString(8);
            
            const notification = {
                id: notificationId,
                memberId: notificationData.memberId,
                type: notificationData.type,
                title: notificationData.title,
                message: notificationData.message,
                priority: notificationData.priority || this.priorities.MEDIUM,
                status: 'unread',
                data: notificationData.data || {},
                createdAt: new Date(),
                readAt: null
            };

            await this.db.collection(this.collections.NOTIFICATIONS).doc(notificationId).set(notification);

            await logNotification('NOTIFICATION_SENT', notification.type, true, notification);

            return notificationId;

        } catch (error) {
            console.error('Error sending notification:', error);
            await logError('NOTIFICATION_SEND_ERROR', error);
            throw error;
        }
    }

    // Send bulk notifications
    async sendBulkNotifications(notifications) {
        try {
            const batch = this.db.batch();
            const notificationIds = [];

            for (const notificationData of notifications) {
                const notificationId = utils.formatters.generateRandomString(8);
                const notification = {
                    id: notificationId,
                    memberId: notificationData.memberId,
                    type: notificationData.type,
                    title: notificationData.title,
                    message: notificationData.message,
                    priority: notificationData.priority || this.priorities.MEDIUM,
                    status: 'unread',
                    data: notificationData.data || {},
                    createdAt: new Date(),
                    readAt: null
                };

                const docRef = this.db.collection(this.collections.NOTIFICATIONS).doc(notificationId);
                batch.set(docRef, notification);
                notificationIds.push(notificationId);
            }

            await batch.commit();

            await logNotification('BULK_NOTIFICATIONS_SENT', 'bulk', true, {
                count: notifications.length,
                notificationIds: notificationIds
            });

            return notificationIds;

        } catch (error) {
            console.error('Error sending bulk notifications:', error);
            await logError('BULK_NOTIFICATIONS_SEND_ERROR', error);
            throw error;
        }
    }

    // Get member notifications
    async getMemberNotifications(memberId, limit = 20, status = null) {
        try {
            let query = this.db.collection(this.collections.NOTIFICATIONS)
                .where('memberId', '==', memberId);

            if (status) {
                query = query.where('status', '==', status);
            }

            const snapshot = await query
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const notifications = [];
            snapshot.forEach(doc => {
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

            await logNotification('NOTIFICATION_MARKED_READ', 'read', true, {
                notificationId: notificationId
            });

        } catch (error) {
            console.error('Error marking notification as read:', error);
            await logError('NOTIFICATION_MARK_READ_ERROR', error);
            throw error;
        }
    }

    // Mark all notifications as read
    async markAllNotificationsAsRead(memberId) {
        try {
            const notificationsSnapshot = await this.db.collection(this.collections.NOTIFICATIONS)
                .where('memberId', '==', memberId)
                .where('status', '==', 'unread')
                .get();

            const batch = this.db.batch();

            notificationsSnapshot.forEach(doc => {
                batch.update(doc.ref, {
                    status: 'read',
                    readAt: new Date()
                });
            });

            await batch.commit();

            await logNotification('ALL_NOTIFICATIONS_MARKED_READ', 'bulk_read', true, {
                memberId: memberId,
                count: notificationsSnapshot.size
            });

        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            await logError('ALL_NOTIFICATIONS_MARK_READ_ERROR', error);
            throw error;
        }
    }

    // Delete notification
    async deleteNotification(notificationId) {
        try {
            await this.db.collection(this.collections.NOTIFICATIONS).doc(notificationId).delete();

            await logNotification('NOTIFICATION_DELETED', 'delete', true, {
                notificationId: notificationId
            });

        } catch (error) {
            console.error('Error deleting notification:', error);
            await logError('NOTIFICATION_DELETE_ERROR', error);
            throw error;
        }
    }

    // Get unread notification count
    async getUnreadNotificationCount(memberId) {
        try {
            const snapshot = await this.db.collection(this.collections.NOTIFICATIONS)
                .where('memberId', '==', memberId)
                .where('status', '==', 'unread')
                .get();

            return snapshot.size;

        } catch (error) {
            console.error('Error getting unread notification count:', error);
            await logError('UNREAD_NOTIFICATION_COUNT_ERROR', error);
            return 0;
        }
    }

    // ==================== EMAIL NOTIFICATIONS ====================

    // Send email notification
    async sendEmailNotification(notificationData) {
        try {
            // This would integrate with an email service like SendGrid, Mailgun, etc.
            // For now, we'll simulate email sending
            
            const emailData = {
                to: notificationData.email,
                subject: notificationData.title,
                body: notificationData.message,
                template: notificationData.template || 'default',
                data: notificationData.data || {}
            };

            // Simulate email sending
            await this.simulateEmailSending(emailData);

            await logNotification('EMAIL_NOTIFICATION_SENT', 'email', true, emailData);

            return true;

        } catch (error) {
            console.error('Error sending email notification:', error);
            await logError('EMAIL_NOTIFICATION_SEND_ERROR', error);
            throw error;
        }
    }

    // Simulate email sending
    async simulateEmailSending(emailData) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Email notification sent:', emailData);
        
        // In a real application, this would send to your email service
        // Example with SendGrid:
        // const sgMail = require('@sendgrid/mail');
        // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        // await sgMail.send(emailData);
    }

    // Send welcome email
    async sendWelcomeEmail(memberData) {
        try {
            const emailData = {
                email: memberData.email,
                title: 'Welcome to GymPro!',
                message: `Welcome ${memberData.name}! Thank you for joining GymPro. We're excited to help you achieve your fitness goals.`,
                template: 'welcome',
                data: {
                    memberName: memberData.name,
                    joinDate: new Date().toLocaleDateString(),
                    membershipType: memberData.membershipType
                }
            };

            await this.sendEmailNotification(emailData);

        } catch (error) {
            console.error('Error sending welcome email:', error);
            await logError('WELCOME_EMAIL_ERROR', error);
        }
    }

    // Send membership expiry reminder
    async sendMembershipExpiryReminder(memberData, daysUntilExpiry) {
        try {
            const emailData = {
                email: memberData.email,
                title: 'Membership Expiring Soon',
                message: `Your membership will expire in ${daysUntilExpiry} days. Please renew to continue enjoying our services.`,
                template: 'membership_expiry',
                data: {
                    memberName: memberData.name,
                    daysUntilExpiry: daysUntilExpiry,
                    expiryDate: memberData.membershipEndDate
                }
            };

            await this.sendEmailNotification(emailData);

        } catch (error) {
            console.error('Error sending membership expiry reminder:', error);
            await logError('MEMBERSHIP_EXPIRY_EMAIL_ERROR', error);
        }
    }

    // ==================== SYSTEM NOTIFICATIONS ====================

    // Send system notification to all members
    async sendSystemNotificationToAll(title, message, priority = this.priorities.MEDIUM) {
        try {
            // Get all active members
            const membersSnapshot = await this.db.collection(this.collections.MEMBERS)
                .where('status', '==', 'active')
                .get();

            const notifications = [];

            membersSnapshot.forEach(doc => {
                const member = doc.data();
                notifications.push({
                    memberId: member.id,
                    type: this.notificationTypes.SYSTEM_UPDATE,
                    title: title,
                    message: message,
                    priority: priority,
                    data: {
                        systemUpdate: true
                    }
                });
            });

            await this.sendBulkNotifications(notifications);

        } catch (error) {
            console.error('Error sending system notification to all:', error);
            await logError('SYSTEM_NOTIFICATION_ALL_ERROR', error);
            throw error;
        }
    }

    // Send promotion notification
    async sendPromotionNotification(memberIds, promotionData) {
        try {
            const notifications = memberIds.map(memberId => ({
                memberId: memberId,
                type: this.notificationTypes.PROMOTION,
                title: promotionData.title,
                message: promotionData.message,
                priority: this.priorities.MEDIUM,
                data: {
                    promotionId: promotionData.id,
                    discount: promotionData.discount,
                    validUntil: promotionData.validUntil
                }
            }));

            await this.sendBulkNotifications(notifications);

        } catch (error) {
            console.error('Error sending promotion notification:', error);
            await logError('PROMOTION_NOTIFICATION_ERROR', error);
            throw error;
        }
    }

    // ==================== NOTIFICATION TEMPLATES ====================

    // Get notification template
    getNotificationTemplate(type, data = {}) {
        const templates = {
            [this.notificationTypes.BILL_CREATED]: {
                title: 'New Bill Generated',
                message: `A new bill of $${data.amount} has been generated for ${data.description}`,
                priority: this.priorities.MEDIUM
            },
            [this.notificationTypes.PAYMENT_CONFIRMED]: {
                title: 'Payment Confirmed',
                message: `Your payment of $${data.amount} has been processed successfully`,
                priority: this.priorities.MEDIUM
            },
            [this.notificationTypes.MEMBERSHIP_EXPIRING]: {
                title: 'Membership Expiring Soon',
                message: `Your membership will expire in ${data.daysUntilExpiry} days. Please renew to continue.`,
                priority: this.priorities.HIGH
            },
            [this.notificationTypes.MEMBERSHIP_EXPIRED]: {
                title: 'Membership Expired',
                message: 'Your membership has expired. Please renew to continue using our services.',
                priority: this.priorities.URGENT
            },
            [this.notificationTypes.WELCOME]: {
                title: 'Welcome to GymPro!',
                message: `Welcome ${data.memberName}! Thank you for joining GymPro.`,
                priority: this.priorities.MEDIUM
            },
            [this.notificationTypes.SYSTEM_UPDATE]: {
                title: 'System Update',
                message: data.message || 'A system update has been completed.',
                priority: this.priorities.LOW
            },
            [this.notificationTypes.PROMOTION]: {
                title: data.title || 'Special Offer',
                message: data.message || 'Check out our latest promotion!',
                priority: this.priorities.MEDIUM
            },
            [this.notificationTypes.REMINDER]: {
                title: 'Reminder',
                message: data.message || 'This is a friendly reminder.',
                priority: this.priorities.LOW
            }
        };

        return templates[type] || {
            title: 'Notification',
            message: 'You have a new notification.',
            priority: this.priorities.MEDIUM
        };
    }

    // ==================== NOTIFICATION PERMISSIONS ====================

    // Request notification permission
    async requestNotificationPermission() {
        try {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                
                if (permission === 'granted') {
                    console.log('Notification permission granted');
                    return true;
                } else {
                    console.log('Notification permission denied');
                    return false;
                }
            }
            
            return Notification.permission === 'granted';

        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    // Check notification permission
    checkNotificationPermission() {
        return Notification.permission === 'granted';
    }

    // ==================== NOTIFICATION SETTINGS ====================

    // Get notification settings
    async getNotificationSettings(memberId) {
        try {
            const settingsDoc = await this.db.collection('notification_settings').doc(memberId).get();
            
            if (settingsDoc.exists) {
                return settingsDoc.data();
            } else {
                // Return default settings
                return {
                    emailNotifications: true,
                    pushNotifications: true,
                    smsNotifications: false,
                    billReminders: true,
                    membershipReminders: true,
                    promotionalNotifications: true,
                    systemUpdates: true
                };
            }

        } catch (error) {
            console.error('Error getting notification settings:', error);
            await logError('NOTIFICATION_SETTINGS_GET_ERROR', error);
            throw error;
        }
    }

    // Update notification settings
    async updateNotificationSettings(memberId, settings) {
        try {
            await this.db.collection('notification_settings').doc(memberId).set({
                ...settings,
                updatedAt: new Date()
            });

            await logNotification('NOTIFICATION_SETTINGS_UPDATED', 'settings', true, {
                memberId: memberId,
                settings: settings
            });

        } catch (error) {
            console.error('Error updating notification settings:', error);
            await logError('NOTIFICATION_SETTINGS_UPDATE_ERROR', error);
            throw error;
        }
    }
}

// Create global notification service instance
const notificationService = new NotificationService();

// Export for use in other modules
window.notificationService = notificationService;

// Export individual notification functions for backward compatibility
window.sendNotification = async function(notificationData) {
    return await notificationService.sendNotification(notificationData);
};

window.sendBulkNotifications = async function(notifications) {
    return await notificationService.sendBulkNotifications(notifications);
};

window.getMemberNotifications = async function(memberId, limit, status) {
    return await notificationService.getMemberNotifications(memberId, limit, status);
};

window.markNotificationAsRead = async function(notificationId) {
    return await notificationService.markNotificationAsRead(notificationId);
};

window.markAllNotificationsAsRead = async function(memberId) {
    return await notificationService.markAllNotificationsAsRead(memberId);
};

window.deleteNotification = async function(notificationId) {
    return await notificationService.deleteNotification(notificationId);
};

window.getUnreadNotificationCount = async function(memberId) {
    return await notificationService.getUnreadNotificationCount(memberId);
};

window.sendEmailNotification = async function(notificationData) {
    return await notificationService.sendEmailNotification(notificationData);
};

window.sendWelcomeEmail = async function(memberData) {
    return await notificationService.sendWelcomeEmail(memberData);
};

window.sendMembershipExpiryReminder = async function(memberData, daysUntilExpiry) {
    return await notificationService.sendMembershipExpiryReminder(memberData, daysUntilExpiry);
};

window.sendSystemNotificationToAll = async function(title, message, priority) {
    return await notificationService.sendSystemNotificationToAll(title, message, priority);
};

window.sendPromotionNotification = async function(memberIds, promotionData) {
    return await notificationService.sendPromotionNotification(memberIds, promotionData);
};

window.requestNotificationPermission = async function() {
    return await notificationService.requestNotificationPermission();
};

window.checkNotificationPermission = function() {
    return notificationService.checkNotificationPermission();
};

window.getNotificationSettings = async function(memberId) {
    return await notificationService.getNotificationSettings(memberId);
};

window.updateNotificationSettings = async function(memberId, settings) {
    return await notificationService.updateNotificationSettings(memberId, settings);
}; 