/**
 * DealQuest - Main Application JavaScript
 * Powered by CheapShark API
 */

// API Base URL
const API_BASE = 'https://www.cheapshark.com/api/1.0';
const REDIRECT_BASE = 'https://www.cheapshark.com/redirect?dealID=';

// Application State
const state = {
    stores: [],           // Array of stores fetched from API
    deals: [],            // Current page of deals
    watchlist: [],        // Array of watchlisted game objects { id, title, thumb }
    currentPage: 0,       // Zero-indexed page for CheapShark API
    searchQuery: '',      // Active search query
    loading: false,       // Loading state indicator
    selectedGameId: null  // Game ID currently shown in modal
};

// DOM Elements
const elements = {
    dealsGrid: document.getElementById('deals-grid'),
    storeSelect: document.getElementById('store-select'),
    priceRange: document.getElementById('price-range'),
    priceVal: document.getElementById('price-val'),
    savingsRange: document.getElementById('savings-range'),
    savingsVal: document.getElementById('savings-val'),
    ratingRange: document.getElementById('rating-range'),
    ratingVal: document.getElementById('rating-val'),
    sortSelect: document.getElementById('sort-select'),
    saleOnlyCheckbox: document.getElementById('sale-only-checkbox'),
    resultsCount: document.getElementById('results-count'),
    dealsHeading: document.getElementById('deals-heading'),
    
    // Search
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    searchSuggestions: document.getElementById('search-suggestions'),
    
    // Pagination
    prevPageBtn: document.getElementById('prev-page-btn'),
    nextPageBtn: document.getElementById('next-page-btn'),
    pageInfo: document.getElementById('page-info'),
    paginationControls: document.getElementById('pagination-controls'),
    
    // Watchlist Drawer
    watchlistToggleBtn: document.getElementById('watchlist-toggle-btn'),
    watchlistDrawer: document.getElementById('watchlist-drawer'),
    watchlistCloseBtn: document.getElementById('watchlist-close-btn'),
    watchlistItems: document.getElementById('watchlist-items'),
    watchlistCount: document.getElementById('watchlist-count'),
    drawerOverlay: document.getElementById('drawer-overlay'),
    
    // Modal
    detailsModal: document.getElementById('details-modal'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalBody: document.getElementById('modal-body-content')
};

// Custom User-Agent identifier for CheapShark compliance
const fetchHeaders = {
    'User-Agent': 'DealQuest/1.0 (harshit@dealquest.local)'
};

/* ==========================================
   INITIALIZATION
   ========================================== */
document.addEventListener('DOMContentLoaded', async () => {
    initEventListeners();
    loadWatchlist();
    await initStores();
    await fetchDeals();
});

/* ==========================================
   EVENT LISTENERS
   ========================================== */
function initEventListeners() {
    // Filter controls change events
    elements.storeSelect.addEventListener('change', () => resetPageAndFetch());
    elements.sortSelect.addEventListener('change', () => resetPageAndFetch());
    elements.saleOnlyCheckbox.addEventListener('change', () => resetPageAndFetch());
    
    // Sliders input events (live label updates)
    elements.priceRange.addEventListener('input', (e) => {
        elements.priceVal.textContent = e.target.value === '60' ? 'Any' : `$${e.target.value}`;
    });
    elements.priceRange.addEventListener('change', () => resetPageAndFetch());

    elements.savingsRange.addEventListener('input', (e) => {
        elements.savingsVal.textContent = `${e.target.value}%`;
    });
    elements.savingsRange.addEventListener('change', () => resetPageAndFetch());

    elements.ratingRange.addEventListener('input', (e) => {
        elements.ratingVal.textContent = e.target.value === '0' ? 'Any' : `${e.target.value}+`;
    });
    elements.ratingRange.addEventListener('change', () => resetPageAndFetch());

    // Search events
    elements.searchBtn.addEventListener('click', () => triggerSearch());
    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            triggerSearch();
        }
    });
    elements.searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    elements.searchClearBtn.addEventListener('click', clearSearch);

    // Pagination events
    elements.prevPageBtn.addEventListener('click', () => {
        if (state.currentPage > 0) {
            state.currentPage--;
            fetchDeals();
            scrollToDeals();
        }
    });
    elements.nextPageBtn.addEventListener('click', () => {
        state.currentPage++;
        fetchDeals();
        scrollToDeals();
    });

    // Watchlist drawer events
    elements.watchlistToggleBtn.addEventListener('click', toggleWatchlistDrawer);
    elements.watchlistCloseBtn.addEventListener('click', closeWatchlistDrawer);
    elements.drawerOverlay.addEventListener('click', closeWatchlistDrawer);

    // Modal close events
    elements.modalCloseBtn.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', closeModal);
    
    // Close autocompletes when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.searchSuggestions.contains(e.target) && e.target !== elements.searchInput) {
            elements.searchSuggestions.style.display = 'none';
        }
    });
}

