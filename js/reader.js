/* =====================================================
   STORYNEST - READER (PAGE-BY-PAGE WITH SWIPE)
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
let totalPages = 0;
let pageContent = [];

// Swipe tracking
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isSwiping = false;
let isPageViewerReady = false;

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
    if (!novelId) {
        showError("No novel was selected.");
    } else {
        loadNovel();
    }
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
        
        // Setup swipe after page loads
        setupSwipe();
        
        // Display the chapter
        displayChapter();
        
    } catch (error) {
        console.error("Load error:", error);
        showError("An unexpected error occurred.");
    }
}

/* =====================================================
   DISPLAY CHAPTER
   ===================================================== */

function displayChapter() {
    console.log("Displaying chapter:", chapterNumber);
    
    const chapter = chapters[chapterNumber - 1];

    if (!chapter) {
        console.error("Chapter not found:", chapterNumber);
        showError("Chapter not found.");
        return;
    }

    console.log("Chapter data:", chapter.title);

    // Update chapter info
    chapterNumberElement.textContent = chapter.chapter_number;
    if (currentChapterNum) {
        currentChapterNum.textContent = chapter.chapter_number;
    }

    chapterHeader.textContent = "Chapter " + chapter.chapter_number;
    chapterTitle.textContent = chapter.title;

    // Build content
    buildChapterContent(chapter);

    // Reset and calculate pages
    currentPage = 0;
    
    // Wait for DOM to update then calculate pages
    setTimeout(function() {
        calculatePages();
        updatePageDisplay();
        updateProgressBar();
        updateSwipeHints();
    }, 100);

    // Update navigation buttons
    previousButton.style.visibility = chapterNumber === 1 ? "hidden" : "visible";
    nextButton.textContent = chapterNumber === chapters.length ? "Finish →" : "Next →";

    document.title = chapter.title + " — " + novel.title;

    updateURL();
}

/* =====================================================
   BUILD CHAPTER CONTENT
   ===================================================== */

function buildChapterContent(chapter) {
    if (!pageInner) {
        console.error("pageInner element not found");
        return;
    }
    
    pageInner.innerHTML = "";
    
    const content = chapter.content || "";
    console.log("Content length:", content.length);
    
    if (!content || content.trim().length === 0) {
        const p = document.createElement("p");
        p.textContent = "This chapter is empty.";
        p.className = "first-paragraph";
        pageInner.appendChild(p);
        return;
    }
    
    // Split into paragraphs
    const paragraphs = content.split(/\n\s*\n/);
    console.log("Paragraphs found:", paragraphs.length);
    
    let hasContent = false;
    
    paragraphs.forEach(function(paragraph, index) {
        const cleaned = paragraph.trim();
        if (!cleaned) return;
        hasContent = true;
        
        const p = document.createElement("p");
        p.textContent = cleaned;
        
        if (index === 0) {
            p.classList.add("first-paragraph");
        } else {
            p.classList.add("indented");
        }
        
        pageInner.appendChild(p);
    });
    
    if (!hasContent) {
        const p = document.createElement("p");
        p.textContent = "This chapter is empty.";
        p.className = "first-paragraph";
        pageInner.appendChild(p);
    }
}

/* =====================================================
   CALCULATE PAGES
   ===================================================== */

