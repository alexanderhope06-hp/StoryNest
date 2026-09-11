/* =====================================================
   STORYNEST — PAGE BASED READER (FINAL)
   ===================================================== */

const params = new URLSearchParams(window.location.search);
const novelId = params.get("id");
let chapterNumber = Number(params.get("chapter")) || 1;

let novel = null;
let chapters = [];
let pages = [];
let currentPage = 0;

/* =====================================================
   ELEMENTS
   ===================================================== */

const readerNovelTitle = document.getElementById("readerNovelTitle");
const chapterHeader = document.getElementById("chapterHeader");
const chapterTitle = document.getElementById("chapterTitle");
const readerPageContent = document.getElementById("readerPageContent");
const progressBar = document.getElementById("readingProgress");

/* =====================================================
   SCROLL LOCK
   ===================================================== */

function lockContentScroll() {
    if (!readerPageContent) return;
    readerPageContent.scrollTop = 0;
    readerPageContent.scrollLeft = 0;

    let el = readerPageContent.parentElement;
    while (el) {
        if (el.scrollTop) el.scrollTop = 0;
        if (el.scrollLeft) el.scrollLeft = 0;
        el = el.parentElement;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

window.addEventListener('scroll', lockContentScroll, { passive: true });
document.addEventListener('scroll', lockContentScroll, { passive: true, capture: true });

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
   DISPLAY CHAPTER
   ===================================================== */

function displayChapter() {
    const chapter = chapters[chapterNumber - 1];
    if (!chapter) return;

    chapterHeader.textContent = `Chapter ${chapter.chapter_number}`;
    chapterTitle.textContent = chapter.title || "";
    document.title = `${chapter.title} — ${novel.title}`;

    buildPages(chapter);
    currentPage = 0;
    updateURL();
    showPage();
}

/* =====================================================
   BUILD PAGES — MEASURE ON REAL ELEMENT
   ===================================================== */

// Safety margin: reserve this many lines at the bottom of every page
const LINE_SAFETY_MARGIN = 4;

function buildPages(chapter) {
    pages = [];
    const content = chapter.content || "";

    const contentEl = readerPageContent;
    if (!contentEl) return;

    // Apply the user's font size before measuring
    const savedSize = localStorage.getItem('readerFontSize');
    const fontSize = savedSize ? parseInt(savedSize) : 18;
    contentEl.style.fontSize = fontSize + 'px';

    // Reset
    contentEl.innerHTML = "";

    // ---- Compute the visible height in lines (for safety margin) ----
    const cs = getComputedStyle(contentEl);
    const fontSizePx = parseFloat(cs.fontSize) || 18;
    const lineHeightRaw = parseFloat(cs.lineHeight);
    const lineHeightPx = isNaN(lineHeightRaw) ? fontSizePx * 1.75 : lineHeightRaw;
    const safetyPx = lineHeightPx * LINE_SAFETY_MARGIN;

    // The real, visible height of the content box
    const visibleHeight = contentEl.clientHeight;

    // Maximum allowed content height per page
    const maxContentHeight = Math.max(lineHeightPx * 3, visibleHeight - safetyPx);

    // ---- Paragraphs ----
    const paragraphs = content
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

    // ---- Helper: does current DOM fit? ----
    function fits() {
        return contentEl.scrollHeight <= maxContentHeight;
    }

    // ---- Helper: snapshot current DOM as a page string ----
    function snapshot() {
        return contentEl.innerHTML;
    }

    // ---- Page 1 starts with the chapter title ----
    const titleText = chapter.title || "";
    contentEl.innerHTML = titleText
        ? `<h1 class="page-chapter-title">${escapeHTML(titleText)}</h1>`
        : "";

    let currentPageHTML = snapshot();

    // ---- Helper: finalize current page and start a new one ----
    function flushCurrentPage() {
        pages.push(currentPageHTML);
    }

    function startNewPage() {
        contentEl.innerHTML = "";
        currentPageHTML = "";
    }

    // ---- Main loop: append paragraph by paragraph, word by word ----
    for (const para of paragraphs) {
        const words = para.split(/\s+/).filter(Boolean);
        let buffer = "";

        // First: try to append the whole paragraph at once (fast path)
        const wholeHTML = `<p>${escapeHTML(para)}</p>`;
        const before = contentEl.innerHTML;
        contentEl.innerHTML = before + wholeHTML;

        if (fits()) {
            // Whole paragraph fits — commit it
            currentPageHTML = snapshot();
            continue;
        }

        // Doesn't fit — fall back to word-by-word within this paragraph
        contentEl.innerHTML = before;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const candidate = buffer ? buffer + " " + word : word;
            const candidateHTML = `<p>${escapeHTML(candidate)}</p>`;

            contentEl.innerHTML = currentPageHTML + candidateHTML;

            if (fits()) {
                buffer = candidate;
            } else {
                // Candidate doesn't fit.
                // 1. Commit buffer (if any) to this page
                if (buffer) {
                    currentPageHTML += `<p>${escapeHTML(buffer)}</p>`;
                    contentEl.innerHTML = currentPageHTML;
                }

                // 2. Flush the page
                flushCurrentPage();
                startNewPage();

                // 3. Start new page with this word
                buffer = word;
                currentPageHTML = `<p>${escapeHTML(word)}</p>`;
                contentEl.innerHTML = currentPageHTML;
            }
        }

        // Commit the paragraph's buffer to the current page
        if (buffer) {
            // If currentPageHTML doesn't already include it, add it
            const tail = `<p>${escapeHTML(buffer)}</p>`;
            if (!currentPageHTML.endsWith(tail)) {
                currentPageHTML += tail;
                contentEl.innerHTML = currentPageHTML;
            }
        }
    }

    // ---- Flush the last page ----
    if (currentPageHTML && currentPageHTML.trim()) {
        pages.push(currentPageHTML);
    }

    // ---- Clear content element ----
    contentEl.innerHTML = "";

    // ---- Fallback ----
    if (pages.length === 0) {
        pages.push(
            `<h1 class="page-chapter-title">${escapeHTML(chapter.title || "")}</h1>` +
            `<p>No content available.</p>`
        );
    }
}

/* =====================================================
   SHOW PAGE
   ===================================================== */

function showPage() {
    if (!pages.length) return;

    const savedSize = localStorage.getItem('readerFontSize');
    const fontSize = savedSize ? parseInt(savedSize) : 18;

    readerPageContent.style.fontSize = fontSize + 'px';
    readerPageContent.innerHTML = pages[currentPage];

    lockContentScroll();
    requestAnimationFrame(lockContentScroll);

    if (progressBar) {
        const progress = ((currentPage + 1) / pages.length) * 100;
        progressBar.style.width = `${progress}%`;
    }

    localStorage.setItem(
        `storynest-progress-${novelId}-${chapterNumber}`,
        currentPage
    );
}

/* =====================================================
   REBUILD (for font-size changes)
   ===================================================== */

window.rebuildReaderPages = function () {
    if (!chapters.length) return;
    const chapter = chapters[chapterNumber - 1];
    if (!chapter) return;
    const savedPage = currentPage;
    buildPages(chapter);
    currentPage = Math.min(savedPage, pages.length - 1);
    showPage();
};

/* =====================================================
   NAVIGATION
   ===================================================== */

function nextPage() {
    if (currentPage < pages.length - 1) {
        currentPage++;
        showPage();
        return;
    }

    if (chapterNumber < chapters.length) {
        chapterNumber++;
        displayChapter();
        return;
    }

    window.location.href = `novel.html?id=${encodeURIComponent(novelId)}`;
}

function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        showPage();
        return;
    }

    if (chapterNumber > 1) {
        chapterNumber--;
        displayChapter();
        setTimeout(() => {
            currentPage = pages.length - 1;
            showPage();
        }, 50);
    }
}

