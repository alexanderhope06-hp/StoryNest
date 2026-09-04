/* =====================================================
   STORYNEST - READER
   PAGINATED READING SYSTEM
   ===================================================== */

/*
 * URL:
 * reader.html?id=NOVEL_UUID&chapter=1
 *
 * Controls:
 * Desktop:
 *   ← Previous page
 *   → Next page
 *
 * Mobile:
 *   Swipe right → Previous page
 *   Swipe left  → Next page
 *
 * Chapter navigation:
 *   At last page → Next Chapter
 *   At first page → Previous Chapter
 */

/* =====================================================
   URL PARAMETERS
   ===================================================== */

const params = new URLSearchParams(window.location.search);

const novelId = params.get("id");

let chapterNumber =
    Number(params.get("chapter")) || 1;

let novel = null;
let chapters = [];


/* =====================================================
   PAGE SYSTEM
   ===================================================== */

let pages = [];

let currentPage = 0;


/*
 * Approximate page size.
 *
 * These values are adjusted automatically
 * depending on screen size.
 */

function getPageSettings() {

    const width = window.innerWidth;

    if (width <= 500) {

        return {
            maxCharacters: 850
        };

    }

    if (width <= 800) {

        return {
            maxCharacters: 1100
        };

    }

    return {
        maxCharacters: 1450
    };

}


/* =====================================================
   ELEMENTS
   ===================================================== */

const readerNovelTitle =
    document.getElementById(
        "readerNovelTitle"
    );

const chapterHeader =
    document.getElementById(
        "chapterHeader"
    );

const chapterNumberElement =
    document.getElementById(
        "chapterNumber"
    );

const chapterTitle =
    document.getElementById(
        "chapterTitle"
    );

const storyContent =
    document.getElementById(
        "storyContent"
    );

const previousButton =
    document.getElementById(
        "previousChapter"
    );

const nextButton =
    document.getElementById(
        "nextChapter"
    );

const progressBar =
    document.getElementById(
        "readingProgress"
    );

const chapterProgress =
    document.getElementById(
        "chapterProgress"
    );

const currentChapterNum =
    document.getElementById(
        "currentChapterNum"
    );

const totalChaptersEl =
    document.getElementById(
        "totalChapters"
    );


/* =====================================================
   START
   ===================================================== */

if (!novelId) {

    showError(
        "No novel was selected."
    );

} else {

    loadNovel();

}


/* =====================================================
   LOAD NOVEL
   ===================================================== */

async function loadNovel() {

    /*
     * Load published novel
     */

    const {
        data: novelData,
        error: novelError
    } = await supabaseClient

        .from("novels")

        .select("*")

        .eq(
            "id",
            novelId
        )

        .eq(
            "status",
            "published"
        )

        .single();


    /*
     * Novel error
     */

    if (
        novelError ||
        !novelData
    ) {

        console.error(
            "Novel error:",
            novelError
        );

        showError(
            "This novel could not be found."
        );

        return;

    }


    novel =
        novelData;


    /*
     * Load chapters
     */

    const {
        data: chapterData,
        error: chapterError
    } = await supabaseClient

        .from("chapters")

        .select("*")

        .eq(
            "novel_id",
            novelId
        )

        .order(
            "chapter_number",
            {
                ascending: true
            }
        );


    /*
     * Chapter error
     */

    if (chapterError) {

        console.error(
            "Chapter error:",
            chapterError
        );

        showError(
            "Could not load the chapters."
        );

        return;

    }


    chapters =
        chapterData || [];


    /*
     * No chapters
     */

    if (
        chapters.length === 0
    ) {

        showError(
            "This novel does not have any chapters yet."
        );

        return;

    }


    /*
     * Total chapters
     */

    if (totalChaptersEl) {

        totalChaptersEl.textContent =
            chapters.length;

    }


    /*
     * Validate chapter
     */

    if (
        chapterNumber < 1 ||
        chapterNumber > chapters.length
    ) {

        chapterNumber = 1;

        updateURL();

    }


    /*
     * Novel title
     */

    if (readerNovelTitle) {

        readerNovelTitle.textContent =
            novel.title;

    }


    /*
     * Display chapter
     */

    displayChapter();

}


/* =====================================================
   DISPLAY CHAPTER
   ===================================================== */