function calculatePages() {
    console.log("Calculating pages...");
    
    if (!pageInner) {
        console.error("pageInner not found");
        return;
    }
    
    var paragraphs = pageInner.querySelectorAll('p');
    console.log("Paragraphs for pagination:", paragraphs.length);
    
    if (paragraphs.length === 0) {
        totalPages = 1;
        pageContent = [[0]];
        updatePageDisplay();
        return;
    }
    
    // Get the available height for content
    var viewerHeight = pageContentEl ? pageContentEl.clientHeight : 400;
    console.log("Viewer height:", viewerHeight);
    
    if (viewerHeight < 50) {
        console.log("Viewer height too small, retrying...");
        setTimeout(calculatePages, 200);
        return;
    }
    
    // Get computed styles
    var computedStyle = window.getComputedStyle(pageInner);
    var fontSize = parseFloat(computedStyle.fontSize) || 18;
    var lineHeight = parseFloat(computedStyle.lineHeight) || (fontSize * 1.9);
    var paragraphMargin = 12;
    var padding = 30;
    
    // Available height with padding
    var maxHeight = viewerHeight - padding;
    
    // Reset page content
    pageContent = [];
    var currentPageParagraphs = [];
    var currentHeight = 0;
    
    // Get page width for character counting
    var pageWidth = pageContentEl ? pageContentEl.clientWidth - 60 : 600;
    var avgCharsPerLine = Math.max(20, Math.floor(pageWidth / (fontSize * 0.55)));
    
    console.log("Page width:", pageWidth, "Avg chars per line:", avgCharsPerLine);
    
    // Calculate how many paragraphs fit per page
    for (var i = 0; i < paragraphs.length; i++) {
        var p = paragraphs[i];
        var text = p.textContent;
        var charCount = text.length;
        var lines = Math.max(1, Math.ceil(charCount / avgCharsPerLine));
        var height = (lines * lineHeight) + paragraphMargin;
        
        // If this paragraph alone is taller than the page, it gets its own page
        if (height > maxHeight && currentPageParagraphs.length === 0) {
            pageContent.push([i]);
            continue;
        }
        
        if (currentHeight + height > maxHeight && currentPageParagraphs.length > 0) {
            // Save current page
            pageContent.push(currentPageParagraphs.slice());
            currentPageParagraphs = [];
            currentHeight = 0;
        }
        
        currentPageParagraphs.push(i);
        currentHeight += height;
    }
    
    // Save last page
    if (currentPageParagraphs.length > 0) {
        pageContent.push(currentPageParagraphs.slice());
    }
    
    // If no pages were created, create at least one
    if (pageContent.length === 0) {
        pageContent = [[0]];
    }
    
    totalPages = pageContent.length;
    currentPage = Math.min(currentPage, totalPages - 1);
    
    console.log("Total pages:", totalPages);
    
    showPage(currentPage);
    updatePageDisplay();
    updateProgressBar();
    updateSwipeHints();
}

/* =====================================================
   SHOW PAGE
   ===================================================== */

function showPage(pageIndex) {
    console.log("Showing page:", pageIndex);
    
    if (!pageInner) return;
    if (pageIndex < 0 || pageIndex >= totalPages) return;
    
    currentPage = pageIndex;
    
    // Hide all paragraphs
    var paragraphs = pageInner.querySelectorAll('p');
    for (var i = 0; i < paragraphs.length; i++) {
        paragraphs[i].style.display = 'none';
        paragraphs[i].style.animation = 'none';
    }
    
    // Show only paragraphs for current page with animation
    var pageParagraphs = pageContent[currentPage] || [];
    
    for (var j = 0; j < pageParagraphs.length; j++) {
        var index = pageParagraphs[j];
        if (paragraphs[index]) {
            paragraphs[index].style.display = 'block';
            paragraphs[index].style.animation = 'fadeIn 0.3s ease ' + (j * 0.05) + 's both';
        }
    }
    
    updatePageDisplay();
    updateProgressBar();
    updateSwipeHints();
}

/* =====================================================
   PAGE NAVIGATION
   ===================================================== */

function nextPage() {
    if (currentPage < totalPages - 1) {
        showPage(currentPage + 1);
        return true;
    }
    return false;
}

function previousPage() {
    if (currentPage > 0) {
        showPage(currentPage - 1);
        return true;
    }
    return false;
}

function goToNextChapter() {
    if (chapterNumber < chapters.length) {
        chapterNumber++;
        displayChapter();
        return true;
    }
    return false;
}

function goToPreviousChapter() {
    if (chapterNumber > 1) {
        chapterNumber--;
        displayChapter();
        return true;
    }
    return false;
}

/* =====================================================
   UPDATE DISPLAY
   ===================================================== */

function updatePageDisplay() {
    if (currentPageDisplay) {
        currentPageDisplay.textContent = currentPage + 1;
    }
    if (totalPagesDisplay) {
        totalPagesDisplay.textContent = totalPages;
    }
}

function updateProgressBar() {
    if (!progressBar) return;
    var progress = ((currentPage + 1) / totalPages) * 100;
    progressBar.style.width = Math.min(progress, 100) + '%';
}

function updateSwipeHints() {
    if (swipeLeftHint) {
        swipeLeftHint.style.display = currentPage > 0 ? 'flex' : 'none';
    }
    if (swipeRightHint) {
        swipeRightHint.style.display = currentPage < totalPages - 1 ? 'flex' : 'none';
    }
}

