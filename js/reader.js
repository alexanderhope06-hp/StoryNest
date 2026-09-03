/* =====================================================
   STORYNEST - READER (SIMPLE RELIABLE VERSION)
   ===================================================== */

/*
 * URL example:
 * reader.html?id=NOVEL_UUID&chapter=1
 */

/* =====================================================
   URL PARAMETERS
   ===================================================== */

const params = new URLSearchParams(window.location.search);
const novelId = params.get("id");
let chapterNumber = Number(params.get("chapter")) || 1;

let novel = null;
let chapters = [];
let currentPage = 0;
let totalPages = 1;

// Swipe tracking
let touchStartX = 0;
let touchEndX = 0;
let isSwiping = false;

/* =====================================================
   ELEMENTS
   ===================================================== */

const readerNovelTitle = document.getElementById("readerNovelTitle");
const chapterHeader = document.getElementById("chapterHeader");
const chapterNumberElement = document.getElementById("chapterNumber");
const chapterTitle = document.getElementById("chapterTitle");
const pageInner = document.getElementById("pageInner");
const previousButton = document.getElementById("previousChapter");
const nextButton = document.getElementById("nextChapter");
const progressBar = document.getElementById("readingProgress");
const chapterProgress = document.getElementById("chapterProgress");
const currentChapterNum = document.getElementById("currentChapterNum");
const totalChaptersEl = document.getElementById("totalChapters");

// Page elements
const currentPageDisplay = document.getElementById("currentPageDisplay");
const totalPagesDisplay = document.getElementById("totalPagesDisplay");
const pageViewer = document.getElementById("pageViewer");
const pageContentEl = document.getElementById("pageContent");
const swipeLeftHint = document.getElementById("swipeLeftHint");
const swipeRightHint = document.getElementById("swipeRightHint");

/* =====================================================
   START
   ===================================================== */

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking novel ID:", novelId);
    
    if (!novelId) {
        showError("No novel was selected.");
        return;
    }
    
    loadNovel();
});

/* =====================================================
   LOAD NOVEL
   ===================================================== */

async function loadNovel() {
    console.log("Loading novel...", novelId);
    
    try {
        // Load published novel
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
        console.log("Novel loaded:", novel.title);

        // Load chapters
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
        console.log("Chapters loaded:", chapters.length);

        if (chapters.length === 0) {
            showError("This novel does not have any chapters yet.");
            return;
        }

        if (totalChaptersEl) {
            totalChaptersEl.textContent = chapters.length;
        }

        // Validate chapter number
        if (chapterNumber < 1 || chapterNumber > chapters.length) {
            chapterNumber = 1;
            updateURL();
        }

        readerNovelTitle.textContent = novel.title;
        
        // Display the chapter
        displayChapter();
        
    } catch (error) {
        console.error("Load error:", error);
        showError("An unexpected error occurred.");
    }
}

/* =====================================================
   DISPLAY CHAPTER - SIMPLE VERSION
   ===================================================== */

function displayChapter() {
    console.log("Displaying chapter:", chapterNumber);
    
    const chapter = chapters[chapterNumber - 1];

    if (!chapter) {
        console.error("Chapter not found:", chapterNumber);
        showError("Chapter not found.");
        return;
    }

    console.log("Chapter data:", chapter);
    console.log("Chapter content:", chapter.content);

    // Update chapter info
    chapterNumberElement.textContent = chapter.chapter_number;
    if (currentChapterNum) {
        currentChapterNum.textContent = chapter.chapter_number;
    }

    chapterHeader.textContent = `Chapter ${chapter.chapter_number}`;
    chapterTitle.textContent = chapter.title;

    // Display content directly - NO SPLITTING
    displayContent(chapter.content);

    // Update navigation buttons
    previousButton.style.visibility = chapterNumber === 1 ? "hidden" : "visible";
    nextButton.textContent = chapterNumber === chapters.length ? "Finish →" : "Next →";

    document.title = `${chapter.title} — ${novel.title}`;

    updateURL();
    
    // Setup swipe after content loads
    setTimeout(setupSwipe, 300);
}

