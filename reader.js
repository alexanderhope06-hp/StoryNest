/* =====================================================
   STORYNEST READER — PAGE TURNING VERSION
   ===================================================== */

/*
   Features:
   • No vertical scrolling
   • Swipe left/right
   • Tap left/right
   • Keyboard ← →
   • Page-by-page reading
   • Automatically moves between chapters
   • Responsive phone/laptop layout
*/

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

        console.error("Novel error:", novelError);

        showError("This novel could not be found.");

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
        .order("chapter_number", {
            ascending: true
        });


    if (chapterError) {

        console.error("Chapter error:", chapterError);

        showError("Could not load the chapters.");

        return;
    }


    chapters = chapterData || [];


    if (chapters.length === 0) {

        showError(
            "This novel does not have any chapters yet."
        );

        return;
    }


    if (totalChaptersEl) {

        totalChaptersEl.textContent =
            chapters.length;

    }


    if (
        chapterNumber < 1 ||
        chapterNumber > chapters.length
    ) {

        chapterNumber = 1;

        updateURL();

    }


    if (readerNovelTitle) {

        readerNovelTitle.textContent =
            novel.title;

    }


    displayChapter();

}


/* =====================================================
   DISPLAY CHAPTER
===================================================== */

function displayChapter() {

    const chapter =
        chapters[chapterNumber - 1];


    if (!chapter) return;


    if (chapterNumberElement) {

        chapterNumberElement.textContent =
            chapter.chapter_number;

    }


    if (currentChapterNum) {

        currentChapterNum.textContent =
            chapter.chapter_number;

    }


    if (chapterHeader) {

        chapterHeader.textContent =
            `Chapter ${chapter.chapter_number}`;

    }


    if (chapterTitle) {

        chapterTitle.textContent =
            chapter.title;

    }


    document.title =
        `${chapter.title} — ${novel.title}`;


    /*
     * Build pages.
     */
    createPages(
        chapter.content || ""
    );


    /*
     * Chapter buttons.
     */
    if (previousButton) {

        previousButton.style.visibility =
            chapterNumber === 1
                ? "hidden"
                : "visible";

    }


    if (nextButton) {

        nextButton.textContent =
            chapterNumber === chapters.length
                ? "Finish →"
                : "Next →";

    }


    updateURL();

}


/* =====================================================
   CREATE PAGES
===================================================== */

function createPages(content) {

    if (!storyContent) return;


    pages = [];
    currentPage = 0;


    /*
     * Remove old content.
     */
    storyContent.innerHTML = "";


    /*
     * Convert chapter into paragraphs.
     */
    const paragraphs =
        content
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(Boolean);


    /*
     * Create a temporary measuring container.
     */
    const measure =
        document.createElement("div");

    measure.className =
        "story-page measuring-page";


    measure.style.position =
        "absolute";

    measure.style.visibility =
        "hidden";

    measure.style.pointerEvents =
        "none";

    measure.style.left =
        "0";

    measure.style.top =
        "0";


    document.body.appendChild(measure);


    /*
     * Available page dimensions.
     */
    const pageHeight =
        getPageHeight();


    measure.style.height =
        `${pageHeight}px`;


    const pageWidth =
        getPageWidth();


    measure.style.width =
        `${pageWidth}px`;


    /*
     * Create pages.
     */
    let currentPageElement =
        createEmptyPage();


    for (const paragraph of paragraphs) {

        const p =
            document.createElement("p");

        p.textContent =
            paragraph;


        currentPageElement.appendChild(p);


        measure.appendChild(
            currentPageElement
        );


        /*
         * Check whether page is too tall.
         */
        if (
            currentPageElement.scrollHeight >
            pageHeight
        ) {

            /*
             * Remove paragraph.
             */
            currentPageElement.removeChild(p);


            /*
             * If the page already has content,
             * save it and create another page.
             */
            if (
                currentPageElement.children.length >
                0
            ) {

                pages.push(
                    currentPageElement
                );


                measure.innerHTML = "";


                currentPageElement =
                    createEmptyPage();


                /*
                 * Add paragraph to new page.
                 */
                currentPageElement.appendChild(p);

                measure.appendChild(
                    currentPageElement
                );

            } else {

                /*
                 * Paragraph itself is too large.
                 * Split it into smaller pieces.
                 */
                splitLargeParagraph(
                    paragraph,
                    measure,
                    pageHeight
                );

                measure.innerHTML = "";

                currentPageElement =
                    createEmptyPage();

            }

        }

    }


    /*
     * Save final page.
     */
    if (
        currentPageElement.children.length >
        0
    ) {

        pages.push(
            currentPageElement
        );

    }


    /*
     * Remove measuring container.
     */
    measure.remove();


    /*
     * Render pages.
     */
    storyContent.innerHTML = "";


    pages.forEach(
        (page, index) => {

            page.classList.add(
                "story-page"
            );

            page.dataset.page =
                index;

            storyContent.appendChild(
                page
            );

        }
    );


    showPage(0);

}


