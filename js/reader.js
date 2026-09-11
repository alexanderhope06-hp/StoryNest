/* =====================================================
   STORYNEST — PAGE BASED READER
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
   SCROLL LOCK — keep content pinned at top
   ===================================================== */

function lockContentScroll() {
    if (!readerPageContent) return;
    readerPageContent.scrollTop = 0;
    readerPageContent.scrollLeft = 0;

    // If any ancestor scrolls, snap it back
    let el = readerPageContent.parentElement;
    while (el) {
        if (el.scrollTop) el.scrollTop = 0;
        if (el.scrollLeft) el.scrollLeft = 0;
        el = el.parentElement;
    }
    // And document itself
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

// Snap back on any scroll attempt (wheel, touch, keyboard, programmatic)
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
   BUILD PAGES — LINE COUNTING METHOD
   ===================================================== */

// How many lines to sacrifice per page as a safety margin
const LINE_SAFETY_MARGIN = 4;

function buildPages(chapter) {
    pages = [];
    const content = chapter.content || "";

    const contentEl = document.querySelector(".reader-page-content");
    if (!contentEl) return;

    // Reset for measurement
    contentEl.innerHTML = "";

    // ---- 1. Chapter title ----
    const titleEl = document.createElement("h1");
    titleEl.className = "page-chapter-title";
    titleEl.textContent = chapter.title || "";
    contentEl.appendChild(titleEl);

    // ---- 2. Paragraphs ----
    const paragraphs = content
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

    for (const para of paragraphs) {
        const p = document.createElement("p");
        const words = para.split(/\s+/).filter(Boolean);
        words.forEach((word, i) => {
            const span = document.createElement("span");
            span.textContent = word;
            p.appendChild(span);
            if (i < words.length - 1) {
                p.appendChild(document.createTextNode(" "));
            }
        });
        contentEl.appendChild(p);
    }

    // ---- 3. Available height in LINES ----
    const cs = getComputedStyle(contentEl);
    const lineHeightPx = parseFloat(cs.lineHeight);
    const fontSizePx   = parseFloat(cs.fontSize);
    const realLineHeight = isNaN(lineHeightPx) ? fontSizePx * 1.75 : lineHeightPx;

    const padTop    = parseFloat(cs.paddingTop)    || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    const boxHeight = contentEl.getBoundingClientRect().height - padTop - padBottom;

    const maxLines = Math.max(
        3,
        Math.floor(boxHeight / realLineHeight) - LINE_SAFETY_MARGIN
    );

    // ---- 4. Distribute words across pages ----
    contentEl.innerHTML = "";

    let currentPageBlocks = [];
    let currentPageLines = 0;

    if (chapter.title) {
        currentPageBlocks.push({ type: "title", text: chapter.title });
        currentPageLines += 2; // title conservatively = 2 lines
    }

    function countLines(text, isTitle) {
        const probe = document.createElement(isTitle ? "h1" : "p");
        if (isTitle) probe.className = "page-chapter-title";
        probe.style.cssText = "visibility:hidden;position:absolute;left:-99999px;top:0;";
        probe.style.width = contentEl.clientWidth + "px";
        probe.style.fontSize = cs.fontSize;
        probe.style.lineHeight = cs.lineHeight;
        probe.style.fontFamily = cs.fontFamily;
        probe.textContent = text;
        document.body.appendChild(probe);

        const range = document.createRange();
        range.selectNodeContents(probe);
        const rects = range.getClientRects();
        const tops = new Set();
        for (const r of rects) {
            if (r.height > 0) tops.add(Math.round(r.top));
        }
        const lineCount = Math.max(1, tops.size);

        probe.remove();
        return lineCount;
    }

    function renderBlocks(blocks) {
        return blocks.map(b => {
            if (b.type === "title") {
                return `<h1 class="page-chapter-title">${escapeHTML(b.text)}</h1>`;
            }
            return `<p>${escapeHTML(b.text)}</p>`;
        }).join("");
    }

    function flushPage() {
        if (currentPageBlocks.length === 0) return;
        pages.push(renderBlocks(currentPageBlocks));
        currentPageBlocks = [];
        currentPageLines = 0;
    }

    for (const para of paragraphs) {
        const words = para.split(/\s+/).filter(Boolean);
        let buffer = "";
        let bufferLines = 0;

        for (let i = 0; i < words.length; i++) {
            const candidate = buffer ? buffer + " " + words[i] : words[i];
            const candidateLines = countLines(candidate, false);

            if (currentPageLines + candidateLines <= maxLines) {
                buffer = candidate;
                bufferLines = candidateLines;
            } else {
                if (buffer) {
                    currentPageBlocks.push({ type: "para", text: buffer });
                    currentPageLines += bufferLines;
                }
                flushPage();

                buffer = words[i];
                bufferLines = countLines(buffer, false);
                currentPageLines = bufferLines;
            }
        }

        if (buffer) {
            currentPageBlocks.push({ type: "para", text: buffer });
            currentPageLines += bufferLines;
        }
    }

    flushPage();

    // ---- 5. Fallback ----
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

    // HARD LOCK — force content to top
    lockContentScroll();
    // And again next frame in case layout shifted
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
   REBUILD (used by font-size changes)
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