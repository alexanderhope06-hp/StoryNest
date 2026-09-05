/* =====================================================
   STORYNEST — PAGE BASED READER
   =====================================================

   Features:
   - Responsive page size
   - Fixed top reader header
   - Chapter title never hidden
   - Automatic line-based pagination
   - Swipe left/right
   - Tap left/right
   - Keyboard arrows
   - Previous/next page
   - Automatic next chapter
   - Small permanent ad space at bottom
   ===================================================== */


/* =====================================================
   URL PARAMETERS
===================================================== */

const params = new URLSearchParams(window.location.search);

const novelId = params.get("id");

let chapterNumber =
    Number(params.get("chapter")) || 1;


/* =====================================================
   READER STATE
===================================================== */

let novel = null;
let chapters = [];

let currentPage = 0;

let pages = [];

let touchStartX = 0;
let touchStartY = 0;

let readerFontSize =
    Number(localStorage.getItem("readerFontSize")) || 18;


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
===================================================== */

async function loadNovel() {

    try {

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

            console.error(novelError);

            showError(
                "This novel could not be found."
            );

            return;
        }


        novel = novelData;


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

            console.error(chapterError);

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


        if (
            chapterNumber < 1 ||
            chapterNumber > chapters.length
        ) {

            chapterNumber = 1;
        }


        readerNovelTitle.textContent =
            novel.title;


        if (totalChaptersEl) {

            totalChaptersEl.textContent =
                chapters.length;
        }


        displayChapter();


    } catch (error) {

        console.error(
            "Reader error:",
            error
        );

        showError(
            "Something went wrong while opening this story."
        );

    }

}


/* =====================================================
   DISPLAY CHAPTER
===================================================== */

function displayChapter() {

    const chapter =
        chapters[chapterNumber - 1];


    if (!chapter) return;


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


    /*
     * Reset page position.
     */

    currentPage = 0;


    /*
     * Create pages.
     */

    createPages(
        chapter.content || ""
    );


    /*
     * Update chapter buttons.
     */

    previousButton.style.visibility =
        chapterNumber === 1
            ? "hidden"
            : "visible";


    nextButton.textContent =
        chapterNumber === chapters.length
            ? "Finish →"
            : "Next →";


    updateURL();


    /*
     * Display first page.
     */

    showPage();


    /*
     * Recalculate when the device rotates
     * or browser size changes.
     */

    setTimeout(() => {

        rebuildPagesIfNeeded();

    }, 100);

}


/* =====================================================
   CREATE PAGES
===================================================== */

function createPages(content) {

    pages = [];


    /*
     * Clean the chapter.
     */

    const cleanedContent =
        String(content)
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .trim();


    if (!cleanedContent) {

        pages.push(
            "<p>No content available.</p>"
        );

        return;
    }


    /*
     * Split into paragraphs.
     */

    const paragraphs =
        cleanedContent
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(Boolean);


    /*
     * We use a hidden measuring element.
     */

    const measure =
        document.createElement("div");


    measure.className =
        "reader-page-measurer";


    measure.style.fontSize =
        `${readerFontSize}px`;


    document.body.appendChild(measure);


    /*
     * Calculate the available page height.
     */

    const pageHeight =
        getPageHeight();


    measure.style.height =
        `${pageHeight}px`;


    /*
     * Keep building pages until all
     * paragraphs have been processed.
     */

    let currentHTML = "";


    for (
        let paragraphIndex = 0;
        paragraphIndex < paragraphs.length;
        paragraphIndex++
    ) {

        const paragraph =
            paragraphs[paragraphIndex];


        const words =
            paragraph.split(/\s+/);


        /*
         * Preserve paragraph spacing.
         */

        let paragraphHTML =
            "<p>";


        for (
            let wordIndex = 0;
            wordIndex < words.length;
            wordIndex++
        ) {

            const word =
                escapeHTML(words[wordIndex]);


            const testHTML =
                currentHTML +
                paragraphHTML +
                word +
                " " +
                "</p>";


            measure.innerHTML =
                testHTML;


            if (
                measure.scrollHeight <=
                pageHeight
            ) {

                paragraphHTML +=
                    word + " ";

            } else {

                /*
                 * Current page is full.
                 */

                if (currentHTML.trim()) {

                    pages.push(
                        currentHTML
                    );
                }


                /*
                 * Start a new page
                 * with the current word.
                 */

                currentHTML =
                    "<p>" +
                    word +
                    " ";


                paragraphHTML = "";

            }

        }


        /*
         * Close paragraph.
         */

        if (paragraphHTML) {

            paragraphHTML +=
                "</p>";


            const testHTML =
                currentHTML +
                paragraphHTML;


            measure.innerHTML =
                testHTML;


            if (
                measure.scrollHeight <=
                pageHeight
            ) {

                currentHTML =
                    testHTML;

            } else {

                if (currentHTML.trim()) {

                    pages.push(
                        currentHTML
                    );
                }


                currentHTML =
                    paragraphHTML;
            }

        } else {

            /*
             * Current paragraph was already
             * placed into currentHTML.
             */

        }


        /*
         * Add paragraph separation.
         */

        currentHTML +=
            "<div class='paragraph-space'></div>";

    }


    /*
     * Final page.
     */

    if (currentHTML.trim()) {

        pages.push(
            currentHTML
        );

    }


    document.body.removeChild(
        measure
    );


    /*
     * Safety fallback.
     */

    if (pages.length === 0) {

        pages.push(
            `<p>${escapeHTML(cleanedContent)}</p>`
        );

    }

}