/* =====================================================
   EMPTY PAGE
===================================================== */

function createEmptyPage() {

    const page =
        document.createElement("div");

    page.className =
        "story-page";


    return page;

}


/* =====================================================
   SPLIT LARGE PARAGRAPH
===================================================== */

function splitLargeParagraph(
    text,
    measure,
    pageHeight
) {

    const words =
        text.split(/\s+/);


    let currentText = "";


    let page =
        createEmptyPage();


    measure.appendChild(page);


    for (const word of words) {

        const testText =
            currentText
                ? currentText + " " + word
                : word;


        const p =
            document.createElement("p");

        p.textContent =
            testText;


        page.innerHTML = "";

        page.appendChild(p);


        if (
            page.scrollHeight >
            pageHeight
        ) {

            /*
             * Save previous text.
             */
            const previousWords =
                currentText.split(/\s+/);


            if (previousWords.length > 0) {

                const savedPage =
                    createEmptyPage();


                const savedParagraph =
                    document.createElement("p");


                savedParagraph.textContent =
                    currentText;


                savedPage.appendChild(
                    savedParagraph
                );


                pages.push(
                    savedPage
                );

            }


            /*
             * Start new page.
             */
            currentText =
                word;


            page =
                createEmptyPage();


            measure.innerHTML = "";

            measure.appendChild(page);


        } else {

            currentText =
                testText;

        }

    }


    /*
     * Save remaining text.
     */
    if (currentText) {

        const finalPage =
            createEmptyPage();


        const finalParagraph =
            document.createElement("p");


        finalParagraph.textContent =
            currentText;


        finalPage.appendChild(
            finalParagraph
        );


        pages.push(
            finalPage
        );

    }

}


/* =====================================================
   PAGE DIMENSIONS
===================================================== */

function getPageHeight() {

    /*
     * Leave room for:
     * header
     * chapter title
     * bottom area
     */
    return Math.max(
        300,
        window.innerHeight - 190
    );

}


function getPageWidth() {

    return Math.min(
        window.innerWidth - 48,
        900
    );

}


/* =====================================================
   SHOW PAGE
===================================================== */

function showPage(index) {

    if (
        !pages.length ||
        index < 0 ||
        index >= pages.length
    ) {

        return;

    }


    currentPage = index;


    pages.forEach(
        (page, i) => {

            page.classList.toggle(
                "active",
                i === currentPage
            );

        }
    );


    /*
     * Page progress.
     */
    if (progressBar) {

        const percentage =
            pages.length <= 1
                ? 100
                : (
                    currentPage /
                    (pages.length - 1)
                ) * 100;


        progressBar.style.width =
            `${percentage}%`;

    }


    /*
     * Page number.
     *
     * We don't display it visibly.
     * It is only useful internally.
     */
}


/* =====================================================
   NEXT PAGE
===================================================== */

