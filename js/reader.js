/* =====================================================
   STORYNEST — SCROLLING READER
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
const readerPageContent = document.getElementById("readerPageContent");
const progressBar = document.getElementById("readingProgress");


/* =====================================================
   UNLOCK PAGE SCROLLING
   ===================================================== */

function unlockScrolling() {
    // Make sure the browser can scroll the normal page.
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";

    // Prevent CSS from accidentally turning the page into
    // a fixed/non-scrollable reader.
    document.documentElement.style.overflowY = "auto";
    document.body.style.overflowY = "auto";

    // Do NOT use touch-action: none.
    // touch-action: auto allows normal finger scrolling.
    document.documentElement.style.touchAction = "auto";
    document.body.style.touchAction = "auto";

    if (readerPageContent) {
        readerPageContent.style.overflow = "visible";
        readerPageContent.style.overflowY = "visible";
        readerPageContent.style.touchAction = "auto";
    }
}

unlockScrolling();


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

        const { data: novelData, error: novelError } =
            await supabaseClient
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


        const { data: chapterData, error: chapterError } =
            await supabaseClient
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


    chapterHeader.textContent =
        `Chapter ${chapter.chapter_number}`;

    document.title =
        `${chapter.title || "Chapter " + chapter.chapter_number} — ${novel.title}`;


    // Make absolutely sure scrolling remains unlocked.
    unlockScrolling();


    renderChapter(chapter);

    updateURL();

    restorePosition();
}


/* =====================================================
   RENDER CHAPTER
   ===================================================== */

function renderChapter(chapter) {

    const content = chapter.content || "";
    const title = chapter.title || "";


    const paragraphs = content
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);


    let html =
        `<h1 class="page-chapter-title">${escapeHTML(title)}</h1>`;


    for (const p of paragraphs) {

        // Preserve line breaks inside paragraphs.
        const formattedParagraph =
            escapeHTML(p).replace(/\n/g, "<br>");

        html += `<p>${formattedParagraph}</p>`;
    }


    readerPageContent.innerHTML = html;


    // Make sure the content itself is not a scroll container.
    readerPageContent.style.overflow = "visible";
    readerPageContent.style.overflowY = "visible";


    // Apply saved font size.
    const savedSize =
        localStorage.getItem("readerFontSize");

    const fontSize =
        savedSize ? parseInt(savedSize) : 18;

    applyFontSizeToContent(fontSize);
}


/* =====================================================
   SCROLL PROGRESS
   ===================================================== */

function updateProgress() {

    if (!progressBar) return;


    const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        0;


    const scrollHeight =
        document.documentElement.scrollHeight -
        window.innerHeight;


    const progress =
        scrollHeight > 0
            ? (scrollTop / scrollHeight) * 100
            : 0;


    progressBar.style.width =
        `${Math.min(100, Math.max(0, progress))}%`;


    // Save reading position.
    if (novelId) {

        localStorage.setItem(
            `storynest-scroll-${novelId}-${chapterNumber}`,
            scrollTop
        );

    }
}


/*
   Passive scroll listener.
   This NEVER blocks scrolling.
*/

window.addEventListener(
    "scroll",
    updateProgress,
    { passive: true }
);

window.addEventListener(
    "resize",
    updateProgress,
    { passive: true }
);


/* =====================================================
   CHAPTER NAVIGATION
   ===================================================== */

function nextChapter() {

    if (chapterNumber < chapters.length) {

        chapterNumber++;

        displayChapter();

    } else {

        window.location.href =
            `novel.html?id=${encodeURIComponent(novelId)}`;

    }
}


function previousChapter() {

    if (chapterNumber > 1) {

        chapterNumber--;

        displayChapter();

    }
}


/* =====================================================
   KEYBOARD CONTROLS
   ===================================================== */

document.addEventListener("keydown", function (event) {

    // Don't interfere with text fields.
    if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA" ||
        event.target.isContentEditable
    ) {
        return;
    }


    /* ---------------------------------------------
       Chapter navigation
       --------------------------------------------- */

    if (event.key === "ArrowRight") {

        event.preventDefault();

        nextChapter();

        return;
    }


    if (event.key === "ArrowLeft") {

        event.preventDefault();

        previousChapter();

        return;
    }


    /* ---------------------------------------------
       Scroll down
       --------------------------------------------- */

    if (
        event.key === "ArrowDown" ||
        event.key === " " ||
        event.key === "PageDown"
    ) {

        event.preventDefault();

        window.scrollBy({
            top: window.innerHeight * 0.85,
            behavior: "smooth"
        });

        return;
    }


    /* ---------------------------------------------
       Scroll up
       --------------------------------------------- */

    if (
        event.key === "ArrowUp" ||
        event.key === "PageUp"
    ) {

        event.preventDefault();

        window.scrollBy({
            top: -window.innerHeight * 0.85,
            behavior: "smooth"
        });

        return;
    }


    /* ---------------------------------------------
       Home
       --------------------------------------------- */

    if (event.key === "Home") {

        event.preventDefault();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        return;
    }


    /* ---------------------------------------------
       End
       --------------------------------------------- */

    if (event.key === "End") {

        event.preventDefault();

        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth"
        });

        return;
    }

});