function resetPageAndFetch() {
    state.currentPage = 0;
    fetchDeals();
}

function scrollToDeals() {
    const dealsSection = document.getElementById('deals-section');
    dealsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ==========================================
   STORES DATA MANAGEMENT
   ========================================== */
async function initStores() {
    try {
        // Attempt to load from localStorage first to save API calls
        const cachedStores = localStorage.getItem('dq_stores_cache');
        if (cachedStores) {
            state.stores = JSON.parse(cachedStores);
        } else {
            const res = await fetch(`${API_BASE}/stores`);
            if (!res.ok) throw new Error('Failed to fetch stores data');
            state.stores = await res.json();
            // Cache stores for 7 days
            localStorage.setItem('dq_stores_cache', JSON.stringify(state.stores));
        }
        
        populateStoreFilter();
    } catch (err) {
        console.error('Error fetching stores:', err);
        // Fallback store list in case API fails
        state.stores = [
            { storeID: "1", storeName: "Steam", isActive: 1, images: { icon: "/img/stores/icons/0.png" } },
            { storeID: "2", storeName: "GamersGate", isActive: 1, images: { icon: "/img/stores/icons/1.png" } },
            { storeID: "3", storeName: "GreenManGaming", isActive: 1, images: { icon: "/img/stores/icons/2.png" } },
            { storeID: "7", storeName: "GOG", isActive: 1, images: { icon: "/img/stores/icons/6.png" } },
            { storeID: "11", storeName: "Humble Store", isActive: 1, images: { icon: "/img/stores/icons/10.png" } },
            { storeID: "25", storeName: "Epic Games Store", isActive: 1, images: { icon: "/img/stores/icons/24.png" } }
        ];
        populateStoreFilter();
    }
}

function populateStoreFilter() {
    // Only display active stores in the filter dropdown
    const activeStores = state.stores.filter(s => s.isActive === 1);
    
    // Sort stores alphabetically
    activeStores.sort((a, b) => a.storeName.localeCompare(b.storeName));
    
    activeStores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.storeID;
        option.textContent = store.storeName;
        elements.storeSelect.appendChild(option);
    });
}

function getStoreInfo(storeID) {
    return state.stores.find(s => s.storeID === storeID) || {
        storeName: 'Unknown Store',
        images: { icon: '/img/stores/icons/0.png' }
    };
}

/* ==========================================
   DEALS FETCHING & RENDERING
   ========================================== */