function displayChapter() {

    const chapter =
        chapters[chapterNumber - 1];


    if (!chapter) {

        return;

    }


    /*
     * Chapter number
     */

    if (chapterNumberElement) {

        chapterNumberElement.textContent =
            chapter.chapter_number;

    }


    if (currentChapterNum) {

        currentChapterNum.textContent =
            chapter.chapter_number;

    }


    /*
     * Header
     */

    if (chapterHeader) {

        chapterHeader.textContent =
            `Chapter ${chapter.chapter_number}`;

    }


    /*
     * Title
     */

    if (chapterTitle) {

        chapterTitle.textContent =
            chapter.title || "";

    }


    /*
     * Create pages
     */

    createPages(
        chapter.content || ""
    );


    /*
     * Chapter buttons
     */

    updateChapterButtons();


    /*
     * Page title
     */

    document.title =
        `${chapter.title} — ${novel.title}`;


    /*
     * Update URL
     */

    updateURL();


    /*
     * Move to first page
     */

    currentPage = 0;

    showCurrentPage();

}


/* =====================================================
   CREATE PAGES
   ===================================================== */

function createPages(content) {

    pages = [];


    /*
     * Normalize line breaks
     */

    const normalized =
        content
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .trim();


    if (!normalized) {

        pages = [
            "<p>No content available.</p>"
        ];

        return;

    }


    /*
     * Split into paragraphs
     */

    const paragraphs =
        normalized
            .split(/\n\s*\n/)
            .map(
                paragraph =>
                    paragraph.trim()
            )
            .filter(Boolean);


    const settings =
        getPageSettings();


    let currentText = "";
    let currentLength = 0;


    paragraphs.forEach(
        paragraph => {

            /*
             * If paragraph itself is too large,
             * split it into sentences/chunks.
             */

            if (
                paragraph.length >
                settings.maxCharacters
            ) {

                const chunks =
                    splitLargeParagraph(
                        paragraph,
                        settings.maxCharacters
                    );


                chunks.forEach(
                    chunk => {

                        if (
                            currentLength +
                            chunk.length >
                            settings.maxCharacters &&
                            currentText
                        ) {

                            pages.push(
                                textToHTML(
                                    currentText
                                )
                            );

                            currentText = "";
                            currentLength = 0;

                        }


                        currentText +=
                            (
                                currentText
                                    ? "\n\n"
                                    : ""
                            ) +
                            chunk;

                        currentLength +=
                            chunk.length;

                    }
                );


                return;

            }


            /*
             * Normal paragraph
             */

            const additionalLength =
                paragraph.length +
                (
                    currentText
                        ? 2
                        : 0
                );


            if (
                currentLength +
                additionalLength >
                settings.maxCharacters &&
                currentText
            ) {

                pages.push(
                    textToHTML(
                        currentText
                    )
                );

                currentText = "";
                currentLength = 0;

            }


            currentText +=
                (
                    currentText
                        ? "\n\n"
                        : ""
                ) +
                paragraph;


            currentLength +=
                paragraph.length +
                (
                    currentText
                        ? 2
                        : 0
                );

        }
    );


    /*
     * Add final page
     */

    if (currentText.trim()) {

        pages.push(
            textToHTML(
                currentText
            )
        );

    }


    /*
     * Safety fallback
     */

    if (pages.length === 0) {

        pages.push(
            "<p>No content available.</p>"
        );

    }

}


/* =====================================================
   SPLIT LARGE PARAGRAPH
   ===================================================== */

function splitLargeParagraph(
    paragraph,
    maxLength
) {

    /*
     * Try to split naturally
     * at sentence endings.
     */

    const sentences =
        paragraph.match(
            /[^.!?]+[.!?]+|[^.!?]+$/g
        );


    if (!sentences) {

        return splitByWords(
            paragraph,
            maxLength
        );

    }


    const chunks = [];

    let current = "";


    sentences.forEach(
        sentence => {

            sentence =
                sentence.trim();


            if (
                current.length +
                sentence.length +
                1 >
                maxLength &&
                current
            ) {

                chunks.push(
                    current.trim()
                );

                current = "";

            }


            current +=
                (
                    current
                        ? " "
                        : ""
                ) +
                sentence;

        }
    );


    if (current.trim()) {

        chunks.push(
            current.trim()
        );

    }


    return chunks;

}


