/* =====================================================
   STORYNEST — SCROLLING READER WITH CHAPTER NAVIGATION
   ===================================================== */

const params = new URLSearchParams(window.location.search);
const novelId = params.get("id");
let chapterNumber = Number(params.get("chapter")) || 1;

let novel = null;
let chapters = [];
let currentChapterData = null;

/* =====================================================
   ELEMENTS
   ===================================================== */

const readerNovelTitle = document.getElementById("readerNovelTitle");
const chapterHeader = document.getElementById("chapterHeader");
const chapterTitle = document.getElementById("chapterTitle");
const readerPageContent = document.getElementById("readerPageContent");
const progressBar = document.getElementById("readingProgress");

/* =====================================================
   START
   ===================================================== */

if (!novelId) {
    showError("No novel was selected.");
} else {
    loadNovel();
}

/* =====================================================
   LOAD NOVEL
   ===================================================== */

async function loadNovel() {
    try {
        const { data: novelData, error: novelError } = await supabaseClient
            .from("novels")
            .select("*")
            .eq("id", novelId)
            .eq("status", "published")
            .single();

        if (novelError || !novelData) {
            console.error("Novel error:", novelError);
            showError("This novel could not be found.");
            return;
        }

        novel = novelData;

        const { data: chapterData, error: chapterError } = await supabaseClient
            .from("chapters")
            .select("*")
            .eq("novel_id", novelId)
            .order("chapter_number", { ascending: true });

        if (chapterError) {
            console.error("Chapter error:", chapterError);
            showError("Could not load the chapters.");
            return;
        }

        chapters = chapterData || [];

        if (chapters.length === 0) {
            showError("This novel does not have any chapters yet.");
            return;
        }

        // Ensure valid chapter number
        if (chapterNumber < 1 || chapterNumber > chapters.length) {
            chapterNumber = 1;
        }

        readerNovelTitle.textContent = novel.title;
        displayChapter();

    } catch (error) {
        console.error("Load error:", error);
        showError("Something went wrong loading this story.");
    }
}

/* =====================================================
   DISPLAY CHAPTER (Full scrollable content)
   ===================================================== */

function displayChapter() {
    const chapter = chapters[chapterNumber - 1];
    if (!chapter) return;

    currentChapterData = chapter;

    chapterHeader.textContent = `Chapter ${chapter.chapter_number}`;
    chapterTitle.textContent = chapter.title || "";
    document.title = `${chapter.title} — ${novel.title}`;

    // Build the full chapter HTML
    const content = chapter.content || "";
    const paragraphs = content
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

    let html = `<h1 id="chapterTitle">${escapeHTML(chapter.title || "")}</h1>`;
    html += `<div class="story" id="storyContent">`;
    paragraphs.forEach(p => {
        html += `<p>${escapeHTML(p)}</p>`;
    });
    html += `</div>`;

    readerPageContent.innerHTML = html;

    // Apply saved font size
    const savedSize = localStorage.getItem('readerFontSize');
    const fontSize = savedSize ? parseInt(savedSize) : 18;
    readerPageContent.style.fontSize = fontSize + 'px';
    readerPageContent.querySelectorAll('p').forEach(p => {
        p.style.fontSize = fontSize + 'px';
    });

    // Update URL
    updateURL();

    // Restore scroll position
    restoreScrollPosition();

    // Update progress bar on scroll
    updateProgressBar();

    // Scroll to top if new chapter
    window.scrollTo({ top: 0, behavior: 'instant' });
}

/* =====================================================
   SCROLL POSITION MANAGEMENT
   ===================================================== */

function saveScrollPosition() {
    if (!novelId || !currentChapterData) return;
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const percent = maxScroll > 0 ? scrollY / maxScroll : 0;

    localStorage.setItem(
        `storynest-scroll-${novelId}-${chapterNumber}`,
        JSON.stringify({ scrollY, percent, timestamp: Date.now() })
    );
}

function restoreScrollPosition() {
    if (!novelId) return;

    const saved = localStorage.getItem(`storynest-scroll-${novelId}-${chapterNumber}`);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            // Only restore if saved recently (within 30 days)
            if (data.timestamp && Date.now() - data.timestamp < 30 * 24 * 60 * 60 * 1000) {
                requestAnimationFrame(() => {
                    if (data.percent !== undefined && data.percent > 0) {
                        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                        window.scrollTo({ top: data.percent * maxScroll, behavior: 'instant' });
                    } else if (data.scrollY) {
                        window.scrollTo({ top: data.scrollY, behavior: 'instant' });
                    }
                });
            }
        } catch (e) {
            // Ignore parse errors
        }
    }
}

/* =====================================================
   PROGRESS BAR
   ===================================================== */

function updateProgressBar() {
    if (!progressBar) return;
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 100;
    progressBar.style.width = `${progress}%`;
}

/* =====================================================
   CHAPTER NAVIGATION
   ===================================================== */

function nextChapter() {
    if (chapterNumber < chapters.length) {
        chapterNumber++;
        displayChapter();
    } else {
        // At last chapter - go to novel details
        window.location.href = `novel.html?id=${encodeURIComponent(novelId)}`;
    }
}

function previousChapter() {
    if (chapterNumber > 1) {
        chapterNumber--;
        displayChapter();
    }
}

