/* =====================================================
   STORYNEST - HOME PAGE (COMPLETE UPDATED)
   ===================================================== */

/*
 * Containers
 */
const trendingContainer = document.getElementById("trendingNovels");
const newContainer = document.getElementById("newNovels");
const searchResultsContainer = document.getElementById("searchResults");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchPanel = document.getElementById("searchPanel");
const exploreBtn = document.getElementById("exploreBtn");

// Genre filter buttons
const genreButtons = document.querySelectorAll('.genre-btn');
let activeGenre = 'all';
let currentSearchQuery = '';

/* =====================================================
   LOAD PUBLISHED NOVELS
   ===================================================== */

async function loadPublishedNovels() {
    // If search is active, show search results instead
    if (currentSearchQuery) {
        await performSearch(currentSearchQuery);
        return;
    }

    // If genre is selected, show genre filtered
    if (activeGenre !== 'all') {
        await loadNovelsByGenre(activeGenre);
        return;
    }

    const { data: novels, error } = await supabaseClient
        .from("novels")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Could not load novels:", error);
        showErrorMessage(trendingContainer, "Could not load novels.");
        showErrorMessage(newContainer, "Could not load novels.");
        return;
    }

    if (!novels || novels.length === 0) {
        showEmptyMessage(trendingContainer, "No published novels yet. Check back soon!");
        showEmptyMessage(newContainer, "No new releases yet.");
        return;
    }

    displayTrending(novels.slice(0, 4));
    displayNewReleases(novels.slice(0, 6));
}

/* =====================================================
   SEARCH FUNCTIONALITY
   ===================================================== */

async function performSearch(query) {
    if (!query || query.trim().length < 2) {
        // If query is too short, show default
        currentSearchQuery = '';
        await loadPublishedNovels();
        return;
    }

    currentSearchQuery = query.trim();
    
    // Use the search function we created in Supabase
    const { data: results, error } = await supabaseClient
        .rpc('search_novels', { search_query: currentSearchQuery });

    if (error) {
        console.error("Search error:", error);
        // Fallback to simple search
        const { data: fallbackResults } = await supabaseClient
            .from("novels")
            .select("*")
            .eq("status", "published")
            .or(`title.ilike.%${currentSearchQuery}%,description.ilike.%${currentSearchQuery}%,genre.ilike.%${currentSearchQuery}%,author_name.ilike.%${currentSearchQuery}%`)
            .order("created_at", { ascending: false });
        
        displaySearchResults(fallbackResults || []);
        return;
    }

    displaySearchResults(results || []);
}

function displaySearchResults(results) {
    // Hide trending and new sections, show search results
    if (trendingContainer) {
        trendingContainer.innerHTML = '';
        trendingContainer.parentElement.style.display = 'none';
    }
    if (newContainer) {
        newContainer.innerHTML = '';
        newContainer.parentElement.style.display = 'none';
    }
    
    // Show search results container
    if (searchResultsContainer) {
        searchResultsContainer.style.display = 'block';
        
        if (!results || results.length === 0) {
            searchResultsContainer.innerHTML = `
                <div class="section-heading">
                    <div>
                        <p class="section-label">SEARCH RESULTS</p>
                        <h2>No results found for "${escapeHTML(currentSearchQuery)}"</h2>
                    </div>
                </div>
                <div class="no-results">
                    <div class="icon">🔍</div>
                    <p style="text-align:center;padding:20px 0;color:var(--text-secondary);">
                        Try different keywords or browse our genres below.
                    </p>
                </div>
            `;
            return;
        }

        searchResultsContainer.innerHTML = `
            <div class="section-heading">
                <div>
                    <p class="section-label">SEARCH RESULTS</p>
                    <h2>${results.length} results for "${escapeHTML(currentSearchQuery)}"</h2>
                </div>
                <button class="clear-search">✕ Clear Search</button>
            </div>
            <div class="novel-grid search-grid">
                ${results.map(novel => createNovelCard(novel)).join('')}
            </div>
        `;

        // Add clear search handler
        const clearBtn = searchResultsContainer.querySelector('.clear-search');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearSearch);
        }
    }
}

function createNovelCard(novel) {
    return `
        <article class="novel-card">
            <a href="novel.html?id=${encodeURIComponent(novel.id)}">
                <div class="novel-cover">
                    <h3>${escapeHTML(novel.title)}</h3>
                </div>
                <div class="novel-info">
                    <h3>${escapeHTML(novel.title)}</h3>
                    <p class="author">${escapeHTML(novel.author_name || 'Author')}</p>
                    <p class="rating">📚 ${escapeHTML(novel.genre || 'Story')}</p>
                    ${novel.relevance ? `<p class="relevance">Match: ${Math.round(novel.relevance * 100)}%</p>` : ''}
                </div>
            </a>
        </article>
    `;
}

function clearSearch() {
    currentSearchQuery = '';
    if (searchInput) searchInput.value = '';
    if (searchResultsContainer) {
        searchResultsContainer.innerHTML = '';
        searchResultsContainer.style.display = 'none';
    }
    if (trendingContainer) {
        trendingContainer.parentElement.style.display = 'block';
    }
    if (newContainer) {
        newContainer.parentElement.style.display = 'block';
    }
    if (searchPanel) {
        searchPanel.classList.remove('active');
    }
    loadPublishedNovels();
}

