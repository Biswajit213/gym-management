// Logging System for Gym Management System
// This module provides comprehensive logging functionality for all system actions

class Logger {
    constructor() {
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        this.currentLogLevel = this.logLevels.INFO;
        this.maxLogEntries = 1000; // Maximum number of log entries to keep in memory
        this.logBuffer = [];
    }

    // Set log level
    setLogLevel(level) {
        if (this.logLevels.hasOwnProperty(level)) {
            this.currentLogLevel = this.logLevels[level];
            console.log(`Log level set to: ${level}`);
        }
    }

    // Format timestamp
    formatTimestamp() {
        return new Date().toISOString();
    }

    // Create log entry
    createLogEntry(level, action, userId, details = {}) {
        const logEntry = {
            id: this.generateId(),
            level: level,
            action: action,
            userId: userId || 'system',
            details: details,
            timestamp: this.formatTimestamp(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            sessionId: this.getSessionId()
        };

        return logEntry;
    }

    // Generate unique ID for log entries
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Get or create session ID
    getSessionId() {
        let sessionId = localStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }

    // Add log entry to buffer
    addToBuffer(logEntry) {
        this.logBuffer.push(logEntry);
        
        // Keep only the latest entries
        if (this.logBuffer.length > this.maxLogEntries) {
            this.logBuffer = this.logBuffer.slice(-this.maxLogEntries);
        }
    }

    // Log to console
    logToConsole(level, message, details = {}) {
        const timestamp = this.formatTimestamp();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        switch (level) {
            case 'ERROR':
                console.error(logMessage, details);
                break;
            case 'WARN':
                console.warn(logMessage, details);
                break;
            case 'INFO':
                console.info(logMessage, details);
                break;
            case 'DEBUG':
                console.debug(logMessage, details);
                break;
            default:
                console.log(logMessage, details);
        }
    }

    // Log to Firebase
    async logToFirebase(logEntry) {
        try {
            if (window.firebase && window.firebase.db) {
                await window.firebase.db.collection('logs').add(logEntry);
            }
        } catch (error) {
            console.error('Failed to log to Firebase:', error);
        }
    }

    // Main logging function
    async log(level, action, userId, details = {}) {
        // Check if we should log this level
        if (this.logLevels[level] > this.currentLogLevel) {
            return;
        }

        const logEntry = this.createLogEntry(level, action, userId, details);
        
        // Add to buffer
        this.addToBuffer(logEntry);
        
        // Log to console
        this.logToConsole(level, action, details);
        
        // Log to Firebase
        await this.logToFirebase(logEntry);
        
        return logEntry;
    }

    // Convenience methods for different log levels
    async error(action, userId, details = {}) {
        return await this.log('ERROR', action, userId, details);
    }

    async warn(action, userId, details = {}) {
        return await this.log('WARN', action, userId, details);
    }

    async info(action, userId, details = {}) {
        return await this.log('INFO', action, userId, details);
    }

    async debug(action, userId, details = {}) {
        return await this.log('DEBUG', action, userId, details);
    }

    // Get logs from buffer
    getLogs(limit = 100) {
        return this.logBuffer.slice(-limit);
    }

    // Clear log buffer
    clearBuffer() {
        this.logBuffer = [];
    }

    // Export logs
    exportLogs() {
        return JSON.stringify(this.logBuffer, null, 2);
    }

    // Download logs as file
    downloadLogs() {
        const logs = this.exportLogs();
        const blob = new Blob([logs], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gym-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Create global logger instance
const logger = new Logger();

// Global logging function for backward compatibility
window.logAction = async function(action, userId, details = {}) {
    return await logger.info(action, userId, details);
};

// Specific logging functions for different actions
window.logUserAction = async function(action, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info(action, userId, details);
};

window.logAdminAction = async function(action, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'admin';
    return await logger.info(`ADMIN_${action}`, userId, details);
};

window.logMemberAction = async function(action, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'member';
    return await logger.info(`MEMBER_${action}`, userId, details);
};

window.logSystemAction = async function(action, details = {}) {
    return await logger.info(`SYSTEM_${action}`, 'system', details);
};

window.logError = async function(action, error, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.error(action, userId, {
        error: error.message || error,
        stack: error.stack,
        ...details
    });
};

// Log page views
window.logPageView = async function(pageName) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info('PAGE_VIEW', userId, {
        page: pageName,
        referrer: document.referrer
    });
};

// Log form submissions
window.logFormSubmission = async function(formName, success = true, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info('FORM_SUBMISSION', userId, {
        form: formName,
        success: success,
        ...details
    });
};

// Log API calls
window.logApiCall = async function(endpoint, method, success = true, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info('API_CALL', userId, {
        endpoint: endpoint,
        method: method,
        success: success,
        ...details
    });
};

// Log file operations
window.logFileOperation = async function(operation, fileName, success = true, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info('FILE_OPERATION', userId, {
        operation: operation,
        fileName: fileName,
        success: success,
        ...details
    });
};

// Log payment operations
window.logPayment = async function(operation, amount, success = true, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info('PAYMENT', userId, {
        operation: operation,
        amount: amount,
        success: success,
        ...details
    });
};

// Log member operations
window.logMemberOperation = async function(operation, memberId, success = true, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info('MEMBER_OPERATION', userId, {
        operation: operation,
        memberId: memberId,
        success: success,
        ...details
    });
};

// Log notification operations
window.logNotification = async function(operation, notificationType, success = true, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info('NOTIFICATION', userId, {
        operation: operation,
        type: notificationType,
        success: success,
        ...details
    });
};

// Log report generation
window.logReportGeneration = async function(reportType, success = true, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info('REPORT_GENERATION', userId, {
        reportType: reportType,
        success: success,
        ...details
    });
};

// Log supplement store operations
window.logSupplementOperation = async function(operation, supplementId, success = true, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info('SUPPLEMENT_OPERATION', userId, {
        operation: operation,
        supplementId: supplementId,
        success: success,
        ...details
    });
};

// Log diet operations
window.logDietOperation = async function(operation, memberId, success = true, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info('DIET_OPERATION', userId, {
        operation: operation,
        memberId: memberId,
        success: success,
        ...details
    });
};

// Log search operations
window.logSearch = async function(searchTerm, resultsCount, details = {}) {
    const user = window.authUtils ? window.authUtils.getCurrentUser() : null;
    const userId = user ? user.uid : 'anonymous';
    return await logger.info('SEARCH', userId, {
        searchTerm: searchTerm,
        resultsCount: resultsCount,
        ...details
    });
};

// Export logger for use in other modules
window.logger = logger;

// Log system initialization
document.addEventListener('DOMContentLoaded', () => {
    logger.info('SYSTEM_INIT', 'system', {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
    });
});

// Log page unload
window.addEventListener('beforeunload', () => {
    logger.info('PAGE_UNLOAD', 'system', {
        url: window.location.href,
        timestamp: new Date().toISOString()
    });
});

// Log errors globally
window.addEventListener('error', (event) => {
    logger.error('GLOBAL_ERROR', 'system', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? event.error.stack : null
    });
});

// Log unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    logger.error('UNHANDLED_REJECTION', 'system', {
        reason: event.reason,
        promise: event.promise
    });
}); 