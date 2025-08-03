// Main JavaScript for Gym Management System
// Handles navigation, contact form, and general page functionality

document.addEventListener('DOMContentLoaded', function() {
    // Log page view
    logPageView('Landing Page');
    
    // Initialize navigation
    initNavigation();
    
    // Initialize contact form
    initContactForm();
    
    // Initialize smooth scrolling
    initSmoothScrolling();
    
    // Initialize animations
    initAnimations();
    
    // Initialize newsletter form
    initNewsletterForm();
});

// Navigation functionality
function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close mobile menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Contact form functionality
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const name = formData.get('name');
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');
            
            // Validate form
            if (!validateContactForm(name, email, subject, message)) {
                return;
            }
            
            // Show loading state
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            utils.domUtils.showLoading(submitBtn);
            submitBtn.textContent = 'Sending...';
            
            try {
                // Simulate sending (replace with actual email service)
                await sendContactEmail(name, email, subject, message);
                
                // Log form submission
                await logFormSubmission('contact_form', true, {
                    name: name,
                    email: email,
                    subject: subject
                });
                
                // Show success message
                utils.domUtils.showAlert('Thank you for your message! We will get back to you soon.', 'success');
                
                // Reset form
                contactForm.reset();
                
            } catch (error) {
                console.error('Error sending contact form:', error);
                
                // Log error
                await logError('CONTACT_FORM_ERROR', error, {
                    name: name,
                    email: email,
                    subject: subject
                });
                
                // Show error message
                utils.domUtils.showAlert('Sorry, there was an error sending your message. Please try again.', 'error');
            } finally {
                // Hide loading state
                utils.domUtils.hideLoading(submitBtn);
                submitBtn.textContent = originalText;
            }
        });
    }
}

// Validate contact form
function validateContactForm(name, email, subject, message) {
    const errors = [];
    
    if (!utils.validators.isRequired(name)) {
        errors.push('Name is required');
    } else if (!utils.validators.isValidName(name)) {
        errors.push('Please enter a valid name');
    }
    
    if (!utils.validators.isRequired(email)) {
        errors.push('Email is required');
    } else if (!utils.validators.isValidEmail(email)) {
        errors.push('Please enter a valid email address');
    }
    
    if (!utils.validators.isRequired(subject)) {
        errors.push('Subject is required');
    }
    
    if (!utils.validators.isRequired(message)) {
        errors.push('Message is required');
    }
    
    if (errors.length > 0) {
        utils.domUtils.showAlert(errors.join('\n'), 'error');
        return false;
    }
    
    return true;
}

// Send contact email (simulated)
async function sendContactEmail(name, email, subject, message) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real application, this would send to your email service
    // For now, we'll just log the contact details
    console.log('Contact form submission:', {
        name,
        email,
        subject,
        message,
        timestamp: new Date().toISOString()
    });
    
    // Store in localStorage for demo purposes
    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
    contacts.push({
        id: Date.now(),
        name,
        email,
        subject,
        message,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('contacts', JSON.stringify(contacts));
}

// Smooth scrolling for anchor links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize animations
function initAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.feature-card, .stat-item, .contact-item').forEach(el => {
        observer.observe(el);
    });
}

// Newsletter form functionality
function initNewsletterForm() {
    const newsletterForm = document.querySelector('.newsletter-form');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const email = emailInput.value.trim();
            
            // Validate email
            if (!utils.validators.isValidEmail(email)) {
                utils.domUtils.showAlert('Please enter a valid email address', 'error');
                return;
            }
            
            try {
                // Simulate newsletter subscription
                await subscribeToNewsletter(email);
                
                // Log subscription
                await logUserAction('NEWSLETTER_SUBSCRIPTION', {
                    email: email
                });
                
                // Show success message
                utils.domUtils.showAlert('Thank you for subscribing to our newsletter!', 'success');
                
                // Reset form
                newsletterForm.reset();
                
            } catch (error) {
                console.error('Error subscribing to newsletter:', error);
                utils.domUtils.showAlert('Sorry, there was an error. Please try again.', 'error');
            }
        });
    }
}

// Subscribe to newsletter (simulated)
async function subscribeToNewsletter(email) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Store subscription in localStorage for demo
    const subscriptions = JSON.parse(localStorage.getItem('newsletter_subscriptions') || '[]');
    if (!subscriptions.includes(email)) {
        subscriptions.push(email);
        localStorage.setItem('newsletter_subscriptions', JSON.stringify(subscriptions));
    }
    
    console.log('Newsletter subscription:', email);
}

// Add CSS for navbar scroll effect
const navbarStyle = document.createElement('style');
navbarStyle.textContent = `
    .navbar.scrolled {
        background-color: rgba(255, 255, 255, 0.98);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .hamburger.active .bar:nth-child(2) {
        opacity: 0;
    }
    
    .hamburger.active .bar:nth-child(1) {
        transform: translateY(8px) rotate(45deg);
    }
    
    .hamburger.active .bar:nth-child(3) {
        transform: translateY(-8px) rotate(-45deg);
    }
    
    @media (max-width: 768px) {
        .nav-menu {
            position: fixed;
            left: -100%;
            top: 70px;
            flex-direction: column;
            background-color: white;
            width: 100%;
            text-align: center;
            transition: 0.3s;
            box-shadow: 0 10px 27px rgba(0, 0, 0, 0.05);
            padding: 2rem 0;
        }
        
        .nav-menu.active {
            left: 0;
        }
        
        .nav-item {
            margin: 1rem 0;
        }
    }
`;

document.head.appendChild(navbarStyle);

// Performance monitoring
window.addEventListener('load', () => {
    // Log page load performance
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    logSystemAction('PAGE_LOAD_PERFORMANCE', {
        loadTime: loadTime,
        url: window.location.href
    });
});

// Error handling
window.addEventListener('error', (event) => {
    logError('PAGE_ERROR', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
    });
});

// Unhandled promise rejection handling
window.addEventListener('unhandledrejection', (event) => {
    logError('UNHANDLED_PROMISE_REJECTION', event.reason, {
        promise: event.promise
    });
});

// Export functions for use in other modules
window.mainUtils = {
    validateContactForm,
    sendContactEmail,
    subscribeToNewsletter
}; 