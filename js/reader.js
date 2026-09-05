/* =====================================================
   STORYNEST — READER
   PAGE-BY-PAGE VERSION
   ===================================================== */


/* =====================================================
   URL PARAMETERS
===================================================== */

const params = new URLSearchParams(window.location.search);

const novelId = params.get("id");

let chapterNumber =
    Number(params.get("chapter")) || 1;


/* =====================================================
   DATA
===================================================== */

let novel = null;
let chapters = [];

let pages = [];
let currentPage = 0;


/* =====================================================
   TOUCH
===================================================== */

let touchStartX = 0;
let touchStartY = 0;


/* =====================================================
   ELEMENTS
===================================================== */

const readerNovelTitle =
    document.getElementById("readerNovelTitle");

const chapterHeader =
    document.getElementById("chapterHeader");

const chapterNumberElement =
    document.getElementById("chapterNumber");

const chapterTitle =
    document.getElementById("chapterTitle");

const storyContent =
    document.getElementById("storyContent");

const previousButton =
    document.getElementById("previousChapter");

const nextButton =
    document.getElementById("nextChapter");

const progressBar =
    document.getElementById("readingProgress");

const chapterProgress =
    document.getElementById("chapterProgress");

const currentChapterNum =
    document.getElementById("currentChapterNum");

const totalChaptersEl =
    document.getElementById("totalChapters");


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
   KEEPING ORIGINAL SUPABASE LOGIC
===================================================== */

async function loadNovel() {

    console.log(
        "STORYNEST READER: Loading novel:",
        novelId
    );


    /* -----------------------------------------------
       LOAD NOVEL
    ------------------------------------------------ */

    const {
        data: novelData,
        error: novelError
    } = await supabaseClient
        .from("novels")
        .select("*")
        .eq("id", novelId)
        .eq("status", "published")
        .single();


    if (novelError || !novelData) {

        console.error(
            "STORYNEST READER: Novel error:",
            novelError
        );

        showError(
            "This novel could not be found."
        );

        return;
    }


    console.log(
        "STORYNEST READER: Novel loaded:",
        novelData.title
    );


    novel = novelData;


    /* -----------------------------------------------
       LOAD CHAPTERS
    ------------------------------------------------ */

    const {
        data: chapterData,
        error: chapterError
    } = await supabaseClient
        .from("chapters")
        .select("*")
        .eq("novel_id", novelId)
        .order(
            "chapter_number",
            {
                ascending: true
            }
        );


    if (chapterError) {

        console.error(
            "STORYNEST READER: Chapter error:",
            chapterError
        );

        showError(
            "Could not load the chapters."
        );

        return;
    }


    chapters = chapterData || [];


    if (chapters.length === 0) {

        showError(
            "This novel does not have any chapters yet."
        );

        return;
    }


    /* -----------------------------------------------
       VALIDATE CHAPTER
    ------------------------------------------------ */

    if (
        chapterNumber < 1 ||
        chapterNumber > chapters.length
    ) {

        chapterNumber = 1;

    }


    /* -----------------------------------------------
       HEADER
    ------------------------------------------------ */

    readerNovelTitle.textContent =
        novel.title;


    if (totalChaptersEl) {

        totalChaptersEl.textContent =
            chapters.length;

    }


    /* -----------------------------------------------
       DISPLAY
    ------------------------------------------------ */

    displayChapter();

}


/* =====================================================
   DISPLAY CHAPTER
===================================================== */

function displayChapter() {

    const chapter =
        chapters[chapterNumber - 1];


    if (!chapter) return;


    /* -----------------------------------------------
       CHAPTER INFORMATION
    ------------------------------------------------ */

    chapterNumberElement.textContent =
        chapter.chapter_number;


    currentChapterNum.textContent =
        chapter.chapter_number;


    chapterHeader.textContent =
        `Chapter ${chapter.chapter_number}`;


    chapterTitle.textContent =
        chapter.title;


    document.title =
        `${chapter.title} — ${novel.title}`;


    /* -----------------------------------------------
       CREATE PAGES
    ------------------------------------------------ */

    createPages(
        chapter.content || ""
    );


    /*
     * Start at first page.
     */

    currentPage = 0;


    /* -----------------------------------------------
       BUTTONS
    ------------------------------------------------ */

    previousButton.style.visibility =
        chapterNumber === 1
            ? "hidden"
            : "visible";


    nextButton.textContent =
        chapterNumber === chapters.length
            ? "Finish →"
            : "Next →";


    /* -----------------------------------------------
       URL
    ------------------------------------------------ */

    updateURL();


    /* -----------------------------------------------
       SHOW FIRST PAGE
    ------------------------------------------------ */

    showPage();

}


/* =====================================================
   CREATE PAGES
===================================================== */