/* =====================================================
   KEYBOARD
   ===================================================== */

document.addEventListener("keydown", function(event) {
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        nextPage();
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        previousPage();
    }

    if (event.key === " " && event.target === document.body) {
        event.preventDefault();
        nextPage();
    }
});

/* =====================================================
   TOUCH / SWIPE
   ===================================================== */

let touchStartX = 0;
let touchStartY = 0;

document.addEventListener("touchstart", function(event) {
    if (!event.touches.length) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}, { passive: true });

document.addEventListener("touchend", function(event) {
    if (!event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX < 0) nextPage();
    if (deltaX > 0) previousPage();
}, { passive: true });

/* =====================================================
   TAP
   ===================================================== */

document.addEventListener("click", function(event) {
    if (event.target.closest("button, a, .reader-dropdown, .reader-menu-btn")) return;

    const width = window.innerWidth;
    if (event.clientX < width * 0.30) {
        previousPage();
    } else if (event.clientX > width * 0.70) {
        nextPage();
    }
});

/* =====================================================
   RESIZE
   ===================================================== */

let resizeTimer;
window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        const oldPage = currentPage;
        displayChapter();
        if (pages.length) {
            currentPage = Math.min(oldPage, pages.length - 1);
            showPage();
        }
    }, 300);
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
   RESTORE POSITION
   ===================================================== */

let positionRestored = false;

const originalShowPage = showPage;
showPage = function() {
    originalShowPage();
    if (!positionRestored) {
        const saved = localStorage.getItem(`storynest-progress-${novelId}-${chapterNumber}`);
        if (saved !== null) {
            const pos = parseInt(saved);
            if (pos >= 0 && pos < pages.length && pos !== currentPage) {
                setTimeout(() => {
                    currentPage = pos;
                    originalShowPage();
                    positionRestored = true;
                }, 100);
            } else {
                positionRestored = true;
            }
        } else {
            positionRestored = true;
        }
    }
};

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
                <h3 style="font-size:1.5rem;margin-bottom:12px;color:#222;">Something went wrong</h3>
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