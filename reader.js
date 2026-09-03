/* =====================================================
   STORYNEST - READER (COMPLETE WITH PAGE MODE)
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

/* =====================================================
   ELEMENTS
   ===================================================== */

const readerNovelTitle = document.getElementById("readerNovelTitle");
const chapterHeader = document.getElementById("chapterHeader");
const chapterNumberElement = document.getElementById("chapterNumber");
const chapterTitle = document.getElementById("chapterTitle");
const storyContent = document.getElementById("storyContent");
const previousButton = document.getElementById("previousChapter");
const nextButton = document.getElementById("nextChapter");
const progressBar = document.getElementById("readingProgress");
const chapterProgress = document.getElementById("chapterProgress");
const currentChapterNum = document.getElementById("currentChapterNum");
const totalChaptersEl = document.getElementById("totalChapters");

// Page mode elements
const pageIndicator = document.getElementById("pageIndicator");
const currentPageDisplay = document.getElementById("currentPageDisplay");
const totalPagesDisplay = document.getElementById("totalPagesDisplay");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");

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

    if (chapters.length === 0) {
        showError("This novel does not have any chapters yet.");
        return;
    }

    if (totalChaptersEl) {
        totalChaptersEl.textContent = chapters.length;
    }

    if (chapterNumber < 1 || chapterNumber > chapters.length) {
        chapterNumber = 1;
        updateURL();
    }

    readerNovelTitle.textContent = novel.title;
    displayChapter();
}

/* =====================================================
   DISPLAY CHAPTER
   ===================================================== */

function displayChapter() {

    const chapter = chapters[chapterNumber - 1];

    if (!chapter) {
        return;
    }

    // Update chapter info
    chapterNumberElement.textContent = chapter.chapter_number;
    if (currentChapterNum) {
        currentChapterNum.textContent = chapter.chapter_number;
    }

    chapterHeader.textContent = `Chapter ${chapter.chapter_number}`;
    chapterTitle.textContent = chapter.title;

    // Build content with proper novel formatting
    buildChapterContent(chapter);

    // Reset page mode
    currentPage = 0;
    calculatePages();

    // Update navigation
    previousButton.style.visibility = chapterNumber === 1 ? "hidden" : "visible";
    nextButton.textContent = chapterNumber === chapters.length ? "Finish →" : "Next →";

    document.title = `${chapter.title} — ${novel.title}`;

    if (progressBar) {
        progressBar.style.width = "0%";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    updateURL();
}

/* =====================================================
   BUILD CHAPTER CONTENT - NOVEL-STANDARD FORMATTING
   ===================================================== */

function buildChapterContent(chapter) {
    storyContent.innerHTML = "";
    
    const content = chapter.content || "";
    
    // Split into paragraphs (double newline separates paragraphs)
    const paragraphs = content.split(/\n\s*\n/);
    
    paragraphs.forEach((paragraph, index) => {
        const cleaned = paragraph.trim();
        if (!cleaned) return;
        
        const p = document.createElement("p");
        p.textContent = cleaned;
        
        // First paragraph no indent (standard novel formatting)
        if (index === 0) {
            p.classList.add("first-paragraph");
        } else {
            p.classList.add("indented");
        }
        
        storyContent.appendChild(p);
    });
}

/* =====================================================
   PAGE MODE - CALCULATE PAGES
   ===================================================== */

function calculatePages() {
    if (!storyContent) return;
    
    const container = document.querySelector('.story-wrapper');
    if (!container) return;
    
    // Get all paragraphs
    const paragraphs = storyContent.querySelectorAll('p');
    if (paragraphs.length === 0) {
        totalPages = 1;
        updatePageDisplay();
        return;
    }
    
    // Get the container height for one page
    const containerHeight = container.clientHeight;
    if (containerHeight === 0) {
        // If container not visible yet, retry after a moment
        setTimeout(calculatePages, 200);
        return;
    }
    
    // Clone paragraphs to measure
    const cloneContainer = document.createElement('div');
    cloneContainer.style.cssText = `
        position: absolute;
        visibility: hidden;
        width: ${container.clientWidth}px;
        font-size: ${storyContent.style.fontSize || '18px'};
        line-height: 1.9;
        padding: 20px;
    `;
    document.body.appendChild(cloneContainer);
    
    // Reset page content
    pageContent = [];
    let currentPageParagraphs = [];
    let currentHeight = 0;
    const maxHeight = containerHeight - 40; // Account for padding
    
    // Calculate how many paragraphs fit per page
    paragraphs.forEach((p, index) => {
        const clone = document.createElement('p');
        clone.textContent = p.textContent;
        clone.style.cssText = p.style.cssText;
        clone.className = p.className;
        cloneContainer.appendChild(clone);
        
        const height = clone.offsetHeight;
        const marginBottom = 24; // Approximate margin
        
        if (currentHeight + height + marginBottom > maxHeight && currentPageParagraphs.length > 0) {
            // Save current page
            pageContent.push([...currentPageParagraphs]);
            currentPageParagraphs = [];
            currentHeight = 0;
        }
        
        currentPageParagraphs.push(index);
        currentHeight += height + marginBottom;
    });
    
    // Save last page
    if (currentPageParagraphs.length > 0) {
        pageContent.push([...currentPageParagraphs]);
    }
    
    // Clean up
    document.body.removeChild(cloneContainer);
    
    totalPages = pageContent.length || 1;
    currentPage = 0;
    updatePageDisplay();
    showPage(0);
}

/* =====================================================
   PAGE MODE - SHOW PAGE
   ===================================================== */

function showPage(pageIndex) {
    if (!storyContent) return;
    if (pageIndex < 0 || pageIndex >= totalPages) return;
    
    currentPage = pageIndex;
    
    // Hide all paragraphs
    const paragraphs = storyContent.querySelectorAll('p');
    paragraphs.forEach(p => {
        p.style.display = 'none';
    });
    
    // Show only paragraphs for current page
    const pageParagraphs = pageContent[currentPage] || [];
    pageParagraphs.forEach(index => {
        if (paragraphs[index]) {
            paragraphs[index].style.display = 'block';
        }
    });
    
    updatePageDisplay();
    
    // Update progress bar
    if (progressBar) {
        const progress = ((currentPage + 1) / totalPages) * 100;
        progressBar.style.width = `${progress}%`;
    }
}

/* =====================================================
   PAGE MODE - NAVIGATION
   ===================================================== */

function nextPage() {
    if (currentPage < totalPages - 1) {
        showPage(currentPage + 1);
    }
}

function previousPage() {
    if (currentPage > 0) {
        showPage(currentPage - 1);
    }
}

/* =====================================================
   UPDATE PAGE DISPLAY
   ===================================================== */

function updatePageDisplay() {
    const displayText = `Page ${currentPage + 1} of ${totalPages}`;
    if (pageIndicator) {
        pageIndicator.textContent = displayText;
    }
    if (currentPageDisplay) {
        currentPageDisplay.textContent = currentPage + 1;
    }
    if (totalPagesDisplay) {
        totalPagesDisplay.textContent = totalPages;
    }
    
    // Update button states
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage === 0;
        prevPageBtn.style.opacity = currentPage === 0 ? '0.3' : '1';
    }
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage === totalPages - 1;
        nextPageBtn.style.opacity = currentPage === totalPages - 1 ? '0.3' : '1';
    }
}

