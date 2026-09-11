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

    // ---- Reset the content element for measurement ----
    contentEl.innerHTML = "";

    // ---- 1. Render chapter title ----
    const titleEl = document.createElement("h1");
    titleEl.className = "page-chapter-title";
    titleEl.textContent = chapter.title || "";
    contentEl.appendChild(titleEl);

    // ---- 2. Render every paragraph as <p> with inline <span> words ----
    const paragraphs = content
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

    const paraEls = [];
    for (const para of paragraphs) {
        const p = document.createElement("p");
        // Wrap each word in a span so we can measure line breaks
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
        paraEls.push(p);
    }

    // ---- 3. Measure available height in LINES ----
    const lineHeightPx = parseFloat(getComputedStyle(contentEl).lineHeight);
    // lineHeight may be "normal" → compute from font-size
    const fontSizePx = parseFloat(getComputedStyle(contentEl).fontSize);
    const realLineHeight = isNaN(lineHeightPx) ? fontSizePx * 1.75 : lineHeightPx;

    // Real content box height
    const cs = getComputedStyle(contentEl);
    const padTop    = parseFloat(cs.paddingTop)    || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    const boxHeight = contentEl.getBoundingClientRect().height - padTop - padBottom;

    // Max lines that physically fit, minus safety margin
    const maxLines = Math.max(
        3,
        Math.floor(boxHeight / realLineHeight) - LINE_SAFETY_MARGIN
    );

    // ---- 4. Walk through each paragraph, word by word, counting lines ----
    // We rebuild the page content as we go, tracking which words fit.

    // Clear the content element again — we'll rebuild page by page
    contentEl.innerHTML = "";

    // State for current page being built
    let currentPageBlocks = [];   // array of { type:'title'|'para', text }
    let currentPageLines = 0;

    // Title always goes on page 1
    if (chapter.title) {
        currentPageBlocks.push({ type: "title", text: chapter.title });
        // Title takes ~1-2 lines; count it conservatively as 2
        currentPageLines += 2;
    }

    // Helper: count how many lines a block of text takes at this width
    function countLines(text, isTitle) {
        const probe = document.createElement(isTitle ? "h1" : "p");
        if (isTitle) probe.className = "page-chapter-title";
        probe.style.cssText = "visibility:hidden;position:absolute;left:-99999px;";
        probe.style.width = contentEl.clientWidth + "px";
        probe.textContent = text;
        document.body.appendChild(probe);

        // Count lines via range.getClientRects() — this is the TRUE line count
        const range = document.createRange();
        range.selectNodeContents(probe);
        const rects = range.getClientRects();
        // Deduplicate rects with same top (they're on the same line)
        const tops = new Set();
        for (const r of rects) {
            if (r.height > 0) tops.add(Math.round(r.top));
        }
        const lineCount = Math.max(1, tops.size);

        probe.remove();
        return lineCount;
    }

    // Helper: push the current page and start a new one
    function flushPage() {
        if (currentPageBlocks.length === 0) return;
        pages.push(renderBlocks(currentPageBlocks));
        currentPageBlocks = [];
        currentPageLines = 0;
    }

    // Render helper
    function renderBlocks(blocks) {
        return blocks.map(b => {
            if (b.type === "title") {
                return `<h1 class="page-chapter-title">${escapeHTML(b.text)}</h1>`;
            }
            return `<p>${escapeHTML(b.text)}</p>`;
        }).join("");
    }

    // ---- 5. Distribute text across pages ----
    for (const para of paragraphs) {
        const words = para.split(/\s+/).filter(Boolean);
        let buffer = "";
        let bufferLines = 0;

        for (let i = 0; i < words.length; i++) {
            const candidate = buffer ? buffer + " " + words[i] : words[i];
            const candidateLines = countLines(candidate, false);

            if (currentPageLines + candidateLines <= maxLines) {
                // Fits — keep growing the buffer
                buffer = candidate;
                bufferLines = candidateLines;
            } else {
                // Doesn't fit.
                // 1. Commit current buffer (if any) to the current page
                if (buffer) {
                    currentPageBlocks.push({ type: "para", text: buffer });
                    currentPageLines += bufferLines;
                }

                // 2. Flush the page
                flushPage();

                // 3. Start new page with this word
                buffer = words[i];
                bufferLines = countLines(buffer, false);
                currentPageLines = bufferLines;
            }
        }

        // Paragraph done — commit its buffer to the current page
        if (buffer) {
            currentPageBlocks.push({ type: "para", text: buffer });
            currentPageLines += bufferLines;
        }
    }

    // Flush the final page
    flushPage();

    // ---- 6. Fallback ----
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
    readerPageContent.scrollTop = 0;

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

    // End of novel - go to details
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

function restorePosition() {
    if (positionRestored) return;
    const saved = localStorage.getItem(`storynest-progress-${novelId}-${chapterNumber}`);
    if (saved !== null) {
        const pos = parseInt(saved);
        if (pos >= 0 && pos < pages.length) {
            currentPage = pos;
            showPage();
            positionRestored = true;
        }
    }
}

// Override showPage to restore position
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