/* =====================================================
   GENRE FILTERING
   ===================================================== */

async function loadNovelsByGenre(genre) {
    const { data: novels, error } = await supabaseClient
        .from("novels")
        .select("*")
        .eq("status", "published")
        .eq("genre", genre)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Genre filter error:", error);
        showErrorMessage(trendingContainer, "Could not load novels.");
        return;
    }

    if (!novels || novels.length === 0) {
        showEmptyMessage(trendingContainer, `No ${genre} novels yet. Check back soon!`);
        showEmptyMessage(newContainer, `No new ${genre} releases yet.`);
        return;
    }

    // Update section titles
    const trendingLabel = document.querySelector('#trending .section-label');
    const trendingTitle = document.querySelector('#trending .section-heading h2');
    if (trendingLabel) trendingLabel.textContent = 'GENRE SELECTED';
    if (trendingTitle) trendingTitle.textContent = `🔥 ${genre} Novels`;

    displayTrending(novels.slice(0, 4));
    displayNewReleases(novels.slice(0, 6));
}

/* =====================================================
   GENRE BUTTON HANDLERS
   ===================================================== */

function setupGenreButtons() {
    genreButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from all
            genreButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Clear search
            clearSearch();
            
            // Set active genre
            activeGenre = this.dataset.genre || 'all';
            
            // Reset section titles
            const trendingLabel = document.querySelector('#trending .section-label');
            const trendingTitle = document.querySelector('#trending .section-heading h2');
            if (trendingLabel) trendingLabel.textContent = 'WHAT PEOPLE ARE READING';
            if (trendingTitle) trendingTitle.textContent = '🔥 Trending Novels';
            
            if (activeGenre === 'all') {
                loadPublishedNovels();
            } else {
                loadNovelsByGenre(activeGenre);
            }
        });
    });
}

/* =====================================================
   TRENDING DISPLAY
   ===================================================== */

function displayTrending(novels) {
    if (!trendingContainer) return;
    trendingContainer.innerHTML = "";
    
    novels.forEach(novel => {
        const card = document.createElement("article");
        card.className = "novel-card";
        card.innerHTML = `
            <a href="novel.html?id=${encodeURIComponent(novel.id)}">
                <div class="novel-cover">
                    <h3>${escapeHTML(novel.title)}</h3>
                </div>
                <div class="novel-info">
                    <h3>${escapeHTML(novel.title)}</h3>
                    <p class="author">${escapeHTML(novel.author_name || 'Author')}</p>
                    <p class="rating">📚 ${escapeHTML(novel.genre || 'Story')}</p>
                </div>
            </a>
        `;
        trendingContainer.appendChild(card);
    });
}

/* =====================================================
   NEW RELEASES DISPLAY
   ===================================================== */

function displayNewReleases(novels) {
    if (!newContainer) return;
    newContainer.innerHTML = "";
    
    novels.forEach(novel => {
        const item = document.createElement("article");
        item.className = "new-novel";
        item.innerHTML = `
            <div class="new-cover">${escapeHTML(novel.title)}</div>
            <div class="new-info">
                <h3>${escapeHTML(novel.title)}</h3>
                <p>${escapeHTML(novel.author_name || 'Author')}</p>
                <p>${escapeHTML(novel.genre || 'Story')}</p>
            </div>
            <button class="read-btn" data-novel-id="${novel.id}">View Novel</button>
        `;
        
        item.querySelector(".read-btn").addEventListener("click", function() {
            window.location.href = `novel.html?id=${encodeURIComponent(novel.id)}`;
        });
        
        newContainer.appendChild(item);
    });
}

/* =====================================================
   SEARCH PANEL TOGGLE
   ===================================================== */

if (searchBtn && searchPanel) {
    searchBtn.addEventListener("click", () => {
        searchPanel.classList.toggle("active");
        if (searchPanel.classList.contains('active')) {
            setTimeout(() => searchInput?.focus(), 100);
        }
    });
}

/* =====================================================
   SEARCH INPUT HANDLER
   ===================================================== */

if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                // Clear genre filter when searching
                activeGenre = 'all';
                genreButtons.forEach(b => b.classList.remove('active'));
                performSearch(query);
            } else if (query.length === 0) {
                clearSearch();
            }
        }, 300);
    });
    
    // Search on Enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query.length >= 2) {
                activeGenre = 'all';
                genreButtons.forEach(b => b.classList.remove('active'));
                performSearch(query);
                searchPanel.classList.remove('active');
            }
        }
    });
}

/* =====================================================
   EXPLORE BUTTON
   ===================================================== */

if (exploreBtn) {
    exploreBtn.addEventListener("click", () => {
        document.getElementById("trending").scrollIntoView({
            behavior: "smooth"
        });
    });
}

/* =====================================================
   HELPER FUNCTIONS
   ===================================================== */

function showErrorMessage(container, message) {
    if (!container) return;
    container.innerHTML = `<p style="color:#e74c3c;">${escapeHTML(message)}</p>`;
}

function showEmptyMessage(container, message) {
    if (!container) return;
    container.innerHTML = `<p style="color:var(--text-secondary);">${escapeHTML(message)}</p>`;
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

/* =====================================================
   START
   ===================================================== */

// Setup genre buttons
setupGenreButtons();

// Load initial novels
loadPublishedNovels();