function nextPage() {

    if (
        currentPage <
        pages.length - 1
    ) {

        showPage(
            currentPage + 1
        );

        return;

    }


    /*
     * Last page of chapter.
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
     * Last chapter.
     */
    window.location.href =
        `novel.html?id=${encodeURIComponent(
            novelId
        )}`;

}


/* =====================================================
   PREVIOUS PAGE
===================================================== */

function previousPage() {

    if (currentPage > 0) {

        showPage(
            currentPage - 1
        );

        return;

    }


    /*
     * First page of chapter.
     */
    if (chapterNumber > 1) {

        chapterNumber--;

        displayChapter();

        /*
         * Open the LAST page of previous chapter.
         */
        setTimeout(() => {

            showPage(
                pages.length - 1
            );

        }, 50);

    }

}


/* =====================================================
   CHAPTER BUTTONS
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
   KEYBOARD
===================================================== */

document.addEventListener(
    "keydown",
    function (event) {

        /*
         * Don't interfere with typing.
         */
        if (
            event.target.tagName === "INPUT" ||
            event.target.tagName === "TEXTAREA"
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
   TOUCH SWIPE
===================================================== */

let touchStartX = 0;
let touchStartY = 0;

let touchEndX = 0;
let touchEndY = 0;


document.addEventListener(
    "touchstart",
    function (event) {

        const touch =
            event.changedTouches[0];

        touchStartX =
            touch.clientX;

        touchStartY =
            touch.clientY;

    },
    { passive: true }
);


document.addEventListener(
    "touchend",
    function (event) {

        const touch =
            event.changedTouches[0];

        touchEndX =
            touch.clientX;

        touchEndY =
            touch.clientY;


        handleSwipe();

    },
    { passive: true }
);


function handleSwipe() {

    const differenceX =
        touchEndX - touchStartX;

    const differenceY =
        touchEndY - touchStartY;


    /*
     * Ignore vertical gestures.
     */
    if (
        Math.abs(differenceY) >
        Math.abs(differenceX)
    ) {

        return;

    }


    /*
     * Minimum swipe distance.
     */
    if (
        Math.abs(differenceX) < 50
    ) {

        return;

    }


    /*
     * Swipe LEFT = next page.
     * Swipe RIGHT = previous page.
     */
    if (differenceX < 0) {

        nextPage();

    } else {

        previousPage();

    }

}


/* =====================================================
   TAP LEFT / RIGHT
===================================================== */

document.addEventListener(
    "click",
    function (event) {

        /*
         * Ignore buttons and menus.
         */
        if (
            event.target.closest(
                "button, a, .reader-dropdown"
            )
        ) {

            return;

        }


        const screenWidth =
            window.innerWidth;


        const x =
            event.clientX;


        /*
         * Left 30% = previous.
         * Right 30% = next.
         *
         * Center area does nothing.
         */
        if (
            x < screenWidth * 0.30
        ) {

            previousPage();

        } else if (
            x > screenWidth * 0.70
        ) {

            nextPage();

        }

    }
);


/* =====================================================
   RESIZE
===================================================== */

let resizeTimer;


window.addEventListener(
    "resize",
    function () {

        clearTimeout(resizeTimer);


        resizeTimer =
            setTimeout(
                function () {

                    if (
                        chapters.length
                    ) {

                        displayChapter();

                    }

                },
                250
            );

    }
);


/* =====================================================
   URL
===================================================== */

function updateURL() {

    const newUrl =
        `reader.html?id=${encodeURIComponent(
            novelId
        )}&chapter=${chapterNumber}`;


    window.history.replaceState(
        {},
        "",
        newUrl
    );

}


/* =====================================================
   BROWSER BACK/FORWARD
===================================================== */

window.addEventListener(
    "popstate",
    function () {

        const currentParams =
            new URLSearchParams(
                window.location.search
            );


        chapterNumber =
            Number(
                currentParams.get("chapter")
            ) || 1;


        if (
            chapterNumber < 1
        ) {

            chapterNumber = 1;

        }


        if (
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