/* =====================================================
   MOBILE SWIPE
   CHAPTER CHANGE ONLY
   ===================================================== */

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;


document.addEventListener(
    "touchstart",
    function (event) {

        if (!event.touches.length) return;

        touchStartX =
            event.touches[0].clientX;

        touchStartY =
            event.touches[0].clientY;

        touchStartTime = Date.now();

    },
    {
        passive: true
    }
);


document.addEventListener(
    "touchend",
    function (event) {

        if (!event.changedTouches.length) return;


        const touch =
            event.changedTouches[0];


        const deltaX =
            touch.clientX - touchStartX;


        const deltaY =
            touch.clientY - touchStartY;


        const duration =
            Date.now() - touchStartTime;


        /*
           IMPORTANT:

           Vertical movement is ignored.

           This means normal finger scrolling
           continues to work.
        */

        if (Math.abs(deltaX) < 80) return;

        if (
            Math.abs(deltaX) <
            Math.abs(deltaY) * 1.5
        ) {
            return;
        }

        if (duration > 600) return;


        /*
           Only a quick horizontal swipe
           changes the chapter.
        */

        if (deltaX < 0) {

            nextChapter();

        } else {

            previousChapter();

        }

    },
    {
        passive: true
    }
);


/* =====================================================
   URL
   ===================================================== */

function updateURL() {

    const newURL =
        `reader.html?id=${encodeURIComponent(novelId)}&chapter=${chapterNumber}`;

    window.history.replaceState(
        {},
        "",
        newURL
    );
}


/* =====================================================
   BROWSER BACK / FORWARD
   ===================================================== */

window.addEventListener(
    "popstate",
    function () {

        const currentParams =
            new URLSearchParams(window.location.search);


        const newChapter =
            Number(currentParams.get("chapter")) || 1;


        if (
            newChapter !== chapterNumber &&
            newChapter >= 1 &&
            newChapter <= chapters.length
        ) {

            chapterNumber = newChapter;

            displayChapter();

        }

    }
);


/* =====================================================
   RESTORE SCROLL POSITION
   ===================================================== */

function restorePosition() {

    const saved =
        localStorage.getItem(
            `storynest-scroll-${novelId}-${chapterNumber}`
        );


    /*
       Wait until the chapter has been rendered
       before restoring the position.
    */

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            // Make sure page scrolling is unlocked.
            unlockScrolling();


            if (saved !== null) {

                const pos =
                    parseInt(saved, 10) || 0;


                window.scrollTo({
                    top: pos,
                    left: 0,
                    behavior: "instant"
                });

            } else {

                window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: "instant"
                });

            }


            updateProgress();

        });

    });
}


/* =====================================================
   FONT SIZE
   ===================================================== */

function applyFontSizeToContent(size) {

    if (!readerPageContent) return;


    readerPageContent.style.fontSize =
        size + "px";


    readerPageContent
        .querySelectorAll("p")
        .forEach(p => {

            p.style.fontSize =
                size + "px";

        });
}


/* =====================================================
   FONT SIZE EVENT
   ===================================================== */

window.addEventListener(
    "readerFontSizeChanged",
    function (e) {

        applyFontSizeToContent(
            e.detail.size
        );

        setTimeout(
            updateProgress,
            100
        );

    }
);


/* =====================================================
   ERROR
   ===================================================== */

function showError(message) {

    if (readerNovelTitle) {
        readerNovelTitle.textContent =
            "StoryNest";
    }


    if (readerPageContent) {

        readerPageContent.innerHTML = `

            <div style="
                text-align:center;
                padding:80px 20px;
            ">

                <div style="
                    font-size:4rem;
                    margin-bottom:20px;
                ">
                    📖
                </div>

                <h3 style="
                    font-size:1.5rem;
                    margin-bottom:12px;
                    color:#222;
                ">
                    Something went wrong
                </h3>

                <p style="
                    color:#888;
                    margin-bottom:16px;
                ">
                    ${escapeHTML(message)}
                </p>

                <a
                    href="index.html"
                    class="primary-btn"
                    style="display:inline-block;"
                >
                    Return Home
                </a>

            </div>
        `;
    }
}


/* =====================================================
   HTML SAFETY
   ===================================================== */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}