/* =====================================================
   KEYBOARD NAVIGATION - UPDATED FOR PAGE MODE
   ===================================================== */

document.addEventListener("keydown", (e) => {
    // Page mode navigation
    if (pageMode) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
            e.preventDefault();
            if (currentPage < totalPages - 1) {
                nextPage();
            } else if (chapterNumber < chapters.length) {
                chapterNumber++;
                displayChapter();
            }
            return;
        }
        
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            if (currentPage > 0) {
                previousPage();
            } else if (chapterNumber > 1) {
                chapterNumber--;
                displayChapter();
            }
            return;
        }
    }
    
    // Legacy scroll mode navigation
    if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (chapterNumber > 1) {
            chapterNumber--;
            displayChapter();
            e.preventDefault();
        }
    }
    
    if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (chapterNumber < chapters.length) {
            chapterNumber++;
            displayChapter();
            e.preventDefault();
        } else if (chapterNumber === chapters.length) {
            window.location.href = `novel.html?id=${encodeURIComponent(novelId)}`;
        }
    }
});

/* =====================================================
   CHAPTER NAVIGATION
   ===================================================== */

nextButton.addEventListener("click", () => {
    if (chapterNumber < chapters.length) {
        chapterNumber++;
        displayChapter();
        return;
    }
    window.location.href = `novel.html?id=${encodeURIComponent(novelId)}`;
});

previousButton.addEventListener("click", () => {
    if (chapterNumber > 1) {
        chapterNumber--;
        displayChapter();
    }
});

/* =====================================================
   WINDOW RESIZE - RECALCULATE PAGES
   ===================================================== */

let resizeTimeout;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (pageMode) {
            calculatePages();
        }
    }, 300);
});

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

    displayChapter();
});

/* =====================================================
   ERROR DISPLAY
   ===================================================== */

function showError(message) {
    if (readerNovelTitle) {
        readerNovelTitle.textContent = "StoryNest";
    }

    if (storyContent) {
        storyContent.innerHTML = `
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
    
    // Hide page controls
    const pageControls = document.getElementById('pageControls');
    if (pageControls) {
        pageControls.style.display = 'none';
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

// Export for menu functions
window.pageMode = pageMode;
window.nextPage = nextPage;
window.previousPage = previousPage;
window.calculatePages = calculatePages;
window.showPage = showPage;