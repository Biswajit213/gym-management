// Payment Service for Gym Management System
// Handles payment processing, billing, and financial operations

class PaymentService {
    constructor() {
        this.db = window.firebase.db;
        this.collections = window.firebase.collections;
        this.storage = window.firebase.storage;
        
        // Payment methods configuration
        this.paymentMethods = {
            CASH: 'cash',
            CARD: 'card',
            BANK_TRANSFER: 'bank_transfer',
            CHECK: 'check',
            DIGITAL_WALLET: 'digital_wallet'
        };
        
        // Payment statuses
        this.paymentStatuses = {
            PENDING: 'pending',
            COMPLETED: 'completed',
            FAILED: 'failed',
            REFUNDED: 'refunded',
            CANCELLED: 'cancelled'
        };
        
        // Initialize payment service
        this.init();
    }

    // Initialize payment service
    async init() {
        try {
            console.log('Payment Service initialized');
            
            // Set up payment listeners
            this.setupPaymentListeners();
            
        } catch (error) {
            console.error('Error initializing Payment Service:', error);
            await logError('PAYMENT_SERVICE_INIT_ERROR', error);
        }
    }

    // Setup payment listeners
    setupPaymentListeners() {
        // Listen for payment status changes
        this.db.collection(this.collections.PAYMENTS)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'modified') {
                        this.handlePaymentStatusChange(change.doc.data());
                    }
                });
            });
    }

    // Handle payment status change
    async handlePaymentStatusChange(paymentData) {
        try {
            if (paymentData.status === this.paymentStatuses.COMPLETED) {
                // Send notification to member
                await this.sendPaymentConfirmation(paymentData);
                
                // Update member's payment history
                await this.updateMemberPaymentHistory(paymentData);
            }
        } catch (error) {
            console.error('Error handling payment status change:', error);
            await logError('PAYMENT_STATUS_CHANGE_ERROR', error);
        }
    }

    // ==================== BILLING OPERATIONS ====================

    // Create bill
    async createBill(billData) {
        try {
            const billId = utils.formatters.generateReceiptNumber();
            
            const bill = {
                id: billId,
                memberId: billData.memberId,
                memberName: billData.memberName,
                amount: billData.amount,
                description: billData.description,
                dueDate: billData.dueDate || new Date(),
                status: 'pending',
                billType: billData.billType || 'membership',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.db.collection(this.collections.BILLS).doc(billId).set(bill);

            // Send bill notification
            await this.sendBillNotification(bill);

            await logPayment('BILL_CREATED', bill.amount, true, bill);

            return billId;

        } catch (error) {
            console.error('Error creating bill:', error);
            await logError('BILL_CREATION_ERROR', error);
            throw error;
        }
    }

    // Get member bills
    async getMemberBills(memberId, status = null) {
        try {
            let query = this.db.collection(this.collections.BILLS)
                .where('memberId', '==', memberId);

            if (status) {
                query = query.where('status', '==', status);
            }

            const snapshot = await query.orderBy('createdAt', 'desc').get();
            const bills = [];

            snapshot.forEach(doc => {
                bills.push({ id: doc.id, ...doc.data() });
            });

            return bills;

        } catch (error) {
            console.error('Error getting member bills:', error);
            await logError('MEMBER_BILLS_GET_ERROR', error);
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

            await logPayment('BILL_STATUS_UPDATED', 0, true, {
                billId: billId,
                status: status
            });

        } catch (error) {
            console.error('Error updating bill status:', error);
            await logError('BILL_STATUS_UPDATE_ERROR', error);
            throw error;
        }
    }

    // ==================== PAYMENT PROCESSING ====================

    // Process payment
    async processPayment(paymentData) {
        try {
            const paymentId = utils.formatters.generateReceiptNumber();
            
            const payment = {
                id: paymentId,
                memberId: paymentData.memberId,
                memberName: paymentData.memberName,
                billId: paymentData.billId,
                amount: paymentData.amount,
                paymentMethod: paymentData.paymentMethod,
                paymentDate: new Date(),
                status: this.paymentStatuses.PENDING,
                description: paymentData.description,
                transactionId: paymentData.transactionId,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Simulate payment processing
            const processingResult = await this.simulatePaymentProcessing(payment);
            
            if (processingResult.success) {
                payment.status = this.paymentStatuses.COMPLETED;
                payment.processedAt = new Date();
                
                // Update bill status
                if (payment.billId) {
                    await this.updateBillStatus(payment.billId, 'paid');
                }
            } else {
                payment.status = this.paymentStatuses.FAILED;
                payment.errorMessage = processingResult.error;
            }

            // Save payment record
            await this.db.collection(this.collections.PAYMENTS).doc(paymentId).set(payment);

            // Create receipt
            if (payment.status === this.paymentStatuses.COMPLETED) {
                await this.createReceipt(payment);
            }

            await logPayment('PAYMENT_PROCESSED', payment.amount, processingResult.success, payment);

            return {
                paymentId: paymentId,
                success: processingResult.success,
                message: processingResult.success ? 'Payment processed successfully' : processingResult.error
            };

        } catch (error) {
            console.error('Error processing payment:', error);
            await logError('PAYMENT_PROCESSING_ERROR', error);
            throw error;
        }
    }

    // Simulate payment processing
    async simulatePaymentProcessing(payment) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate payment success/failure based on amount
        const success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
            return {
                success: true,
                transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
        } else {
            return {
                success: false,
                error: 'Payment processing failed. Please try again.'
            };
        }
    }

    // Process card payment
    async processCardPayment(paymentData) {
        try {
            // Validate card data
            if (!this.validateCardData(paymentData.cardData)) {
                throw new Error('Invalid card information');
            }

            // Add card payment specific data
            const cardPaymentData = {
                ...paymentData,
                paymentMethod: this.paymentMethods.CARD,
                cardLast4: paymentData.cardData.number.slice(-4),
                cardType: this.getCardType(paymentData.cardData.number)
            };

            return await this.processPayment(cardPaymentData);

        } catch (error) {
            console.error('Error processing card payment:', error);
            await logError('CARD_PAYMENT_ERROR', error);
            throw error;
        }
    }

    // Process cash payment
    async processCashPayment(paymentData) {
        try {
            const cashPaymentData = {
                ...paymentData,
                paymentMethod: this.paymentMethods.CASH
            };

            return await this.processPayment(cashPaymentData);

        } catch (error) {
            console.error('Error processing cash payment:', error);
            await logError('CASH_PAYMENT_ERROR', error);
            throw error;
        }
    }

    // Process bank transfer
    async processBankTransfer(paymentData) {
        try {
            const transferData = {
                ...paymentData,
                paymentMethod: this.paymentMethods.BANK_TRANSFER,
                referenceNumber: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };

            return await this.processPayment(transferData);

        } catch (error) {
            console.error('Error processing bank transfer:', error);
            await logError('BANK_TRANSFER_ERROR', error);
            throw error;
        }
    }

    // ==================== RECEIPT MANAGEMENT ====================

    // Create receipt
    async createReceipt(payment) {
        try {
            const receiptId = utils.formatters.generateReceiptNumber();
            
            const receipt = {
                id: receiptId,
                paymentId: payment.id,
                memberId: payment.memberId,
                memberName: payment.memberName,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                paymentDate: payment.paymentDate,
                receiptNumber: receiptId,
                status: 'completed',
                createdAt: new Date()
            };

            await this.db.collection(this.collections.RECEIPTS).doc(receiptId).set(receipt);

            await logPayment('RECEIPT_CREATED', payment.amount, true, receipt);

            return receiptId;

        } catch (error) {
            console.error('Error creating receipt:', error);
            await logError('RECEIPT_CREATION_ERROR', error);
            throw error;
        }
    }

    // Get member receipts
    async getMemberReceipts(memberId, limit = 20) {
        try {
            const receiptsSnapshot = await this.db.collection(this.collections.RECEIPTS)
                .where('memberId', '==', memberId)
                .orderBy('paymentDate', 'desc')
                .limit(limit)
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

    // Generate receipt PDF
    async generateReceiptPDF(receiptId) {
        try {
            const receiptDoc = await this.db.collection(this.collections.RECEIPTS).doc(receiptId).get();
            
            if (!receiptDoc.exists) {
                throw new Error('Receipt not found');
            }

            const receipt = receiptDoc.data();
            
            // Generate PDF content
            const pdfContent = this.generatePDFContent(receipt);
            
            // Upload PDF to Firebase Storage
            const fileName = `receipt-${receipt.receiptNumber}-${new Date(receipt.paymentDate).toISOString().split('T')[0]}.pdf`;
            const storageRef = this.storage.ref().child(`receipts/${fileName}`);
            
            const blob = new Blob([pdfContent], { type: 'application/pdf' });
            const snapshot = await storageRef.put(blob);
            const downloadURL = await snapshot.ref.getDownloadURL();

            // Update receipt with PDF URL
            await this.db.collection(this.collections.RECEIPTS).doc(receiptId).update({
                pdfURL: downloadURL,
                updatedAt: new Date()
            });

            await logFileOperation('RECEIPT_PDF_GENERATED', fileName, true, {
                receiptId: receiptId,
                downloadURL: downloadURL
            });

            return downloadURL;

        } catch (error) {
            console.error('Error generating receipt PDF:', error);
            await logError('RECEIPT_PDF_GENERATION_ERROR', error);
            throw error;
        }
    }

    // Generate PDF content
    generatePDFContent(receipt) {
        // This is a simplified PDF generation
        // In a real application, you would use a proper PDF library
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
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>GymPro</h1>
                        <h2>Payment Receipt</h2>
                    </div>
                    <div class="receipt-details">
                        <table>
                            <tr><th>Receipt Number:</th><td>${receipt.receiptNumber}</td></tr>
                            <tr><th>Date:</th><td>${new Date(receipt.paymentDate).toLocaleDateString()}</td></tr>
                            <tr><th>Member:</th><td>${receipt.memberName}</td></tr>
                            <tr><th>Amount:</th><td class="amount">$${receipt.amount}</td></tr>
                            <tr><th>Payment Method:</th><td>${receipt.paymentMethod}</td></tr>
                        </table>
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

    // ==================== PAYMENT VALIDATION ====================

    // Validate card data
    validateCardData(cardData) {
        const errors = [];

        // Validate card number (Luhn algorithm)
        if (!this.validateCardNumber(cardData.number)) {
            errors.push('Invalid card number');
        }

        // Validate expiry date
        if (!this.validateExpiryDate(cardData.expiry)) {
            errors.push('Invalid expiry date');
        }

        // Validate CVV
        if (!this.validateCVV(cardData.cvv)) {
            errors.push('Invalid CVV');
        }

        return errors.length === 0;
    }

    // Validate card number using Luhn algorithm
    validateCardNumber(cardNumber) {
        const cleaned = cardNumber.replace(/\s/g, '');
        
        if (!/^\d{13,19}$/.test(cleaned)) {
            return false;
        }

        let sum = 0;
        let isEven = false;

        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned.charAt(i));

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }

    // Validate expiry date
    validateExpiryDate(expiry) {
        const [month, year] = expiry.split('/');
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;

        const expMonth = parseInt(month);
        const expYear = parseInt(year);

        if (expMonth < 1 || expMonth > 12) return false;
        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) return false;

        return true;
    }

    // Validate CVV
    validateCVV(cvv) {
        return /^\d{3,4}$/.test(cvv);
    }

    // Get card type
    getCardType(cardNumber) {
        const cleaned = cardNumber.replace(/\s/g, '');
        
        if (/^4/.test(cleaned)) return 'visa';
        if (/^5[1-5]/.test(cleaned)) return 'mastercard';
        if (/^3[47]/.test(cleaned)) return 'amex';
        if (/^6/.test(cleaned)) return 'discover';
        
        return 'unknown';
    }

    // ==================== FINANCIAL REPORTS ====================

    // Generate payment report
    async generatePaymentReport(startDate, endDate) {
        try {
            const paymentsSnapshot = await this.db.collection(this.collections.PAYMENTS)
                .where('paymentDate', '>=', startDate)
                .where('paymentDate', '<=', endDate)
                .where('status', '==', this.paymentStatuses.COMPLETED)
                .get();

            let totalRevenue = 0;
            const paymentMethods = {};
            const dailyRevenue = {};

            paymentsSnapshot.forEach(doc => {
                const payment = doc.data();
                totalRevenue += payment.amount;

                // Payment method breakdown
                const method = payment.paymentMethod;
                paymentMethods[method] = (paymentMethods[method] || 0) + payment.amount;

                // Daily revenue breakdown
                const date = new Date(payment.paymentDate).toISOString().split('T')[0];
                dailyRevenue[date] = (dailyRevenue[date] || 0) + payment.amount;
            });

            const report = {
                totalRevenue,
                paymentMethods,
                dailyRevenue,
                period: { startDate, endDate },
                totalPayments: paymentsSnapshot.size,
                generatedAt: new Date()
            };

            await logReportGeneration('PAYMENT_REPORT', true, report);

            return report;

        } catch (error) {
            console.error('Error generating payment report:', error);
            await logError('PAYMENT_REPORT_GENERATION_ERROR', error);
            throw error;
        }
    }

    // Get outstanding bills
    async getOutstandingBills() {
        try {
            const billsSnapshot = await this.db.collection(this.collections.BILLS)
                .where('status', '==', 'pending')
                .orderBy('dueDate', 'asc')
                .get();

            const bills = [];
            billsSnapshot.forEach(doc => {
                bills.push({ id: doc.id, ...doc.data() });
            });

            return bills;

        } catch (error) {
            console.error('Error getting outstanding bills:', error);
            await logError('OUTSTANDING_BILLS_GET_ERROR', error);
            throw error;
        }
    }

    // ==================== NOTIFICATIONS ====================

    // Send bill notification
    async sendBillNotification(bill) {
        try {
            const notificationData = {
                memberId: bill.memberId,
                type: 'bill_created',
                title: 'New Bill Generated',
                message: `A new bill of $${bill.amount} has been generated for ${bill.description}`,
                data: {
                    billId: bill.id,
                    amount: bill.amount,
                    dueDate: bill.dueDate
                }
            };

            await window.firebaseServices.sendNotification(notificationData);

        } catch (error) {
            console.error('Error sending bill notification:', error);
            await logError('BILL_NOTIFICATION_ERROR', error);
        }
    }

    // Send payment confirmation
    async sendPaymentConfirmation(payment) {
        try {
            const notificationData = {
                memberId: payment.memberId,
                type: 'payment_confirmed',
                title: 'Payment Confirmed',
                message: `Your payment of $${payment.amount} has been processed successfully`,
                data: {
                    paymentId: payment.id,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod
                }
            };

            await window.firebaseServices.sendNotification(notificationData);

        } catch (error) {
            console.error('Error sending payment confirmation:', error);
            await logError('PAYMENT_CONFIRMATION_ERROR', error);
        }
    }

    // Update member payment history
    async updateMemberPaymentHistory(payment) {
        try {
            // Update member's payment history in Firestore
            const memberRef = this.db.collection(this.collections.MEMBERS).doc(payment.memberId);
            
            await memberRef.update({
                lastPaymentDate: payment.paymentDate,
                totalPayments: firebase.firestore.FieldValue.increment(1),
                totalAmountPaid: firebase.firestore.FieldValue.increment(payment.amount),
                updatedAt: new Date()
            });

        } catch (error) {
            console.error('Error updating member payment history:', error);
            await logError('MEMBER_PAYMENT_HISTORY_UPDATE_ERROR', error);
        }
    }
}

// Create global payment service instance
const paymentService = new PaymentService();

// Export for use in other modules
window.paymentService = paymentService;

// Export individual payment functions for backward compatibility
window.createBill = async function(billData) {
    return await paymentService.createBill(billData);
};

window.getMemberBills = async function(memberId, status) {
    return await paymentService.getMemberBills(memberId, status);
};

window.updateBillStatus = async function(billId, status) {
    return await paymentService.updateBillStatus(billId, status);
};

window.processPayment = async function(paymentData) {
    return await paymentService.processPayment(paymentData);
};

window.processCardPayment = async function(paymentData) {
    return await paymentService.processCardPayment(paymentData);
};

window.processCashPayment = async function(paymentData) {
    return await paymentService.processCashPayment(paymentData);
};

window.processBankTransfer = async function(paymentData) {
    return await paymentService.processBankTransfer(paymentData);
};

window.createReceipt = async function(payment) {
    return await paymentService.createReceipt(payment);
};

window.getMemberReceipts = async function(memberId, limit) {
    return await paymentService.getMemberReceipts(memberId, limit);
};

window.generateReceiptPDF = async function(receiptId) {
    return await paymentService.generateReceiptPDF(receiptId);
};

window.generatePaymentReport = async function(startDate, endDate) {
    return await paymentService.generatePaymentReport(startDate, endDate);
};

window.getOutstandingBills = async function() {
    return await paymentService.getOutstandingBills();
}; 