/* =====================================================
   DISPLAY CONTENT - DIRECT DISPLAY
   ===================================================== */

function displayContent(content) {
    if (!pageInner) {
        console.error("pageInner element not found");
        return;
    }
    
    // Clear the page
    pageInner.innerHTML = "";
    
    // If no content, show placeholder
    if (!content || content.trim().length === 0) {
        const p = document.createElement("p");
        p.textContent = "This chapter is empty.";
        p.className = "first-paragraph";
        pageInner.appendChild(p);
        return;
    }
    
    // DISPLAY CONTENT DIRECTLY - NO SPLITTING
    // Just show the content as it is, formatted nicely
    const contentText = content.trim();
    
    // Check if content has multiple paragraphs (has newlines)
    if (contentText.includes('\n\n')) {
        // Split by double newline for paragraphs
        const paragraphs = contentText.split(/\n\s*\n/);
        
        paragraphs.forEach((paragraph, index) => {
            const cleaned = paragraph.trim();
            if (!cleaned) return;
            
            const p = document.createElement("p");
            p.textContent = cleaned;
            
            if (index === 0) {
                p.classList.add("first-paragraph");
            } else {
                p.classList.add("indented");
            }
            
            pageInner.appendChild(p);
        });
    } else if (contentText.includes('\n')) {
        // Single newline - treat as line breaks within a paragraph
        const lines = contentText.split('\n');
        const p = document.createElement("p");
        p.className = "first-paragraph";
        p.textContent = lines.join(' ');
        pageInner.appendChild(p);
    } else {
        // Single paragraph
        const p = document.createElement("p");
        p.className = "first-paragraph";
        p.textContent = contentText;
        pageInner.appendChild(p);
    }
    
    // Set total pages to 1 (we're not splitting into pages)
    totalPages = 1;
    currentPage = 0;
    
    // Update display
    if (currentPageDisplay) {
        currentPageDisplay.textContent = "1";
    }
    if (totalPagesDisplay) {
        totalPagesDisplay.textContent = "1";
    }
    
    // Update progress bar to 100% since there's only one page
    if (progressBar) {
        progressBar.style.width = "100%";
    }
    
    // Hide swipe hints since there's only one page
    if (swipeLeftHint) {
        swipeLeftHint.style.display = 'none';
    }
    if (swipeRightHint) {
        swipeRightHint.style.display = 'none';
    }
    
    console.log("Content displayed successfully");
}

/* =====================================================
   SWIPE DETECTION
   ===================================================== */

function setupSwipe() {
    const viewer = pageViewer;
    if (!viewer) {
        console.error("Page viewer not found");
        return;
    }
    
    console.log("Setting up swipe...");
    
    // Remove existing listeners to avoid duplicates
    viewer.removeEventListener('touchstart', handleTouchStart);
    viewer.removeEventListener('touchmove', handleTouchMove);
    viewer.removeEventListener('touchend', handleTouchEnd);
    viewer.removeEventListener('click', handleClick);
    
    // Touch events for mobile
    viewer.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewer.addEventListener('touchmove', handleTouchMove, { passive: true });
    viewer.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Mouse events for desktop (click left/right)
    viewer.addEventListener('click', handleClick);
    
    // Keyboard events
    document.removeEventListener('keydown', handleKeyboard);
    document.addEventListener('keydown', handleKeyboard);
}

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
    isSwiping = true;
}