async function fetchDeals() {
    showLoading();
    
    try {
        // Construct query parameters
        const params = new URLSearchParams();
        params.append('pageNumber', state.currentPage);
        params.append('pageSize', '24');
        
        const storeVal = elements.storeSelect.value;
        if (storeVal !== 'all') {
            params.append('storeID', storeVal);
        }
        
        const maxPrice = elements.priceRange.value;
        if (maxPrice !== '60') {
            params.append('upperPrice', maxPrice);
        }
        
        const minSavings = elements.savingsRange.value;
        if (minSavings !== '0') {
            params.append('lowerSavings', minSavings);
        }
        
        const minMetacritic = elements.ratingRange.value;
        if (minMetacritic !== '0') {
            params.append('metacritic', minMetacritic);
        }
        
        params.append('sortBy', elements.sortSelect.value);
        params.append('onSaleOnly', elements.saleOnlyCheckbox.checked ? '1' : '0');
        
        if (state.searchQuery.trim()) {
            params.append('title', state.searchQuery.trim());
            elements.dealsHeading.innerHTML = `Search Results: <span class="highlight">"${state.searchQuery}"</span>`;
        } else {
            elements.dealsHeading.textContent = 'Active Game Deals';
        }
        
        const response = await fetch(`${API_BASE}/deals?${params.toString()}`);
        if (!response.ok) throw new Error('Deals API returned an error');
        
        state.deals = await response.json();
        renderDeals();
        
    } catch (err) {
        console.error('Failed to fetch deals:', err);
        renderErrorState();
    } finally {
        hideLoading();
    }
}