/* =====================================================
   SPLIT BY WORDS
   ===================================================== */

function splitByWords(
    text,
    maxLength
) {

    const words =
        text.split(/\s+/);

    const chunks = [];

    let current = "";


    words.forEach(
        word => {

            if (
                current.length +
                word.length +
                1 >
                maxLength &&
                current
            ) {

                chunks.push(
                    current.trim()
                );

                current = "";

            }


            current +=
                (
                    current
                        ? " "
                        : ""
                ) +
                word;

        }
    );


    if (current.trim()) {

        chunks.push(
            current.trim()
        );

    }


    return chunks;

}


/* =====================================================
   TEXT → HTML
   ===================================================== */

function textToHTML(text) {

    const safeText =
        escapeHTML(text);


    const paragraphArray =
        safeText.split(
            /\n\s*\n/
        );


    return paragraphArray
        .map(
            paragraph => {

                return `
                    <p>
                        ${paragraph.replace(
                            /\n/g,
                            "<br>"
                        )}
                    </p>
                `;

            }
        )
        .join("");

}


/* =====================================================
   SHOW CURRENT PAGE
   ===================================================== */

function showCurrentPage() {

    if (!storyContent) {

        return;

    }


    if (
        !pages.length
    ) {

        return;

    }


    /*
     * Display page
     */

    storyContent.innerHTML =
        pages[currentPage];


    /*
     * Page indicator
     */

    updatePageIndicator();


    /*
     * Progress
     */

    updateReadingProgress();


    /*
     * Scroll to top
     *
     * This only resets the page container
     * and does not provide continuous reading.
     */

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });

}


/* =====================================================
   PAGE INDICATOR
   ===================================================== */

function updatePageIndicator() {

    if (!chapterProgress) {

        return;

    }


    /*
     * Existing chapter progress area
     * becomes:
     *
     * Page X of Y
     */

    chapterProgress.innerHTML = `

        <span>
            Page ${currentPage + 1}
        </span>

        <span class="progress-separator">
            /
        </span>

        <span>
            ${pages.length}
        </span>

    `;

}


/* =====================================================
   READING PROGRESS
   ===================================================== */

function updateReadingProgress() {

    if (!progressBar) {

        return;

    }


    let progress = 0;


    if (pages.length > 1) {

        progress =
            (
                currentPage /
                (pages.length - 1)
            ) * 100;

    }


    /*
     * Keep final page at 100%.
     */

    if (
        currentPage ===
        pages.length - 1
    ) {

        progress = 100;

    }


    progressBar.style.width =
        `${progress}%`;

}


/* =====================================================
   NEXT PAGE
   ===================================================== */

function nextPage() {

    /*
     * Next page inside chapter
     */

    if (
        currentPage <
        pages.length - 1
    ) {

        currentPage++;

        showCurrentPage();

        return;

    }


    /*
     * Last page of chapter
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
     * Last page of final chapter
     */

    window.location.href =
        `novel.html?id=${
            encodeURIComponent(
                novelId
            )
        }`;

}


/* =====================================================
   PREVIOUS PAGE
   ===================================================== */

function previousPage() {

    /*
     * Previous page inside chapter
     */

    if (
        currentPage > 0
    ) {

        currentPage--;

        showCurrentPage();

        return;

    }


    /*
     * First page of chapter
     *
     * Go to previous chapter
     * and open its last page.
     */

    if (
        chapterNumber > 1
    ) {

        chapterNumber--;

        displayChapter();

        /*
         * displayChapter starts
         * at page 1.
         *
         * We want the last page.
         */

        currentPage =
            pages.length - 1;

        showCurrentPage();

    }

}


/* =====================================================
   CHAPTER BUTTONS
   ===================================================== */

function updateChapterButtons() {

    if (!previousButton ||
        !nextButton) {

        return;

    }


    /*
     * These buttons now represent
     * page navigation.
     */

    previousButton.style.visibility =
        "visible";


    nextButton.style.visibility =
        "visible";


    previousButton.textContent =
        "← Previous";


    nextButton.textContent =
        chapterNumber ===
        chapters.length &&
        currentPage ===
        pages.length - 1
            ? "Finish →"
            : "Next →";

}


/* =====================================================
   BUTTON EVENTS
   ===================================================== */

if (previousButton) {

    previousButton.addEventListener(
        "click",
        previousPage
    );

}