/* =====================================================
   PAGE HEIGHT
===================================================== */

function getPageHeight() {

    /*
     * Reader header height.
     */

    const header =
        document.querySelector(
            ".reader-header"
        );


    const headerHeight =
        header
            ? header.getBoundingClientRect().height
            : 64;


    /*
     * Space reserved for advertisement.
     *
     * This prevents the final lines from
     * touching the bottom of the screen.
     */

    const adSpace = 72;


    /*
     * Additional safe spacing.
     */

    const safeSpace = 24;


    /*
     * Space used by chapter title.
     *
     * The title is OUTSIDE the page,
     * so it never covers story text.
     */

    const titleArea =
        chapterTitle
            ? chapterTitle.getBoundingClientRect().height + 30
            : 60;


    let height =
        window.innerHeight -
        headerHeight -
        titleArea -
        adSpace -
        safeSpace;


    /*
     * Prevent impossible sizes.
     */

    height =
        Math.max(
            height,
            180
        );


    return Math.floor(height);

}


/* =====================================================
   SHOW PAGE
===================================================== */

function showPage() {

    if (
        !pages.length ||
        !storyContent
    ) return;


    storyContent.innerHTML =
        pages[currentPage];


    storyContent.style.fontSize =
        `${readerFontSize}px`;


    /*
     * Update page progress.
     */

    updateReadingProgress();


    /*
     * Update buttons.
     */

    updatePageButtons();


    /*
     * Update chapter progress.
     */

    updateChapterProgress();

}


/* =====================================================
   PAGE PROGRESS
===================================================== */

function updateReadingProgress() {

    if (!progressBar) return;


    const progress =
        pages.length <= 1
            ? 100
            : (
                currentPage /
                (pages.length - 1)
            ) * 100;


    progressBar.style.width =
        `${Math.max(
            0,
            Math.min(
                progress,
                100
            )
        )}%`;

}


/* =====================================================
   PAGE BUTTONS
===================================================== */

function updatePageButtons() {

    /*
     * Previous chapter button actually
     * acts as previous page when there
     * are pages before the first page.
     */

    if (currentPage > 0) {

        previousButton.style.visibility =
            "visible";

        previousButton.textContent =
            "← Previous";

    } else {

        previousButton.style.visibility =
            chapterNumber === 1
                ? "hidden"
                : "← Previous Chapter";

    }


    /*
     * Next button.
     */

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
   NEXT PAGE
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
     * Current chapter is finished.
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
     * Final chapter.
     */

    window.location.href =
        `novel.html?id=${encodeURIComponent(novelId)}`;

}


/* =====================================================
   PREVIOUS PAGE
===================================================== */