function createPages(content) {

    pages = [];


    const text =
        String(content)
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .trim();


    if (!text) {

        pages.push(
            "<p>No content available.</p>"
        );

        return;
    }


    /*
     * We use the actual story container
     * to determine how much text fits.
     */

    const availableHeight =
        getStoryHeight();


    /*
     * Create invisible measuring element.
     */

    const measurer =
        document.createElement("article");


    measurer.className =
        "story reader-measurer";


    measurer.style.position =
        "fixed";

    measurer.style.left =
        "-99999px";

    measurer.style.top =
        "0";

    measurer.style.visibility =
        "hidden";

    measurer.style.width =
        `${storyContent.clientWidth}px`;

    measurer.style.height =
        `${availableHeight}px`;

    measurer.style.overflow =
        "hidden";

    measurer.style.fontSize =
        getComputedStyle(
            storyContent
        ).fontSize;

    measurer.style.lineHeight =
        getComputedStyle(
            storyContent
        ).lineHeight;

    measurer.style.boxSizing =
        "border-box";


    document.body.appendChild(
        measurer
    );


    /*
     * Split chapter into paragraphs.
     */

    const paragraphs =
        text
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(Boolean);


    let currentPageHTML = "";


    for (
        const paragraph of paragraphs
    ) {

        const words =
            paragraph.split(/\s+/);


        let currentParagraph = "";


        for (
            const word of words
        ) {

            const safeWord =
                escapeHTML(word);


            const testParagraph =
                currentParagraph +
                safeWord +
                " ";


            const testHTML =
                currentPageHTML +
                `<p>${testParagraph}</p>`;


            measurer.innerHTML =
                testHTML;


            if (
                measurer.scrollHeight <=
                availableHeight
            ) {

                currentParagraph =
                    testParagraph;

            } else {

                /*
                 * Page is full.
                 */

                if (
                    currentPageHTML.trim()
                ) {

                    pages.push(
                        currentPageHTML
                    );

                }


                /*
                 * Start new page.
                 */

                currentPageHTML =
                    `<p>${safeWord} `;


                currentParagraph = "";

            }

        }


        /*
         * Finish paragraph.
         */

        if (currentParagraph) {

            const paragraphHTML =
                `<p>${currentParagraph}</p>`;


            const testHTML =
                currentPageHTML +
                paragraphHTML;


            measurer.innerHTML =
                testHTML;


            if (
                measurer.scrollHeight <=
                availableHeight
            ) {

                currentPageHTML =
                    testHTML;

            } else {

                if (
                    currentPageHTML.trim()
                ) {

                    pages.push(
                        currentPageHTML
                    );

                }


                currentPageHTML =
                    paragraphHTML;

            }

        }

    }


    /*
     * Add final page.
     */

    if (
        currentPageHTML.trim()
    ) {

        pages.push(
            currentPageHTML
        );

    }


    document.body.removeChild(
        measurer
    );


    /*
     * Safety.
     */

    if (!pages.length) {

        pages.push(
            `<p>${escapeHTML(text)}</p>`
        );

    }


    console.log(
        "STORYNEST READER:",
        pages.length,
        "pages created"
    );

}


/* =====================================================
   STORY HEIGHT
===================================================== */

function getStoryHeight() {

    /*
     * The CSS gives storyContent its actual
     * available height.
     */

    const rect =
        storyContent.getBoundingClientRect();


    return Math.max(
        150,
        Math.floor(rect.height)
    );

}


/* =====================================================
   SHOW PAGE
===================================================== */

function showPage() {

    if (!pages.length) return;


    storyContent.innerHTML =
        pages[currentPage];


    /*
     * Keep story exactly inside its
     * allocated reading area.
     */

    storyContent.scrollTop = 0;


    updateProgress();


    updateButtons();


    updateChapterProgress();

}


/* =====================================================
   PROGRESS
===================================================== */

function updateProgress() {

    if (!progressBar) return;


    let progress = 0;


    if (pages.length > 1) {

        progress =
            (
                currentPage /
                (pages.length - 1)
            ) * 100;

    } else {

        progress = 100;

    }


    progressBar.style.width =
        `${progress}%`;

}


/* =====================================================
   BUTTONS
===================================================== */

function updateButtons() {

    if (currentPage > 0) {

        previousButton.style.visibility =
            "visible";

        previousButton.textContent =
            "← Previous";

    } else {

        previousButton.style.visibility =
            chapterNumber === 1
                ? "hidden"
                : "visible";


        previousButton.textContent =
            "← Previous Chapter";

    }


    if (
        currentPage <
        pages.length - 1
    ) {

        nextButton.textContent =
            "Next →";

    } else {

        nextButton.textContent =
            chapterNumber === chapters.length
                ? "Finish →"
                : "Next Chapter →";

    }

}


/* =====================================================
   NEXT
===================================================== */

function nextPage() {

    if (
        currentPage <
        pages.length - 1
    ) {

        currentPage++;

        showPage();

        return;
    }


    /*
     * End of chapter.
     */

    if (
        chapterNumber <
        chapters.length
    ) {

        chapterNumber++;

        displayChapter();

        return;
    }


    /*
     * End of entire novel.
     */

    window.location.href =
        `novel.html?id=${encodeURIComponent(novelId)}`;

}


/* =====================================================
   PREVIOUS
===================================================== */

