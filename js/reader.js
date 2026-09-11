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
   BUILD PAGES
   ===================================================== */

function buildPages(chapter) {
    pages = [];
    const content = chapter.content || "";

    // Get available height
    const header = document.querySelector(".reader-header");
    const headerHeight = header ? header.getBoundingClientRect().height : 64;
    const bottomSpace = 70; // Ad space
    const paddingSpace = 48;
    const availableHeight = Math.max(
        200,
        window.innerHeight - headerHeight - bottomSpace - paddingSpace
    );

    // Create measurement container
    const measure = document.createElement("div");
    measure.className = "reader-measure";
    measure.style.cssText = `
        position: fixed;
        left: -100000px;
        top: 0;
        width: min(900px, calc(100vw - 48px));
        height: ${availableHeight}px;
        visibility: hidden;
        overflow: hidden;
        box-sizing: border-box;
        font-size: 18px;
        line-height: 1.75;
        font-family: Georgia, 'Times New Roman', serif;
    `;
    document.body.appendChild(measure);

    // Add chapter title
    const titleEl = document.createElement("h1");
    titleEl.className = "page-chapter-title";
    titleEl.textContent = chapter.title || "";
    measure.appendChild(titleEl);

    // Split into paragraphs
    const paragraphs = content
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

    let currentPageHTML = titleEl.outerHTML;
    const testPage = document.createElement("div");
    testPage.style.cssText = "width:100%;overflow:hidden;box-sizing:border-box;";
    measure.innerHTML = "";
    measure.appendChild(testPage);
    testPage.innerHTML = currentPageHTML;

    for (const paragraph of paragraphs) {
        const words = paragraph.split(/\s+/);
        let currentParagraph = "";

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const candidate = currentParagraph ? currentParagraph + " " + word : word;
            const candidateHTML = `<p>${escapeHTML(candidate)}</p>`;
            testPage.innerHTML = currentPageHTML + candidateHTML;

            if (testPage.scrollHeight <= availableHeight) {
                currentParagraph = candidate;
            } else {
                if (currentParagraph) {
                    currentPageHTML += `<p>${escapeHTML(currentParagraph)}</p>`;
                }
                pages.push(currentPageHTML);
                currentPageHTML = `<p>${escapeHTML(word)}`;
                currentParagraph = word;
                testPage.innerHTML = currentPageHTML + "</p>";
            }
        }

        if (currentParagraph) {
            const finalHTML = `<p>${escapeHTML(currentParagraph)}</p>`;
            testPage.innerHTML = currentPageHTML + finalHTML;
            if (testPage.scrollHeight <= availableHeight) {
                currentPageHTML = testPage.innerHTML;
            } else {
                pages.push(currentPageHTML);
                currentPageHTML = finalHTML;
            }
        }
    }

    if (currentPageHTML.trim()) {
        pages.push(currentPageHTML);
    }

    measure.remove();

    // Safety fallback
    if (pages.length === 0) {
        pages.push(`<h1 class="page-chapter-title">${escapeHTML(chapter.title || "")}</h1><p>No content available.</p>`);
    }
}

/* =====================================================
   SHOW PAGE
   ===================================================== */

function showPage() {
    if (!pages.length) return;

    // Apply current font size
    const savedSize = localStorage.getItem('readerFontSize');
    const fontSize = savedSize ? parseInt(savedSize) : 18;

    readerPageContent.innerHTML = pages[currentPage];
    readerPageContent.style.fontSize = fontSize + 'px';
    readerPageContent.scrollTop = 0;

    // Apply font size to all paragraphs
    const paragraphs = readerPageContent.querySelectorAll('p');
    paragraphs.forEach(p => {
        p.style.fontSize = fontSize + 'px';
    });

    // Progress bar
    if (progressBar) {
        const progress = ((currentPage + 1) / pages.length) * 100;
        progressBar.style.width = `${progress}%`;
    }

    // Save position
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