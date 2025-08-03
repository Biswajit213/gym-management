// Admin Module for Gym Management System
// Handles admin dashboard and admin-specific functionality

class AdminManager {
    constructor() {
        this.currentUser = null;
        this.dashboardData = {};
        this.init();
    }

    // Initialize admin functionality
    async init() {
        try {
            // Check authentication
            if (!window.authManager || !window.authManager.isAuthenticated) {
                window.location.href = '/admin/login.html';
                return;
            }

            // Check if user is admin
            if (!window.authManager.isAdmin()) {
                utils.domUtils.showAlert('Access denied. Admin privileges required.', 'error');
                window.location.href = '/';
                return;
            }

            this.currentUser = window.authManager.getCurrentUser();
            
            // Log admin page access
            await logAdminAction('ADMIN_PAGE_ACCESS', {
                page: window.location.pathname,
                timestamp: new Date().toISOString()
            });

            // Initialize dashboard
            await this.initDashboard();
            
            // Set up event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('Error initializing admin:', error);
            await logError('ADMIN_INIT_ERROR', error);
        }
    }

    // Initialize dashboard
    async initDashboard() {
        try {
            // Load dashboard data
            await this.loadDashboardData();
            
            // Update dashboard UI
            this.updateDashboardUI();
            
            // Initialize charts if on dashboard page
            if (window.location.pathname.includes('dashboard.html')) {
                this.initCharts();
            }

        } catch (error) {
            console.error('Error initializing dashboard:', error);
            await logError('DASHBOARD_INIT_ERROR', error);
        }
    }

    // Load dashboard data
    async loadDashboardData() {
        try {
            const db = window.firebase.db;
            
            // Get counts from different collections
            const [
                membersSnapshot,
                billsSnapshot,
                receiptsSnapshot,
                supplementsSnapshot
            ] = await Promise.all([
                db.collection('members').get(),
                db.collection('bills').get(),
                db.collection('receipts').get(),
                db.collection('supplements').get()
            ]);

            // Calculate statistics
            const totalMembers = membersSnapshot.size;
            const totalBills = billsSnapshot.size;
            const totalReceipts = receiptsSnapshot.size;
            const totalSupplements = supplementsSnapshot.size;

            // Calculate revenue
            let totalRevenue = 0;
            receiptsSnapshot.forEach(doc => {
                const receipt = doc.data();
                totalRevenue += receipt.amount || 0;
            });

            // Get recent activities
            const recentActivities = await this.getRecentActivities();

            // Get monthly revenue data
            const monthlyRevenue = await this.getMonthlyRevenue();

            this.dashboardData = {
                totalMembers,
                totalBills,
                totalReceipts,
                totalSupplements,
                totalRevenue,
                recentActivities,
                monthlyRevenue
            };

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            await logError('DASHBOARD_DATA_LOAD_ERROR', error);
            
            // Set default data
            this.dashboardData = {
                totalMembers: 0,
                totalBills: 0,
                totalReceipts: 0,
                totalSupplements: 0,
                totalRevenue: 0,
                recentActivities: [],
                monthlyRevenue: []
            };
        }
    }

    // Get recent activities
    async getRecentActivities() {
        try {
            const db = window.firebase.db;
            const logsSnapshot = await db.collection('logs')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            const activities = [];
            logsSnapshot.forEach(doc => {
                const log = doc.data();
                activities.push({
                    id: doc.id,
                    action: log.action,
                    userId: log.userId,
                    details: log.details,
                    timestamp: log.timestamp
                });
            });

            return activities;
        } catch (error) {
            console.error('Error getting recent activities:', error);
            return [];
        }
    }

    // Get monthly revenue data
    async getMonthlyRevenue() {
        try {
            const db = window.firebase.db;
            const currentYear = new Date().getFullYear();
            const monthlyData = [];

            for (let month = 1; month <= 12; month++) {
                const startDate = new Date(currentYear, month - 1, 1);
                const endDate = new Date(currentYear, month, 0);

                const receiptsSnapshot = await db.collection('receipts')
                    .where('paymentDate', '>=', startDate)
                    .where('paymentDate', '<=', endDate)
                    .get();

                let monthlyRevenue = 0;
                receiptsSnapshot.forEach(doc => {
                    const receipt = doc.data();
                    monthlyRevenue += receipt.amount || 0;
                });

                monthlyData.push({
                    month: month,
                    revenue: monthlyRevenue
                });
            }

            return monthlyData;
        } catch (error) {
            console.error('Error getting monthly revenue:', error);
            return [];
        }
    }

    // Update dashboard UI
    updateDashboardUI() {
        // Update statistics cards
        this.updateStatsCards();
        
        // Update recent activities
        this.updateRecentActivities();
        
        // Update revenue chart
        this.updateRevenueChart();
    }