if (nextButton) {

    nextButton.addEventListener(
        "click",
        nextPage
    );

}


/* =====================================================
   KEYBOARD NAVIGATION
   ===================================================== */

document.addEventListener(
    "keydown",
    function(event) {

        /*
         * Don't interfere while typing
         */

        const tag =
            event.target.tagName;

        if (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT"
        ) {

            return;

        }


        /*
         * Previous page
         */

        if (
            event.key === "ArrowLeft" ||
            event.key === "PageUp"
        ) {

            previousPage();

            event.preventDefault();

        }


        /*
         * Next page
         */

        if (
            event.key === "ArrowRight" ||
            event.key === "PageDown"
        ) {

            nextPage();

            event.preventDefault();

        }

    }
);


/* =====================================================
   TOUCH / SWIPE
   ===================================================== */

let touchStartX = 0;
let touchStartY = 0;

let touchEndX = 0;
let touchEndY = 0;


/*
 * Minimum distance required
 * for a swipe.
 */

const swipeThreshold = 60;


/* =====================================================
   TOUCH START
   ===================================================== */

document.addEventListener(
    "touchstart",
    function(event) {

        if (
            !event.touches ||
            !event.touches.length
        ) {

            return;

        }


        touchStartX =
            event.touches[0].clientX;

        touchStartY =
            event.touches[0].clientY;

    },
    {
        passive: true
    }
);


/* =====================================================
   TOUCH END
   ===================================================== */

document.addEventListener(
    "touchend",
    function(event) {

        if (
            !event.changedTouches ||
            !event.changedTouches.length
        ) {

            return;

        }


        touchEndX =
            event.changedTouches[0].clientX;

        touchEndY =
            event.changedTouches[0].clientY;


        handleSwipe();

    },
    {
        passive: true
    }
);


/* =====================================================
   HANDLE SWIPE
   ===================================================== */

function handleSwipe() {

    const horizontalDistance =
        touchEndX -
        touchStartX;


    const verticalDistance =
        touchEndY -
        touchStartY;


    /*
     * Ignore mostly vertical gestures.
     */

    if (
        Math.abs(horizontalDistance) <
        Math.abs(verticalDistance)
    ) {

        return;

    }


    /*
     * Ignore small movement.
     */

    if (
        Math.abs(horizontalDistance) <
        swipeThreshold
    ) {

        return;

    }


    /*
     * Swipe LEFT
     *
     * Move forward.
     */

    if (
        horizontalDistance < 0
    ) {

        nextPage();

    }


    /*
     * Swipe RIGHT
     *
     * Move backward.
     */

    else {

        previousPage();

    }

}


/* =====================================================
   UPDATE URL
   ===================================================== */

function updateURL() {

    const newUrl =
        `reader.html?id=${
            encodeURIComponent(
                novelId
            )
        }&chapter=${
            chapterNumber
        }`;


    window.history.pushState(
        {},
        "",
        newUrl
    );

}


/* =====================================================
   BROWSER BACK / FORWARD
   ===================================================== */

window.addEventListener(
    "popstate",
    function() {

        const currentParams =
            new URLSearchParams(
                window.location.search
            );


        chapterNumber =
            Number(
                currentParams.get(
                    "chapter"
                )
            ) || 1;


        if (
            chapterNumber < 1
        ) {

            chapterNumber = 1;

        }


        if (
            chapters.length > 0 &&
            chapterNumber >
            chapters.length
        ) {

            chapterNumber =
                chapters.length;

        }


        displayChapter();

    }
);


/* =====================================================
   WINDOW RESIZE
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

                    if (
                        chapters.length > 0
                    ) {

                        const chapter =
                            chapters[
                                chapterNumber - 1
                            ];


                        if (chapter) {

                            createPages(
                                chapter.content ||
                                ""
                            );


                            if (
                                currentPage >=
                                pages.length
                            ) {

                                currentPage =
                                    pages.length - 1;

                            }


                            showCurrentPage();

                        }

                    }

                },
                300
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
                    style="display:inline-block;margin-top:16px;"
                >
                    Return Home
                </a>

            </div>

        `;

    }


    if (chapterTitle) {

        chapterTitle.textContent =
            "Unable to open story";

    }


    if (chapterHeader) {

        chapterHeader.textContent =
            "";

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
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}