/* =====================================================
   SWIPE DETECTION - OPTIMIZED FOR MOBILE
   ===================================================== */

function setupSwipe() {
    var viewer = pageViewer;
    if (!viewer) {
        console.error("Page viewer not found");
        return;
    }
    
    console.log("Setting up swipe...");
    isPageViewerReady = true;
    
    // Remove any existing listeners to prevent duplicates
    viewer.removeEventListener('touchstart', handleTouchStart);
    viewer.removeEventListener('touchmove', handleTouchMove);
    viewer.removeEventListener('touchend', handleTouchEnd);
    viewer.removeEventListener('click', handleClick);
    document.removeEventListener('keydown', handleKeyboard);
    
    // Touch events for mobile
    viewer.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewer.addEventListener('touchmove', handleTouchMove, { passive: true });
    viewer.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Mouse events for desktop
    viewer.addEventListener('click', handleClick);
    
    // Keyboard events
    document.addEventListener('keydown', handleKeyboard);
}

function handleTouchStart(e) {
    var touch = e.changedTouches[0];
    touchStartX = touch.screenX;
    touchStartY = touch.screenY;
    isSwiping = true;
}

function handleTouchMove(e) {
    if (!isSwiping) return;
    var touch = e.changedTouches[0];
    touchEndX = touch.screenX;
    touchEndY = touch.screenY;
}

function handleTouchEnd(e) {
    if (!isSwiping) return;
    isSwiping = false;
    
    var touch = e.changedTouches[0];
    var diffX = touchStartX - touchEndX;
    var diffY = touchStartY - touchEndY;
    
    // If horizontal swipe is more than vertical, handle as page turn
    if (Math.abs(diffX) > Math.abs(diffY)) {
        var minSwipeDistance = 40;
        
        if (Math.abs(diffX) < minSwipeDistance) {
            // Tap - check if on left or right half
            var rect = pageViewer.getBoundingClientRect();
            var tapX = touch.clientX - rect.left;
            var halfWidth = rect.width / 2;
            
            if (tapX > halfWidth) {
                handlePageTurn('next');
            } else {
                handlePageTurn('prev');
            }
            return;
        }
        
        if (diffX > 0) {
            // Swipe left - next page
            handlePageTurn('next');
        } else {
            // Swipe right - previous page
            handlePageTurn('prev');
        }
    }
}

function handleClick(e) {
    var rect = pageViewer.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    var halfWidth = rect.width / 2;
    
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
   HANDLE PAGE TURN
   ===================================================== */

function handlePageTurn(direction) {
    console.log("Page turn:", direction);
    
    if (direction === 'next') {
        // Try next page
        if (nextPage()) {
            return;
        }
        // Try next chapter
        if (goToNextChapter()) {
            return;
        }
        // End of book - go to novel details
        if (chapterNumber === chapters.length) {
            window.location.href = 'novel.html?id=' + encodeURIComponent(novelId);
        }
    } else {
        // Try previous page
        if (previousPage()) {
            return;
        }
        // Try previous chapter
        goToPreviousChapter();
    }
}

/* =====================================================
   WINDOW RESIZE - RECALCULATE PAGES
   ===================================================== */

var resizeTimeout;
window.addEventListener("resize", function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        if (chapters.length > 0) {
            calculatePages();
        }
    }, 300);
});

/* =====================================================
   UPDATE URL
   ===================================================== */

function updateURL() {
    var newUrl = 'reader.html?id=' + encodeURIComponent(novelId) + '&chapter=' + chapterNumber;
    window.history.pushState({}, "", newUrl);
}

/* =====================================================
   BROWSER BACK / FORWARD
   ===================================================== */

window.addEventListener("popstate", function() {
    var currentParams = new URLSearchParams(window.location.search);
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

nextButton.addEventListener("click", function() {
    if (chapterNumber < chapters.length) {
        chapterNumber++;
        displayChapter();
    } else {
        window.location.href = 'novel.html?id=' + encodeURIComponent(novelId);
    }
});

previousButton.addEventListener("click", function() {
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
    var div = document.createElement("div");
    div.textContent = value || "";
    return div.innerHTML;
}

// Export for menu functions
window.calculatePages = calculatePages;
window.showPage = showPage;
window.nextPage = nextPage;
window.previousPage = previousPage;
window.handlePageTurn = handlePageTurn;
window.displayChapter = displayChapter;
window.setupSwipe = setupSwipe;