function previousPage() {

    if (currentPage > 0) {

        currentPage--;

        showPage();

        return;
    }


    /*
     * If we're on the first page of a chapter,
     * go to the previous chapter's final page.
     */

    if (chapterNumber > 1) {

        chapterNumber--;

        displayChapter();


        /*
         * Wait until pages are rebuilt.
         */

        setTimeout(() => {

            currentPage =
                pages.length - 1;

            showPage();

        }, 50);

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
   KEYBOARD NAVIGATION
===================================================== */

document.addEventListener(
    "keydown",
    function(event) {

        /*
         * Do not turn arrow keys into page
         * navigation while typing in an input.
         */

        const target =
            event.target;


        if (
            target &&
            (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA"
            )
        ) {

            return;
        }


        if (
            event.key === "ArrowRight" ||
            event.key === "PageDown"
        ) {

            event.preventDefault();

            nextPage();

        }


        if (
            event.key === "ArrowLeft" ||
            event.key === "PageUp"
        ) {

            event.preventDefault();

            previousPage();

        }

    }
);


/* =====================================================
   TOUCH / SWIPE
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


        const differenceX =
            endX - touchStartX;


        const differenceY =
            endY - touchStartY;


        /*
         * Ignore vertical gestures.
         */

        if (
            Math.abs(differenceX) <
            Math.abs(differenceY)
        ) {

            return;
        }


        /*
         * Minimum swipe distance.
         */

        if (
            Math.abs(differenceX) <
            50
        ) {

            return;
        }


        if (differenceX < 0) {

            /*
             * Swipe LEFT = next page
             */

            nextPage();

        } else {

            /*
             * Swipe RIGHT = previous page
             */

            previousPage();

        }

    },
    {
        passive: true
    }
);


/* =====================================================
   TAP NAVIGATION
===================================================== */

document.addEventListener(
    "click",
    function(event) {

        /*
         * Don't interfere with buttons,
         * links or menus.
         */

        if (
            event.target.closest(
                "button, a, .reader-dropdown"
            )
        ) {

            return;
        }


        /*
         * Don't treat the menu/header as
         * reading area.
         */

        if (
            event.target.closest(
                ".reader-header"
            )
        ) {

            return;
        }


        const screenWidth =
            window.innerWidth;


        const clickX =
            event.clientX;


        /*
         * Left third = previous.
         */

        if (
            clickX <
            screenWidth / 3
        ) {

            previousPage();

            return;
        }


        /*
         * Right third = next.
         */

        if (
            clickX >
            (screenWidth * 2) / 3
        ) {

            nextPage();

        }

    }
);


/* =====================================================
   REBUILD AFTER RESIZE
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
                rebuildPagesIfNeeded,
                250
            );

    }
);


function rebuildPagesIfNeeded() {

    if (!chapters.length) return;


    const chapter =
        chapters[chapterNumber - 1];


    if (!chapter) return;


    /*
     * Remember approximately where
     * the reader was.
     */

    const oldPage =
        currentPage;


    createPages(
        chapter.content || ""
    );


    /*
     * Keep page within range.
     */

    currentPage =
        Math.min(
            oldPage,
            pages.length - 1
        );


    showPage();

}


/* =====================================================
   FONT SIZE
===================================================== */

window.setReaderFontSize =
    function(size) {

        readerFontSize =
            Number(size);


        localStorage.setItem(
            "readerFontSize",
            readerFontSize
        );


        rebuildPagesIfNeeded();

    };


/* =====================================================
   UPDATE URL
===================================================== */

function updateURL() {

    const newURL =
        `reader.html?id=${encodeURIComponent(
            novelId
        )}&chapter=${chapterNumber}`;


    window.history.replaceState(
        {},
        "",
        newURL
    );

}


/* =====================================================
   CHAPTER PROGRESS
===================================================== */

function updateChapterProgress() {

    if (!currentChapterNum) return;


    currentChapterNum.textContent =
        chapterNumber;


    if (totalChaptersEl) {

        totalChaptersEl.textContent =
            chapters.length;

    }

}


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


    if (nextButton) {

        nextButton.style.visibility =
            "hidden";

    }


    if (previousButton) {

        previousButton.style.visibility =
            "hidden";

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