// Utility Functions for Gym Management System
// This module provides common utility functions used throughout the application

// Form validation utilities
const validators = {
    // Email validation
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Phone validation (basic)
    isValidPhone: (phone) => {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    },

    // Password validation (minimum 6 characters)
    isValidPassword: (password) => {
        return password && password.length >= 6;
    },

    // Name validation (letters and spaces only)
    isValidName: (name) => {
        const nameRegex = /^[a-zA-Z\s]+$/;
        return nameRegex.test(name) && name.length >= 2;
    },

    // Number validation
    isValidNumber: (number) => {
        return !isNaN(number) && number >= 0;
    },

    // Date validation
    isValidDate: (date) => {
        const dateObj = new Date(date);
        return dateObj instanceof Date && !isNaN(dateObj);
    },

    // Required field validation
    isRequired: (value) => {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    }
};

// Data formatting utilities
const formatters = {
    // Format currency
    formatCurrency: (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    // Format date
    formatDate: (date, format = 'short') => {
        const dateObj = new Date(date);
        const options = {
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
            time: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        };
        return dateObj.toLocaleDateString('en-US', options[format] || options.short);
    },

    // Format phone number
    formatPhone: (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return '(' + match[1] + ') ' + match[2] + '-' + match[3];
        }
        return phone;
    },

    // Format file size
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Format duration (seconds to HH:MM:SS)
    formatDuration: (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    // Capitalize first letter
    capitalize: (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // Generate random string
    generateRandomString: (length = 8) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // Generate receipt number
    generateReceiptNumber: () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `RCP-${year}${month}${day}-${random}`;
    },

    // Generate member ID
    generateMemberId: () => {
        const date = new Date();
        const year = date.getFullYear();
        const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        return `MEM-${year}-${random}`;
    }
};

// DOM utilities
const domUtils = {
    // Show loading spinner
    showLoading: (element) => {
        if (element) {
            element.classList.add('loading');
            element.disabled = true;
        }
    },

    // Hide loading spinner
    hideLoading: (element) => {
        if (element) {
            element.classList.remove('loading');
            element.disabled = false;
        }
    },

    // Show alert message
    showAlert: (message, type = 'info', duration = 5000) => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.className = 'alert-close';
        closeBtn.onclick = () => alertDiv.remove();
        alertDiv.appendChild(closeBtn);
        
        // Insert at top of body
        document.body.insertBefore(alertDiv, document.body.firstChild);
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, duration);
        }
    },

    // Show confirmation dialog
    showConfirm: (message, onConfirm, onCancel) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Confirm Action</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button class="btn btn-danger" id="confirmBtn">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#confirmBtn').onclick = () => {
            modal.remove();
            if (onConfirm) onConfirm();
        };
        
        modal.querySelector('#cancelBtn').onclick = () => {
            modal.remove();
            if (onCancel) onCancel();
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                if (onCancel) onCancel();
            }
        };
    },

    // Create table from data
    createTable: (data, columns, options = {}) => {
        const table = document.createElement('table');
        table.className = options.className || 'table';
        
        // Create header
        if (columns && columns.length > 0) {
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            columns.forEach(column => {
                const th = document.createElement('th');
                th.textContent = column.title || column.key;
                if (column.className) th.className = column.className;
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
        }
        
        // Create body
        const tbody = document.createElement('tbody');
        
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            columns.forEach(column => {
                const td = document.createElement('td');
                const value = row[column.key];
                
                if (column.formatter) {
                    td.innerHTML = column.formatter(value, row);
                } else {
                    td.textContent = value || '';
                }
                
                if (column.className) td.className = column.className;
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        return table;
    },

    // Download file
    downloadFile: (content, filename, type = 'text/plain') => {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Export table to CSV
    exportTableToCSV: (table, filename = 'export.csv') => {
        const rows = table.querySelectorAll('tr');
        let csv = [];
        
        rows.forEach(row => {
            const cols = row.querySelectorAll('td, th');
            const rowData = [];
            
            cols.forEach(col => {
                rowData.push(`"${col.textContent.replace(/"/g, '""')}"`);
            });
            
            csv.push(rowData.join(','));
        });
        
        const csvContent = csv.join('\n');
        domUtils.downloadFile(csvContent, filename, 'text/csv');
    }
};

// Storage utilities
const storageUtils = {
    // Set item with expiration
    setItem: (key, value, expirationHours = 24) => {
        const item = {
            value: value,
            timestamp: new Date().getTime(),
            expirationHours: expirationHours
        };
        localStorage.setItem(key, JSON.stringify(item));
    },

    // Get item with expiration check
    getItem: (key) => {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        try {
            const parsed = JSON.parse(item);
            const now = new Date().getTime();
            const expirationTime = parsed.timestamp + (parsed.expirationHours * 60 * 60 * 1000);
            
            if (now > expirationTime) {
                localStorage.removeItem(key);
                return null;
            }
            
            return parsed.value;
        } catch (error) {
            console.error('Error parsing localStorage item:', error);
            return null;
        }
    },

    // Remove item
    removeItem: (key) => {
        localStorage.removeItem(key);
    },

    // Clear all items
    clear: () => {
        localStorage.clear();
    }
};

// Date utilities
const dateUtils = {
    // Get current date in YYYY-MM-DD format
    getCurrentDate: () => {
        return new Date().toISOString().split('T')[0];
    },

    // Get current datetime
    getCurrentDateTime: () => {
        return new Date().toISOString();
    },

    // Add days to date
    addDays: (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    // Get days between two dates
    getDaysBetween: (date1, date2) => {
        const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        return Math.round(Math.abs((date1 - date2) / oneDay));
    },

    // Check if date is today
    isToday: (date) => {
        const today = new Date();
        const checkDate = new Date(date);
        return today.toDateString() === checkDate.toDateString();
    },

    // Check if date is in the past
    isPast: (date) => {
        return new Date(date) < new Date();
    },

    // Check if date is in the future
    isFuture: (date) => {
        return new Date(date) > new Date();
    }
};

// Array utilities
const arrayUtils = {
    // Group array by key
    groupBy: (array, key) => {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },

    // Sort array by key
    sortBy: (array, key, order = 'asc') => {
        return array.sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];
            
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (order === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });
    },

    // Filter array by multiple criteria
    filterBy: (array, filters) => {
        return array.filter(item => {
            return Object.keys(filters).every(key => {
                const filterValue = filters[key];
                const itemValue = item[key];
                
                if (typeof filterValue === 'string') {
                    return itemValue.toLowerCase().includes(filterValue.toLowerCase());
                }
                
                return itemValue === filterValue;
            });
        });
    },

    // Remove duplicates from array
    removeDuplicates: (array, key) => {
        const seen = new Set();
        return array.filter(item => {
            const value = key ? item[key] : item;
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }
};

// Export all utilities
window.utils = {
    validators,
    formatters,
    domUtils,
    storageUtils,
    dateUtils,
    arrayUtils
};

// Add CSS for modal and alerts
const style = document.createElement('style');
style.textContent = `
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    }
    
    .modal {
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    
    .modal-header {
        margin-bottom: 15px;
    }
    
    .modal-body {
        margin-bottom: 20px;
    }
    
    .modal-footer {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }
    
    .alert {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        z-index: 10001;
        max-width: 400px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .alert-success {
        background-color: var(--success-color);
    }
    
    .alert-error {
        background-color: var(--danger-color);
    }
    
    .alert-warning {
        background-color: var(--warning-color);
    }
    
    .alert-info {
        background-color: var(--info-color);
    }
    
    .alert-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        margin-left: 10px;
    }
    
    .table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 1rem;
    }
    
    .table th,
    .table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
    }
    
    .table th {
        background-color: var(--light-surface);
        font-weight: 600;
    }
    
    .table tbody tr:hover {
        background-color: var(--light-surface);
    }
`;

document.head.appendChild(style); 