/* =====================================================
   KEYBOARD NAVIGATION (Arrow keys for chapters)
   ===================================================== */

document.addEventListener("keydown", function(event) {
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;

    // Left arrow / Up arrow = previous chapter
    if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousChapter();
    }

    // Right arrow / Down arrow = next chapter
    if (event.key === "ArrowRight") {
        event.preventDefault();
        nextChapter();
    }

    // PageUp / PageDown still work for scrolling
    if (event.key === "PageUp" || event.key === "PageDown") {
        // Let default scrolling happen
        return;
    }
});

/* =====================================================
   SWIPE NAVIGATION (Horizontal swipe = chapter change)
   ===================================================== */

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isSwiping = false;

document.addEventListener("touchstart", function(event) {
    if (!event.touches.length) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchStartTime = Date.now();
    isSwiping = false;
}, { passive: true });

document.addEventListener("touchmove", function(event) {
    if (!event.touches.length) return;
    
    const deltaX = Math.abs(event.touches[0].clientX - touchStartX);
    const deltaY = Math.abs(event.touches[0].clientY - touchStartY);
    
    // If horizontal movement is greater than vertical, it's a swipe
    if (deltaX > deltaY && deltaX > 10) {
        isSwiping = true;
    }
}, { passive: true });

document.addEventListener("touchend", function(event) {
    if (!event.changedTouches.length) return;
    
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const deltaTime = Date.now() - touchStartTime;
    
    // Only trigger if it's a quick horizontal swipe
    if (deltaTime > 500) return; // Too slow, probably scrolling
    if (Math.abs(deltaX) < 50) return; // Too small
    if (Math.abs(deltaX) < Math.abs(deltaY)) return; // Mostly vertical
    
    // Prevent default only for horizontal swipes
    if (isSwiping) {
        if (deltaX < 0) {
            // Swiped left = next chapter
            nextChapter();
        } else {
            // Swiped right = previous chapter
            previousChapter();
        }
    }
}, { passive: true });

/* =====================================================
   BUTTON NAVIGATION (for desktop)
   ===================================================== */

// Add navigation buttons if they don't exist
function createNavigationButtons() {
    const existing = document.querySelector('.chapter-nav-buttons');
    if (existing) return;

    const nav = document.createElement('div');
    nav.className = 'chapter-nav-buttons';
    nav.innerHTML = `
        <button class="chapter-nav-btn prev-btn" onclick="previousChapter()" title="Previous Chapter (←)">
            ← Previous
        </button>
        <button class="chapter-nav-btn next-btn" onclick="nextChapter()" title="Next Chapter (→)">
            Next →
        </button>
    `;
    
    // Insert after the reader container
    const container = document.querySelector('.reader-container');
    if (container) {
        container.appendChild(nav);
    }
}

/* =====================================================
   SCROLL LISTENER
   ===================================================== */

let scrollTimeout;
window.addEventListener('scroll', function() {
    // Update progress bar immediately
    updateProgressBar();
    
    // Debounce save scroll position
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(saveScrollPosition, 200);
}, { passive: true });

/* =====================================================
   RESIZE
   ===================================================== */

let resizeTimer;
window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        // Re-apply font size on resize
        const savedSize = localStorage.getItem('readerFontSize');
        const fontSize = savedSize ? parseInt(savedSize) : 18;
        if (readerPageContent) {
            readerPageContent.style.fontSize = fontSize + 'px';
            readerPageContent.querySelectorAll('p').forEach(p => {
                p.style.fontSize = fontSize + 'px';
            });
        }
        updateProgressBar();
    }, 200);
});

/* =====================================================
   URL
   ===================================================== */

function updateURL() {
    const newURL = `reader.html?id=${encodeURIComponent(novelId)}&chapter=${chapterNumber}`;
    window.history.replaceState({}, "", newURL);
}

window.addEventListener("popstate", function() {
    const currentParams = new URLSearchParams(window.location.search);
    const newChapter = Number(currentParams.get("chapter")) || 1;
    if (newChapter !== chapterNumber && newChapter >= 1 && newChapter <= chapters.length) {
        chapterNumber = newChapter;
        displayChapter();
    }
});

/* =====================================================
   INITIALIZATION
   ===================================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Create navigation buttons
    setTimeout(createNavigationButtons, 100);
});

/* =====================================================
   ERROR
   ===================================================== */

function showError(message) {
    if (readerNovelTitle) readerNovelTitle.textContent = "StoryNest";
    if (chapterTitle) chapterTitle.textContent = "Unable to open story";
    if (readerPageContent) {
        readerPageContent.innerHTML = `
            <div style="text-align:center;padding:80px 20px;">
                <div style="font-size:4rem;margin-bottom:20px;">📖</div>
                <h3 style="font-size:1.5rem;margin-bottom:12px;">Something went wrong</h3>
                <p style="color:#888;margin-bottom:16px;">${escapeHTML(message)}</p>
                <a href="index.html" class="primary-btn" style="display:inline-block;">Return Home</a>
            </div>
        `;
    }
}

/* =====================================================
   HTML SAFETY
   ===================================================== */

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

// Make functions globally available
window.nextChapter = nextChapter;
window.previousChapter = previousChapter;