function previousPage() {

    if (currentPage > 0) {

        currentPage--;

        showPage();

        return;
    }


    /*
     * First page of current chapter.
     * Go to previous chapter.
     */

    if (chapterNumber > 1) {

        chapterNumber--;

        displayChapter();


        setTimeout(
            function() {

                currentPage =
                    pages.length - 1;

                showPage();

            },
            50
        );

    }

}


/* =====================================================
   BUTTON EVENTS
===================================================== */

if (nextButton) {

    nextButton.addEventListener(
        "click",
        nextPage
    );

}


if (previousButton) {

    previousButton.addEventListener(
        "click",
        previousPage
    );

}


/* =====================================================
   LAPTOP ARROW KEYS
===================================================== */

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.target &&
            (
                event.target.tagName === "INPUT" ||
                event.target.tagName === "TEXTAREA"
            )
        ) {

            return;
        }


        if (
            event.key === "ArrowRight"
        ) {

            event.preventDefault();

            nextPage();

        }


        if (
            event.key === "ArrowLeft"
        ) {

            event.preventDefault();

            previousPage();

        }

    }
);


/* =====================================================
   SWIPE
===================================================== */

document.addEventListener(
    "touchstart",
    function(event) {

        if (!event.touches.length) return;


        touchStartX =
            event.touches[0].clientX;


        touchStartY =
            event.touches[0].clientY;

    },
    {
        passive: true
    }
);


document.addEventListener(
    "touchend",
    function(event) {

        if (!event.changedTouches.length) {
            return;
        }


        const endX =
            event.changedTouches[0].clientX;


        const endY =
            event.changedTouches[0].clientY;


        const dx =
            endX - touchStartX;


        const dy =
            endY - touchStartY;


        /*
         * Ignore mostly vertical swipes.
         */

        if (
            Math.abs(dy) >
            Math.abs(dx)
        ) {

            return;

        }


        /*
         * Ignore tiny movements.
         */

        if (
            Math.abs(dx) < 50
        ) {

            return;

        }


        if (dx < 0) {

            /*
             * Swipe LEFT
             * = next
             */

            nextPage();

        } else {

            /*
             * Swipe RIGHT
             * = previous
             */

            previousPage();

        }

    },
    {
        passive: true
    }
);


/* =====================================================
   TAP LEFT / RIGHT
===================================================== */

document.addEventListener(
    "click",
    function(event) {

        /*
         * Don't interfere with controls.
         */

        if (
            event.target.closest(
                "button, a, .reader-dropdown"
            )
        ) {

            return;

        }


        if (
            event.target.closest(
                ".reader-header"
            )
        ) {

            return;

        }


        const width =
            window.innerWidth;


        const x =
            event.clientX;


        /*
         * Left third.
         */

        if (
            x < width / 3
        ) {

            previousPage();

            return;

        }


        /*
         * Right third.
         */

        if (
            x > width * 2 / 3
        ) {

            nextPage();

        }

    }
);


/* =====================================================
   RESIZE / ROTATION
===================================================== */

let resizeTimer;


window.addEventListener(
    "resize",
    function() {

        clearTimeout(
            resizeTimer
        );


        resizeTimer =
            setTimeout(
                function() {

                    const chapter =
                        chapters[
                            chapterNumber - 1
                        ];


                    if (!chapter) return;


                    createPages(
                        chapter.content || ""
                    );


                    currentPage =
                        Math.min(
                            currentPage,
                            pages.length - 1
                        );


                    showPage();

                },
                300
            );

    }
);


/* =====================================================
   UPDATE URL
===================================================== */

function updateURL() {

    const url =
        `reader.html?id=${encodeURIComponent(
            novelId
        )}&chapter=${chapterNumber}`;


    window.history.replaceState(
        {},
        "",
        url
    );

}


/* =====================================================
   CHAPTER PROGRESS
===================================================== */

function updateChapterProgress() {

    if (currentChapterNum) {

        currentChapterNum.textContent =
            chapterNumber;

    }


    if (totalChaptersEl) {

        totalChaptersEl.textContent =
            chapters.length;

    }

}


/* =====================================================
   ERROR
===================================================== */

function showError(message) {

    console.error(
        "STORYNEST READER ERROR:",
        message
    );


    if (readerNovelTitle) {

        readerNovelTitle.textContent =
            "StoryNest";

    }


    if (chapterTitle) {

        chapterTitle.textContent =
            "Unable to open story";

    }


    if (chapterHeader) {

        chapterHeader.textContent =
            "";

    }


    if (storyContent) {

        storyContent.innerHTML = `
            <div class="reader-error">

                <div class="reader-error-icon">
                    📖
                </div>

                <h3>
                    Something went wrong
                </h3>

                <p>
                    ${escapeHTML(message)}
                </p>

                <a
                    href="index.html"
                    class="primary-btn"
                >
                    Return Home
                </a>

            </div>
        `;

    }


    if (previousButton) {

        previousButton.style.visibility =
            "hidden";

    }


    if (nextButton) {

        nextButton.style.visibility =
            "hidden";

    }


    if (chapterProgress) {

        chapterProgress.style.display =
            "none";

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