function renderDeals() {
    elements.dealsGrid.innerHTML = '';
    
    if (state.deals.length === 0) {
        elements.resultsCount.textContent = 'No results found';
        elements.dealsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 4rem 1rem;">
                <i class="fa-solid fa-face-frown" style="font-size: 3rem; color: var(--color-text-muted); margin-bottom: 1rem;"></i>
                <h3>No Game Deals Found</h3>
                <p style="color: var(--color-text-muted); margin-top: 0.25rem;">Try adjusting your filters or searching for something else.</p>
            </div>
        `;
        elements.paginationControls.style.display = 'none';
        return;
    }
    
    // Update results indicator
    const startNum = state.currentPage * 24 + 1;
    const endNum = startNum + state.deals.length - 1;
    elements.resultsCount.textContent = `Showing ${startNum}-${endNum} deals`;
    
    // Render each deal card
    state.deals.forEach(deal => {
        const store = getStoreInfo(deal.storeID);
        const storeLogoUrl = `https://www.cheapshark.com${store.images.icon}`;
        const savingsPct = Math.round(parseFloat(deal.savings));
        const originalPrice = parseFloat(deal.normalPrice).toFixed(2);
        const salePrice = parseFloat(deal.salePrice).toFixed(2);
        const isFree = parseFloat(salePrice) === 0;
        
        const isWatchlisted = state.watchlist.some(item => item.id === deal.gameID);
        
        // Build card HTML
        const card = document.createElement('div');
        card.className = 'deal-card';
        card.setAttribute('data-deal-id', deal.dealID);
        card.setAttribute('data-game-id', deal.gameID);
        
        // Steam rating display
        let ratingHtml = '';
        if (deal.steamRatingPercent && deal.steamRatingPercent !== '0') {
            const countText = deal.steamRatingCount ? `(${parseInt(deal.steamRatingCount).toLocaleString()})` : '';
            ratingHtml = `
                <div class="meta-item" title="Steam User Rating: ${deal.steamRatingText}">
                    <i class="fa-brands fa-steam"></i>
                    <span>${deal.steamRatingPercent}% ${countText}</span>
                </div>
            `;
        }
        
        // Metacritic display
        let metacriticHtml = '';
        if (deal.metacriticScore && deal.metacriticScore !== '0') {
            const score = parseInt(deal.metacriticScore);
            const isPositive = score >= 75;
            metacriticHtml = `
                <div class="meta-item metacritic ${isPositive ? 'positive' : ''}" title="Metacritic Score">
                    <span>M: ${score}</span>
                </div>
            `;
        }
        
        // Hot deal check (Deal Rating > 8.0 indicates a great discount)
        const dealRating = parseFloat(deal.dealRating);
        let dealRatingHtml = '';
        if (dealRating >= 8.5) {
            dealRatingHtml = `
                <span class="deal-rating-indicator rating-high" title="Deal Rating: ${dealRating}/10">
                    <i class="fa-solid fa-fire-flame-curved"></i> Hot Deal (${dealRating.toFixed(1)})
                </span>
            `;
        } else {
            dealRatingHtml = `
                <span class="deal-rating-indicator" title="Deal Rating: ${dealRating}/10">
                    <i class="fa-solid fa-award"></i> Rating: ${dealRating.toFixed(1)}
                </span>
            `;
        }
        
        card.innerHTML = `
            <button class="bookmark-btn ${isWatchlisted ? 'active' : ''}" data-game-id="${deal.gameID}" data-title="${escapeHtml(deal.title)}" data-thumb="${deal.thumb}" title="${isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}">
                <i class="fa-solid fa-bookmark"></i>
            </button>
            <div class="card-banner">
                <img src="${deal.thumb}" alt="${deal.title}" loading="lazy" onerror="this.src='https://placehold.co/300x140/111827/ffffff?text=No+Image'">
                ${savingsPct > 0 ? `<span class="savings-badge">-${savingsPct}%</span>` : ''}
                <span class="store-badge" title="${store.storeName}">
                    <img src="${storeLogoUrl}" alt="${store.storeName}">
                </span>
            </div>
            <div class="card-body">
                <h3 class="card-title" title="${deal.title}">${deal.title}</h3>
                <div class="card-meta-row">
                    ${metacriticHtml}
                    ${ratingHtml}
                </div>
                <div class="card-price-row">
                    <div class="price-details">
                        ${savingsPct > 0 ? `<span class="retail-price">$${originalPrice}</span>` : ''}
                        <span class="sale-price">${isFree ? 'FREE' : `$${salePrice}`}</span>
                        ${dealRatingHtml}
                    </div>
                    <button class="view-deal-btn" title="View Store Comparisons">
                        <i class="fa-solid fa-angle-right"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add card interaction events
        card.querySelector('.view-deal-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openGameDetails(deal.gameID);
        });
        card.addEventListener('click', () => {
            openGameDetails(deal.gameID);
        });
        
        // Bookmark button interaction
        const bookmarkBtn = card.querySelector('.bookmark-btn');
        bookmarkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const gameID = bookmarkBtn.getAttribute('data-game-id');
            const title = bookmarkBtn.getAttribute('data-title');
            const thumb = bookmarkBtn.getAttribute('data-thumb');
            toggleWatchlist(gameID, title, thumb);
            bookmarkBtn.classList.toggle('active');
        });
        
        elements.dealsGrid.appendChild(card);
    });
    
    // Update pagination buttons
    elements.pageInfo.textContent = `Page ${state.currentPage + 1}`;
    elements.prevPageBtn.disabled = state.currentPage === 0;
    // CheapShark returns less than pageSize when we reach the end
    elements.nextPageBtn.disabled = state.deals.length < 24;
    elements.paginationControls.style.display = 'flex';
}

function showLoading() {
    state.loading = true;
    elements.dealsGrid.innerHTML = '';
    // Show 6 shimmer loading cards
    for (let i = 0; i < 6; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        elements.dealsGrid.appendChild(skeleton);
    }
    elements.paginationControls.style.display = 'none';
}

function hideLoading() {
    state.loading = false;
}

function renderErrorState() {
    elements.dealsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 4rem 1rem;">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 3rem; color: var(--color-error); margin-bottom: 1rem;"></i>
            <h3>Unable to Load Deals</h3>
            <p style="color: var(--color-text-muted); margin-top: 0.25rem;">There was a network or API connection error. Please try again.</p>
            <button onclick="window.location.reload()" class="search-submit-btn" style="margin-top: 1.5rem; display: inline-block;">
                <i class="fa-solid fa-rotate"></i> Retry Connection
            </button>
        </div>
    `;
    elements.paginationControls.style.display = 'none';
}

/* ==========================================
   LIVE GAME SEARCH & AUTOCOMPLETE
   ========================================== */
async function handleSearchInput(e) {
    const query = e.target.value.trim();
    if (!query) {
        elements.searchSuggestions.style.display = 'none';
        elements.searchClearBtn.style.display = 'none';
        return;
    }
    
    elements.searchClearBtn.style.display = 'flex';
    
    try {
        const response = await fetch(`${API_BASE}/games?title=${encodeURIComponent(query)}&limit=8`);
        if (!response.ok) throw new Error('Search failed');
        const results = await response.json();
        
        renderSuggestions(results);
    } catch (err) {
        console.error('Search error:', err);
    }
}

function renderSuggestions(results) {
    elements.searchSuggestions.innerHTML = '';
    
    if (results.length === 0) {
        elements.searchSuggestions.style.display = 'none';
        return;
    }
    
    results.forEach(game => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.setAttribute('data-game-id', game.gameID);
        
        div.innerHTML = `
            <img class="suggestion-img" src="${game.thumb}" alt="${game.external}" onerror="this.src='https://placehold.co/48x24/111827/ffffff?text=No+Image'">
            <div class="suggestion-info">
                <span class="suggestion-title">${game.external}</span>
                <span class="suggestion-price">Best price: $${parseFloat(game.cheapest).toFixed(2)}</span>
            </div>
        `;
        
        div.addEventListener('click', () => {
            elements.searchInput.value = game.external;
            elements.searchSuggestions.style.display = 'none';
            openGameDetails(game.gameID);
        });
        
        elements.searchSuggestions.appendChild(div);
    });
    
    elements.searchSuggestions.style.display = 'block';
}