    // Update statistics cards
    updateStatsCards() {
        const data = this.dashboardData;
        
        // Update member count
        const memberCard = document.getElementById('memberCount');
        if (memberCard) {
            memberCard.textContent = data.totalMembers;
        }

        // Update bill count
        const billCard = document.getElementById('billCount');
        if (billCard) {
            billCard.textContent = data.totalBills;
        }

        // Update receipt count
        const receiptCard = document.getElementById('receiptCount');
        if (receiptCard) {
            receiptCard.textContent = data.totalReceipts;
        }

        // Update supplement count
        const supplementCard = document.getElementById('supplementCount');
        if (supplementCard) {
            supplementCard.textContent = data.totalSupplements;
        }

        // Update revenue
        const revenueCard = document.getElementById('totalRevenue');
        if (revenueCard) {
            revenueCard.textContent = utils.formatters.formatCurrency(data.totalRevenue);
        }
    }

    // Update recent activities
    updateRecentActivities() {
        const activitiesContainer = document.getElementById('recentActivities');
        if (!activitiesContainer) return;

        const activities = this.dashboardData.recentActivities;
        
        if (activities.length === 0) {
            activitiesContainer.innerHTML = '<p class="text-center text-muted">No recent activities</p>';
            return;
        }

        const activitiesHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${this.getActivityIcon(activity.action)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${this.formatActivityTitle(activity.action)}</div>
                    <div class="activity-time">${utils.formatters.formatDate(activity.timestamp, 'time')}</div>
                </div>
            </div>
        `).join('');

        activitiesContainer.innerHTML = activitiesHTML;
    }

    // Get activity icon
    getActivityIcon(action) {
        const iconMap = {
            'AUTH_LOGIN': 'fa-sign-in-alt',
            'AUTH_LOGOUT': 'fa-sign-out-alt',
            'MEMBER_CREATED': 'fa-user-plus',
            'MEMBER_UPDATED': 'fa-user-edit',
            'MEMBER_DELETED': 'fa-user-minus',
            'BILL_CREATED': 'fa-file-invoice',
            'PAYMENT_RECEIVED': 'fa-credit-card',
            'NOTIFICATION_SENT': 'fa-bell',
            'REPORT_GENERATED': 'fa-chart-bar',
            'SUPPLEMENT_ADDED': 'fa-pills',
            'DIET_CREATED': 'fa-apple-alt'
        };
        
        return iconMap[action] || 'fa-info-circle';
    }

    // Format activity title
    formatActivityTitle(action) {
        const titleMap = {
            'AUTH_LOGIN': 'User logged in',
            'AUTH_LOGOUT': 'User logged out',
            'MEMBER_CREATED': 'New member added',
            'MEMBER_UPDATED': 'Member updated',
            'MEMBER_DELETED': 'Member removed',
            'BILL_CREATED': 'New bill created',
            'PAYMENT_RECEIVED': 'Payment received',
            'NOTIFICATION_SENT': 'Notification sent',
            'REPORT_GENERATED': 'Report generated',
            'SUPPLEMENT_ADDED': 'Supplement added',
            'DIET_CREATED': 'Diet plan created'
        };
        
        return titleMap[action] || 'Activity performed';
    }

    // Update revenue chart
    updateRevenueChart() {
        const chartContainer = document.getElementById('revenueChart');
        if (!chartContainer) return;

        const monthlyData = this.dashboardData.monthlyRevenue;
        
        // Create simple chart using CSS
        const chartHTML = `
            <div class="chart-container">
                <div class="chart-bars">
                    ${monthlyData.map(data => `
                        <div class="chart-bar" style="height: ${(data.revenue / Math.max(...monthlyData.map(d => d.revenue))) * 100}%">
                            <div class="bar-tooltip">${utils.formatters.formatCurrency(data.revenue)}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="chart-labels">
                    ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => `
                        <div class="chart-label">${month}</div>
                    `).join('')}
                </div>
            </div>
        `;

        chartContainer.innerHTML = chartHTML;
    }

    // Initialize charts
    initCharts() {
        // This would integrate with a charting library like Chart.js
        // For now, we're using CSS-based charts
        console.log('Charts initialized');
    }

    // Setup event listeners
    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }

        // User menu
        const userMenu = document.querySelector('.admin-user');
        if (userMenu) {
            userMenu.addEventListener('click', () => {
                this.toggleUserMenu();
            });
        }

        // Mobile menu
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
    }

    // Toggle sidebar
    toggleSidebar() {
        const sidebar = document.querySelector('.admin-sidebar');
        const main = document.querySelector('.admin-main');
        
        if (sidebar && main) {
            sidebar.classList.toggle('collapsed');
            main.classList.toggle('expanded');
        }
    }

    // Toggle mobile menu
    toggleMobileMenu() {
        const sidebar = document.querySelector('.admin-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('mobile-open');
        }
    }

    // Toggle user menu
    toggleUserMenu() {
        const userMenu = document.querySelector('.user-menu');
        if (userMenu) {
            userMenu.classList.toggle('show');
        }
    }

    // Handle logout
    async handleLogout() {
        try {
            utils.domUtils.showConfirm(
                'Are you sure you want to logout?',
                async () => {
                    await window.authManager.logout();
                }
            );
        } catch (error) {
            console.error('Error during logout:', error);
            await logError('LOGOUT_ERROR', error);
        }
    }

    // Export dashboard data
    async exportDashboardData() {
        try {
            const data = {
                exportDate: new Date().toISOString(),
                dashboardData: this.dashboardData,
                generatedBy: this.currentUser.email
            };

            const filename = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
            utils.domUtils.downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');

            await logAdminAction('DASHBOARD_EXPORTED', {
                filename: filename
            });

            utils.domUtils.showAlert('Dashboard data exported successfully!', 'success');

        } catch (error) {
            console.error('Error exporting dashboard data:', error);
            await logError('DASHBOARD_EXPORT_ERROR', error);
            utils.domUtils.showAlert('Error exporting dashboard data', 'error');
        }
    }

    // Refresh dashboard
    async refreshDashboard() {
        try {
            utils.domUtils.showLoading(document.querySelector('.refresh-btn'));
            
            await this.loadDashboardData();
            this.updateDashboardUI();
            
            utils.domUtils.showAlert('Dashboard refreshed successfully!', 'success');

        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            await logError('DASHBOARD_REFRESH_ERROR', error);
            utils.domUtils.showAlert('Error refreshing dashboard', 'error');
        } finally {
            utils.domUtils.hideLoading(document.querySelector('.refresh-btn'));
        }
    }
}

// Create global admin manager instance
const adminManager = new AdminManager();

// Global functions for admin functionality
window.exportDashboard = async function() {
    return await adminManager.exportDashboardData();
};

window.refreshDashboard = async function() {
    return await adminManager.refreshDashboard();
};

// Add CSS for admin dashboard components
const adminStyles = document.createElement('style');
adminStyles.textContent = `
    .activity-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid var(--border-color);
    }

    .activity-item:last-child {
        border-bottom: none;
    }

    .activity-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: var(--primary-color);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
    }

    .activity-content {
        flex: 1;
    }

    .activity-title {
        font-weight: 600;
        color: var(--light-text);
        margin-bottom: 4px;
    }

    .activity-time {
        font-size: 12px;
        color: var(--light-text-secondary);
    }

    .chart-container {
        height: 200px;
        display: flex;
        align-items: end;
        gap: 8px;
        padding: 20px 0;
    }

    .chart-bars {
        display: flex;
        align-items: end;
        gap: 8px;
        flex: 1;
        height: 100%;
    }

    .chart-bar {
        flex: 1;
        background: linear-gradient(to top, var(--primary-color), var(--secondary-color));
        border-radius: 4px 4px 0 0;
        position: relative;
        min-height: 4px;
        transition: var(--transition);
    }

    .chart-bar:hover {
        opacity: 0.8;
    }

    .bar-tooltip {
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--dark-bg);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transition: var(--transition);
        pointer-events: none;
    }

    .chart-bar:hover .bar-tooltip {
        opacity: 1;
    }

    .chart-labels {
        display: flex;
        gap: 8px;
        margin-top: 10px;
    }

    .chart-label {
        flex: 1;
        text-align: center;
        font-size: 12px;
        color: var(--light-text-secondary);
    }

    .user-menu {
        position: absolute;
        top: 100%;
        right: 0;
        background-color: white;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        min-width: 200px;
        z-index: 1000;
        display: none;
    }

    .user-menu.show {
        display: block;
    }

    .user-menu-item {
        padding: 12px 16px;
        color: var(--light-text);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: var(--transition);
    }

    .user-menu-item:hover {
        background-color: var(--light-surface);
    }

    .user-menu-item.logout {
        color: var(--danger-color);
        border-top: 1px solid var(--border-color);
    }

    .mobile-menu-btn {
        display: none;
        background: none;
        border: none;
        font-size: 20px;
        color: var(--light-text);
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
    }

    @media (max-width: 768px) {
        .mobile-menu-btn {
            display: block;
        }
        
        .chart-container {
            height: 150px;
        }
        
        .chart-labels {
            font-size: 10px;
        }
    }
`;

document.head.appendChild(adminStyles);

// Export admin manager for use in other modules
window.adminManager = adminManager; 