function handleTouchMove(e) {
    if (!isSwiping) return;
    touchEndX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    if (!isSwiping) return;
    isSwiping = false;
    
    const diff = touchStartX - touchEndX;
    const minSwipeDistance = 50;
    
    if (Math.abs(diff) < minSwipeDistance) {
        // Tap - check if on left or right half
        const rect = pageViewer.getBoundingClientRect();
        const tapX = e.changedTouches[0].clientX - rect.left;
        const halfWidth = rect.width / 2;
        
        if (tapX > halfWidth) {
            handlePageTurn('next');
        } else {
            handlePageTurn('prev');
        }
        return;
    }
    
    if (diff > 0) {
        // Swipe left - next chapter
        handlePageTurn('next');
    } else {
        // Swipe right - previous chapter
        handlePageTurn('prev');
    }
}

function handleClick(e) {
    const rect = pageViewer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const halfWidth = rect.width / 2;
    
    if (clickX > halfWidth) {
        handlePageTurn('next');
    } else {
        handlePageTurn('prev');
    }
}

function handleKeyboard(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        handlePageTurn('next');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePageTurn('prev');
    }
}

/* =====================================================
   HANDLE PAGE TURN - Now navigates chapters
   ===================================================== */

function handlePageTurn(direction) {
    console.log("Page turn:", direction);
    
    if (direction === 'next') {
        // Go to next chapter
        if (chapterNumber < chapters.length) {
            chapterNumber++;
            displayChapter();
        } else {
            // End of book - go to novel details
            window.location.href = `novel.html?id=${encodeURIComponent(novelId)}`;
        }
    } else {
        // Go to previous chapter
        if (chapterNumber > 1) {
            chapterNumber--;
            displayChapter();
        }
    }
}

/* =====================================================
   UPDATE URL
   ===================================================== */

function updateURL() {
    const newUrl = `reader.html?id=${encodeURIComponent(novelId)}&chapter=${chapterNumber}`;
    window.history.pushState({}, "", newUrl);
}

/* =====================================================
   BROWSER BACK / FORWARD
   ===================================================== */

window.addEventListener("popstate", () => {
    const currentParams = new URLSearchParams(window.location.search);
    chapterNumber = Number(currentParams.get("chapter")) || 1;

    if (chapterNumber < 1) chapterNumber = 1;
    if (chapters.length > 0 && chapterNumber > chapters.length) {
        chapterNumber = chapters.length;
    }

    if (chapters.length > 0) {
        displayChapter();
    }
});

/* =====================================================
   CHAPTER NAVIGATION BUTTONS
   ===================================================== */

nextButton.addEventListener("click", () => {
    if (chapterNumber < chapters.length) {
        chapterNumber++;
        displayChapter();
    } else {
        window.location.href = `novel.html?id=${encodeURIComponent(novelId)}`;
    }
});

previousButton.addEventListener("click", () => {
    if (chapterNumber > 1) {
        chapterNumber--;
        displayChapter();
    }
});

/* =====================================================
   ERROR DISPLAY
   ===================================================== */

function showError(message) {
    console.error("Error:", message);
    
    if (readerNovelTitle) {
        readerNovelTitle.textContent = "StoryNest";
    }

    if (pageInner) {
        pageInner.innerHTML = `
            <div class="reader-error">
                <div class="reader-error-icon">📖</div>
                <h3>Something went wrong</h3>
                <p>${escapeHTML(message)}</p>
                <a href="index.html" class="primary-btn" style="display:inline-block;margin-top:16px;">
                    Return Home
                </a>
            </div>
        `;
    }

    if (chapterTitle) {
        chapterTitle.textContent = "Unable to open story";
    }

    if (chapterHeader) {
        chapterHeader.textContent = "";
    }

    if (previousButton) {
        previousButton.style.visibility = "hidden";
    }

    if (nextButton) {
        nextButton.style.visibility = "hidden";
    }

    if (chapterProgress) {
        chapterProgress.style.display = "none";
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

// Setup swipe when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(setupSwipe, 500);
});

// Make functions available globally
window.displayChapter = displayChapter;
window.handlePageTurn = handlePageTurn;
window.setupSwipe = setupSwipe;