function triggerSearch() {
    const query = elements.searchInput.value.trim();
    state.searchQuery = query;
    state.currentPage = 0;
    elements.searchSuggestions.style.display = 'none';
    fetchDeals();
}

function clearSearch() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.searchClearBtn.style.display = 'none';
    elements.searchSuggestions.style.display = 'none';
    resetPageAndFetch();
}

/* ==========================================
   GAME DETAILS MODAL LOGIC
   ========================================== */
async function openGameDetails(gameID) {
    state.selectedGameId = gameID;
    
    // Open loading modal immediately
    elements.modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 1rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--color-primary); margin-bottom: 1.5rem;"></i>
            <h3>Retrieving Store Offers...</h3>
            <p style="color: var(--color-text-muted); margin-top: 0.25rem;">Fetching the best live prices from digital shelves...</p>
        </div>
    `;
    elements.detailsModal.classList.add('active');
    elements.modalOverlay.classList.add('active');
    
    try {
        const response = await fetch(`${API_BASE}/games?id=${gameID}`);
        if (!response.ok) throw new Error('Failed to load game details');
        const data = await response.json();
        
        renderGameDetails(data, gameID);
        
    } catch (err) {
        console.error('Error fetching game details:', err);
        elements.modalBody.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: var(--color-error); margin-bottom: 1rem;"></i>
                <h3>Failed to Load Information</h3>
                <p style="color: var(--color-text-muted);">Please verify your connection and try again.</p>
            </div>
        `;
    }
}

