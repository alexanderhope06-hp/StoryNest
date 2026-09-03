/* =====================================================
   STORYNEST - READER (COMPLETE)
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

    // Novel error
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

    // Chapter error
    if (chapterError) {
        console.error("Chapter error:", chapterError);
        showError("Could not load the chapters.");
        return;
    }

    chapters = chapterData || [];

    // No chapters
    if (chapters.length === 0) {
        showError("This novel does not have any chapters yet.");
        return;
    }

    // Update total chapters display
    if (totalChaptersEl) {
        totalChaptersEl.textContent = chapters.length;
    }

    // Validate chapter number
    if (chapterNumber < 1 || chapterNumber > chapters.length) {
        chapterNumber = 1;
        updateURL();
    }

    // Display novel title
    readerNovelTitle.textContent = novel.title;

    // Display chapter
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

    // Chapter number
    chapterNumberElement.textContent = chapter.chapter_number;
    if (currentChapterNum) {
        currentChapterNum.textContent = chapter.chapter_number;
    }

    // Header
    chapterHeader.textContent = `Chapter ${chapter.chapter_number}`;

    // Chapter title
    chapterTitle.textContent = chapter.title;

    // Story content - convert to paragraphs
    storyContent.innerHTML = "";
    
    const content = chapter.content || "";
    const paragraphs = content.split(/\n\s*\n/);
    
    paragraphs.forEach(paragraph => {
        const cleaned = paragraph.trim();
        if (!cleaned) return;
        
        const p = document.createElement("p");
        p.textContent = cleaned;
        storyContent.appendChild(p);
    });

    // Previous button
    previousButton.style.visibility = chapterNumber === 1 ? "hidden" : "visible";

    // Next button text
    nextButton.textContent = chapterNumber === chapters.length ? "Finish →" : "Next →";

    // Page title
    document.title = `${chapter.title} — ${novel.title}`;

    // Reset reading progress
    if (progressBar) {
        progressBar.style.width = "0%";
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Update URL
    updateURL();
}

/* =====================================================
   NEXT CHAPTER
   ===================================================== */

nextButton.addEventListener("click", () => {
    if (chapterNumber < chapters.length) {
        chapterNumber++;
        displayChapter();
        return;
    }
    window.location.href = `novel.html?id=${encodeURIComponent(novelId)}`;
});

/* =====================================================
   PREVIOUS CHAPTER
   ===================================================== */

previousButton.addEventListener("click", () => {
    if (chapterNumber > 1) {
        chapterNumber--;
        displayChapter();
    }
});

/* =====================================================
   KEYBOARD NAVIGATION
   ===================================================== */

document.addEventListener("keydown", (e) => {
    // Left arrow or Page Up - previous chapter
    if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (chapterNumber > 1) {
            chapterNumber--;
            displayChapter();
            e.preventDefault();
        }
    }
    
    // Right arrow or Page Down - next chapter
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
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
   UPDATE URL
   ===================================================== */

function updateURL() {
    const newUrl = `reader.html?id=${encodeURIComponent(novelId)}&chapter=${chapterNumber}`;
    window.history.pushState({}, "", newUrl);
}

/* =====================================================
   READING PROGRESS
   ===================================================== */

let progressTimeout;

window.addEventListener("scroll", () => {
    clearTimeout(progressTimeout);
    progressTimeout = setTimeout(() => {
        const scrollTop = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0;
        
        if (progressBar) {
            progressBar.style.width = `${Math.min(progress, 100)}%`;
        }
    }, 200);
});

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
}

/* =====================================================
   HTML SAFETY
   ===================================================== */

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}