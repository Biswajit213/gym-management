// User Module for Gym Management System
// Handles public user functionality and search

class UserManager {
    constructor() {
        this.searchResults = [];
        this.init();
    }

    // Initialize user functionality
    async init() {
        try {
            // Log page view
            await logPageView('Public Search Page');
            
            // Set up event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('Error initializing user:', error);
            await logError('USER_INIT_ERROR', error);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Search input event listener
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        // Search type change event listener
        const searchType = document.getElementById('searchType');
        if (searchType) {
            searchType.addEventListener('change', () => {
                this.performSearch();
            });
        }
    }

    // Perform search
    async performSearch() {
        try {
            const searchTerm = document.getElementById('searchInput').value.trim();
            const searchType = document.getElementById('searchType').value;
            
            if (!searchTerm) {
                this.displaySearchResults([]);
                return;
            }

            // Log search
            await logSearch(searchTerm, 0);

            // Show loading state
            this.showLoading();

            // Perform search based on type
            let results = [];
            
            if (searchType === 'all' || searchType === 'members') {
                const memberResults = await this.searchMembers(searchTerm);
                results = results.concat(memberResults);
            }
            
            if (searchType === 'all' || searchType === 'services') {
                const serviceResults = await this.searchServices(searchTerm);
                results = results.concat(serviceResults);
            }
            
            if (searchType === 'all' || searchType === 'supplements') {
                const supplementResults = await this.searchSupplements(searchTerm);
                results = results.concat(supplementResults);
            }

            // Update search results
            this.searchResults = results;
            
            // Display results
            this.displaySearchResults(results);

            // Log search results
            await logSearch(searchTerm, results.length);

        } catch (error) {
            console.error('Error performing search:', error);
            await logError('SEARCH_ERROR', error);
            
            utils.domUtils.showAlert('Error performing search. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Search members
    async searchMembers(searchTerm) {
        try {
            const db = window.firebase.db;
            
            // Search by name (case-insensitive)
            const membersSnapshot = await db.collection('members')
                .where('name', '>=', searchTerm)
                .where('name', '<=', searchTerm + '\uf8ff')
                .limit(10)
                .get();

            const results = [];
            membersSnapshot.forEach(doc => {
                const member = doc.data();
                results.push({
                    id: doc.id,
                    type: 'member',
                    title: member.name,
                    description: `Member since ${new Date(member.joinDate).toLocaleDateString()}`,
                    data: member
                });
            });

            return results;
        } catch (error) {
            console.error('Error searching members:', error);
            return [];
        }
    }

    // Search services
    async searchServices(searchTerm) {
        try {
            // For demo purposes, return static service data
            const services = [
                {
                    id: '1',
                    name: 'Personal Training',
                    description: 'One-on-one training sessions with certified trainers'
                },
                {
                    id: '2',
                    name: 'Group Classes',
                    description: 'Yoga, Zumba, Pilates, and more group fitness classes'
                },
                {
                    id: '3',
                    name: 'Cardio Equipment',
                    description: 'Treadmills, ellipticals, stationary bikes, and rowing machines'
                },
                {
                    id: '4',
                    name: 'Weight Training',
                    description: 'Free weights, machines, and strength training equipment'
                }
            ];

            return services
                .filter(service => 
                    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    service.description.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(service => ({
                    id: service.id,
                    type: 'service',
                    title: service.name,
                    description: service.description,
                    data: service
                }));
        } catch (error) {
            console.error('Error searching services:', error);
            return [];
        }
    }

    // Search supplements
    async searchSupplements(searchTerm) {
        try {
            const db = window.firebase.db;
            
            const supplementsSnapshot = await db.collection('supplements')
                .where('name', '>=', searchTerm)
                .where('name', '<=', searchTerm + '\uf8ff')
                .limit(10)
                .get();

            const results = [];
            supplementsSnapshot.forEach(doc => {
                const supplement = doc.data();
                results.push({
                    id: doc.id,
                    type: 'supplement',
                    title: supplement.name,
                    description: `${supplement.description} - $${supplement.price}`,
                    data: supplement
                });
            });

            return results;
        } catch (error) {
            console.error('Error searching supplements:', error);
            return [];
        }
    }

    // Display search results
    displaySearchResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        
        if (!resultsContainer) return;

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No results found</h3>
                    <p>Try adjusting your search terms or filters.</p>
                </div>
            `;
            return;
        }

        const resultsHTML = results.map(result => `
            <div class="search-result-item">
                <div class="result-icon">
                    <i class="fas ${this.getResultIcon(result.type)}"></i>
                </div>
                <div class="result-content">
                    <h3 class="result-title">${result.title}</h3>
                    <p class="result-description">${result.description}</p>
                    <div class="result-meta">
                        <span class="result-type">${result.type}</span>
                    </div>
                </div>
            </div>
        `).join('');

        resultsContainer.innerHTML = resultsHTML;
    }

    // Get result icon based on type
    getResultIcon(type) {
        const iconMap = {
            'member': 'fa-user',
            'service': 'fa-dumbbell',
            'supplement': 'fa-pills'
        };
        
        return iconMap[type] || 'fa-info-circle';
    }

    // Show loading state
    showLoading() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="loading-results">
                    <div class="spinner"></div>
                    <p>Searching...</p>
                </div>
            `;
        }
    }

    // Hide loading state
    hideLoading() {
        // Loading state is cleared when results are displayed
    }
}

// Create global user manager instance
const userManager = new UserManager();

// Global function for search
window.performSearch = function() {
    return userManager.performSearch();
};

// Add CSS for search functionality
const searchStyles = document.createElement('style');
searchStyles.textContent = `
    .search-section {
        text-align: center;
        margin-bottom: 40px;
    }

    .search-section h1 {
        margin-bottom: 10px;
        color: var(--light-text);
    }

    .search-section p {
        color: var(--light-text-secondary);
        margin-bottom: 30px;
    }

    .search-container {
        max-width: 600px;
        margin: 0 auto 40px;
    }

    .search-box {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
    }

    .search-box input {
        flex: 1;
        padding: 12px 16px;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        font-size: 16px;
        transition: var(--transition);
    }

    .search-box input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .search-filters select {
        padding: 8px 12px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background-color: white;
        font-size: 14px;
    }

    .search-results {
        max-width: 800px;
        margin: 0 auto;
    }

    .search-result-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 20px;
        background-color: white;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        margin-bottom: 16px;
        transition: var(--transition);
    }

    .search-result-item:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
    }

    .result-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-color: var(--primary-color);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 20px;
        flex-shrink: 0;
    }

    .result-content {
        flex: 1;
    }

    .result-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--light-text);
        margin-bottom: 8px;
    }

    .result-description {
        color: var(--light-text-secondary);
        margin-bottom: 12px;
        line-height: 1.5;
    }

    .result-meta {
        display: flex;
        gap: 12px;
    }

    .result-type {
        background-color: var(--light-surface);
        color: var(--primary-color);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
    }

    .no-results {
        text-align: center;
        padding: 60px 20px;
        color: var(--light-text-secondary);
    }

    .no-results i {
        font-size: 48px;
        margin-bottom: 20px;
        opacity: 0.5;
    }

    .no-results h3 {
        margin-bottom: 10px;
        color: var(--light-text);
    }

    .loading-results {
        text-align: center;
        padding: 60px 20px;
        color: var(--light-text-secondary);
    }

    .loading-results .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--border-color);
        border-top: 4px solid var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }

    @media (max-width: 768px) {
        .search-box {
            flex-direction: column;
        }
        
        .search-result-item {
            flex-direction: column;
            text-align: center;
        }
        
        .result-icon {
            align-self: center;
        }
    }
`;

document.head.appendChild(searchStyles);

// Export user manager for use in other modules
window.userManager = userManager; 