function renderGameDetails(data, gameID) {
    const info = data.info;
    const cheapestEver = data.cheapestPriceEver;
    const deals = data.deals || [];
    
    const isWatchlisted = state.watchlist.some(item => item.id === gameID);
    
    // Format Cheapest Ever Date
    let dateStr = 'Unknown';
    if (cheapestEver && cheapestEver.date) {
        // CheapShark provides Unix timestamp in seconds
        const date = new Date(cheapestEver.date * 1000);
        dateStr = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
    
    // Sort deals by cheapest price first
    deals.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
    // Game Title & Metadata
    let modalHeaderHtml = `
        <div class="modal-game-info">
            <img class="modal-game-thumb" src="${info.thumb}" alt="${info.title}" onerror="this.src='https://placehold.co/200x94/111827/ffffff?text=No+Image'">
            <div class="modal-game-details">
                <h2 class="modal-game-title">${info.title}</h2>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="nav-btn-watchlist" id="modal-watchlist-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: ${isWatchlisted ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))'}; color: ${isWatchlisted ? 'var(--color-primary)' : '#07090e'}; border: ${isWatchlisted ? '1px solid var(--color-primary)' : 'none'}; box-shadow: none;">
                        <i class="fa-solid fa-bookmark"></i> ${isWatchlisted ? 'Watchlisted' : 'Add to Watchlist'}
                    </button>
                    ${info.steamAppID ? `
                        <a href="https://store.steampowered.com/app/${info.steamAppID}" target="_blank" rel="noopener noreferrer" class="nav-link" style="font-size:0.85rem; padding:0.4rem 0.8rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); display: inline-flex; align-items:center; gap:0.4rem;">
                            <i class="fa-brands fa-steam"></i> Steam Page <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.7rem;"></i>
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Historical Low
    let historicalLowHtml = '';
    if (cheapestEver && cheapestEver.price) {
        historicalLowHtml = `
            <div class="historical-low-banner">
                <div class="historical-low-info">
                    <i class="fa-solid fa-circle-down"></i>
                    <div>
                        <strong>Historical Lowest Price</strong>
                        <div style="font-size: 0.8rem; color: var(--color-text-muted);">Recorded on ${dateStr}</div>
                    </div>
                </div>
                <div class="historical-low-price">$${parseFloat(cheapestEver.price).toFixed(2)}</div>
            </div>
        `;
    }
    
    // Active Store Deals Comparison List
    let dealsListHtml = `
        <h3 class="modal-section-title"><i class="fa-solid fa-tags"></i> Compare Live Offers</h3>
        <div class="store-deals-list">
    `;
    
    if (deals.length === 0) {
        dealsListHtml += `
            <div style="text-align: center; padding: 2rem 0; color: var(--color-text-muted);">
                <p>No active store discounts found for this game currently.</p>
            </div>
        `;
    } else {
        deals.forEach((deal, index) => {
            const store = getStoreInfo(deal.storeID);
            const storeLogoUrl = `https://www.cheapshark.com${store.images.icon}`;
            const isCheapest = index === 0;
            const savingsPct = Math.round(parseFloat(deal.savings));
            const salePrice = parseFloat(deal.price).toFixed(2);
            const retailPrice = parseFloat(deal.retailPrice).toFixed(2);
            
            dealsListHtml += `
                <div class="store-deal-row ${isCheapest ? 'cheapest-store' : ''}">
                    <div class="store-info-left">
                        <img class="store-logo-modal" src="${storeLogoUrl}" alt="${store.storeName}" onerror="this.src='https://placehold.co/24x24/111827/ffffff?text=Logo'">
                        <div>
                            <span class="store-name-modal">${store.storeName}</span>
                            ${isCheapest ? `<span style="display:inline-block; font-size:0.75rem; font-weight:700; color:var(--color-success); margin-left:0.5rem; background:rgba(16,185,129,0.1); padding:0.1rem 0.4rem; border-radius:4px;"><i class="fa-solid fa-check"></i> Best Price</span>` : ''}
                        </div>
                    </div>
                    <div class="store-price-right">
                        <div class="store-prices">
                            <span class="store-sale-price">$${salePrice}</span>
                            ${savingsPct > 0 ? `
                                <div style="display:flex; align-items:center; gap:0.3rem; justify-content: flex-end;">
                                    <span class="store-retail-price">$${retailPrice}</span>
                                    <span style="font-size:0.75rem; font-weight:800; color:var(--color-error); font-family: var(--font-header);">-${savingsPct}%</span>
                                </div>
                            ` : ''}
                        </div>
                        <a href="${REDIRECT_BASE}${deal.dealID}" target="_blank" rel="noopener noreferrer" class="buy-deal-btn" style="background: ${isCheapest ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)'}; color: ${isCheapest ? '#07090e' : 'var(--color-text-main)'}; border: ${isCheapest ? 'none' : '1px solid var(--border-color)'};">
                            Shop <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.7rem;"></i>
                        </a>
                    </div>
                </div>
            `;
        });
    }
    
    dealsListHtml += `</div>`;
    
    // Assemble all layouts inside modal body
    elements.modalBody.innerHTML = `
        ${modalHeaderHtml}
        ${historicalLowHtml}
        ${dealsListHtml}
    `;
    
    // Bind click event inside Modal Watchlist Button
    const modalWatchlistBtn = document.getElementById('modal-watchlist-btn');
    modalWatchlistBtn.addEventListener('click', () => {
        const active = toggleWatchlist(gameID, info.title, info.thumb);
        if (active) {
            modalWatchlistBtn.style.background = 'rgba(255,255,255,0.05)';
            modalWatchlistBtn.style.color = 'var(--color-primary)';
            modalWatchlistBtn.style.border = '1px solid var(--color-primary)';
            modalWatchlistBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> Watchlisted`;
        } else {
            modalWatchlistBtn.style.background = 'linear-gradient(135deg, var(--color-primary), var(--color-accent))';
            modalWatchlistBtn.style.color = '#07090e';
            modalWatchlistBtn.style.border = 'none';
            modalWatchlistBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> Add to Watchlist`;
        }
        
        // Synchronize with the main grid cards if visible
        const cardBookmarkBtn = document.querySelector(`.deal-card[data-game-id="${gameID}"] .bookmark-btn`);
        if (cardBookmarkBtn) {
            cardBookmarkBtn.classList.toggle('active', active);
        }
    });
}

function closeModal() {
    elements.detailsModal.classList.remove('active');
    elements.modalOverlay.classList.remove('active');
    state.selectedGameId = null;
}

/* ==========================================
   WATCHLIST DRAWER LOGIC
   ========================================== */
function toggleWatchlistDrawer() {
    elements.watchlistDrawer.classList.toggle('active');
    elements.drawerOverlay.classList.toggle('active');
    
    if (elements.watchlistDrawer.classList.contains('active')) {
        renderWatchlistItems();
    }
}

function closeWatchlistDrawer() {
    elements.watchlistDrawer.classList.remove('active');
    elements.drawerOverlay.classList.remove('active');
}

function loadWatchlist() {
    const saved = localStorage.getItem('dq_watchlist');
    if (saved) {
        state.watchlist = JSON.parse(saved);
    }
    updateWatchlistCount();
}

function updateWatchlistCount() {
    elements.watchlistCount.textContent = state.watchlist.length;
}

function toggleWatchlist(id, title, thumb) {
    const index = state.watchlist.findIndex(item => item.id === id);
    let added = false;
    
    if (index === -1) {
        state.watchlist.push({ id, title, thumb });
        added = true;
    } else {
        state.watchlist.splice(index, 1);
    }
    
    localStorage.setItem('dq_watchlist', JSON.stringify(state.watchlist));
    updateWatchlistCount();
    
    // Re-render watchlist if open
    if (elements.watchlistDrawer.classList.contains('active')) {
        renderWatchlistItems();
    }
    
    return added;
}

async function renderWatchlistItems() {
    elements.watchlistItems.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height: 100px;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--color-primary);"></i>
        </div>
    `;
    
    if (state.watchlist.length === 0) {
        elements.watchlistItems.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-ghost"></i>
                <p>Your watchlist is empty.</p>
                <span class="subtext">Add games to track discounts across stores!</span>
            </div>
        `;
        return;
    }
    
    try {
        // Query current deals for all watchlisted game IDs simultaneously
        const ids = state.watchlist.map(item => item.id).join(',');
        const response = await fetch(`${API_BASE}/games?ids=${ids}`);
        if (!response.ok) throw new Error('Failed to fetch watchlist pricing updates');
        const priceData = await response.json();
        
        elements.watchlistItems.innerHTML = '';
        
        // Loop through watchlisted games and display their current best price
        state.watchlist.forEach(game => {
            const pricing = priceData[game.id];
            let pricingHtml = '<span class="watchlist-item-price">No active deals</span>';
            
            if (pricing && pricing.cheapestPriceEver) {
                const bestPrice = parseFloat(pricing.deals[0]?.price || pricing.cheapestPriceEver.price).toFixed(2);
                const retailPrice = parseFloat(pricing.deals[0]?.retailPrice || bestPrice).toFixed(2);
                const isDiscounted = parseFloat(bestPrice) < parseFloat(retailPrice);
                
                pricingHtml = `
                    <span class="watchlist-item-price">
                        ${isDiscounted ? `<span style="text-decoration:line-through; font-size:0.75rem; margin-right:0.3rem;">$${retailPrice}</span>` : ''}
                        Best Price: <span class="highlight-price">$${bestPrice}</span>
                    </span>
                `;
            }
            
            const div = document.createElement('div');
            div.className = 'watchlist-item';
            div.innerHTML = `
                <img class="watchlist-item-img" src="${game.thumb}" alt="${game.title}" onerror="this.src='https://placehold.co/64x30/111827/ffffff?text=Game'">
                <div class="watchlist-item-info">
                    <h4 class="watchlist-item-title" title="${game.title}">${game.title}</h4>
                    ${pricingHtml}
                </div>
                <div class="watchlist-item-actions">
                    <button class="watchlist-view-btn" data-game-id="${game.id}" title="Compare Prices">
                        <i class="fa-solid fa-magnifying-glass-dollar"></i>
                    </button>
                    <button class="watchlist-remove-btn" data-game-id="${game.id}" title="Remove">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            
            // Watchlist item actions
            div.querySelector('.watchlist-view-btn').addEventListener('click', () => {
                closeWatchlistDrawer();
                openGameDetails(game.id);
            });
            
            div.querySelector('.watchlist-remove-btn').addEventListener('click', () => {
                toggleWatchlist(game.id, game.title, game.thumb);
                
                // Also update card UI if it exists in the visible grid
                const cardBookmarkBtn = document.querySelector(`.deal-card[data-game-id="${game.id}"] .bookmark-btn`);
                if (cardBookmarkBtn) {
                    cardBookmarkBtn.classList.remove('active');
                }
            });
            
            elements.watchlistItems.appendChild(div);
        });
        
    } catch (err) {
        console.error('Error rendering watchlist:', err);
        // Fallback display using cached/saved info without live prices
        elements.watchlistItems.innerHTML = '';
        state.watchlist.forEach(game => {
            const div = document.createElement('div');
            div.className = 'watchlist-item';
            div.innerHTML = `
                <img class="watchlist-item-img" src="${game.thumb}" alt="${game.title}">
                <div class="watchlist-item-info">
                    <h4 class="watchlist-item-title">${game.title}</h4>
                    <span class="watchlist-item-price" style="color:var(--color-text-muted)">Live pricing offline</span>
                </div>
                <div class="watchlist-item-actions">
                    <button class="watchlist-remove-btn" data-game-id="${game.id}" title="Remove">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            div.querySelector('.watchlist-remove-btn').addEventListener('click', () => {
                toggleWatchlist(game.id, game.title, game.thumb);
            });
            elements.watchlistItems.appendChild(div);
        });
    }
}

/* ==========================================
   UTILITY FUNCTIONS
   ========================================== */
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
