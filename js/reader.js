/* =====================================================
   STORYNEST - PAGE READER
   ===================================================== */

const params = new URLSearchParams(window.location.search);

const novelId = params.get("id");
let chapterNumber = Number(params.get("chapter")) || 1;

let novel = null;
let chapters = [];

let pages = [];
let currentPage = 0;

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

    }


    readerNovelTitle.textContent =
        novel.title;


    buildChapter();

}


/* =====================================================
   BUILD CHAPTER
===================================================== */

function buildChapter() {

    const chapter =
        chapters[chapterNumber - 1];


    if (!chapter) return;


    chapterNumberElement.textContent =
        chapter.chapter_number;


    if (currentChapterNum) {

        currentChapterNum.textContent =
            chapter.chapter_number;

    }


    chapterHeader.textContent =
        `Chapter ${chapter.chapter_number}`;


    chapterTitle.textContent =
        chapter.title;


    document.title =
        `${chapter.title} — ${novel.title}`;


    /*
     * Remove old pages.
     */

    storyContent.innerHTML = "";


    /*
     * Get chapter text.
     */

    const content =
        (chapter.content || "").trim();


    /*
     * Create page system.
     */

    createPages(content);


    /*
     * Start at first page.
     */

    currentPage = 0;


    renderCurrentPage();


    updateURL();

}


/* =====================================================
   CREATE PAGES
===================================================== */

function createPages(content) {

    pages = [];


    if (!content) {

        pages.push("");

        return;
    }


    /*
     * Split chapter into paragraphs first.
     */

    const paragraphs =
        content
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(Boolean);


    /*
     * Create a hidden measuring area.
     */

    const measure =
        document.createElement("div");

    measure.className =
        "reader-measure";


    document.body.appendChild(measure);


    /*
     * Copy the same typography
     * used by the visible story.
     */

    const storyStyle =
        getComputedStyle(storyContent);


    measure.style.fontFamily =
        storyStyle.fontFamily;

    measure.style.fontSize =
        storyStyle.fontSize;

    measure.style.fontWeight =
        storyStyle.fontWeight;

    measure.style.lineHeight =
        storyStyle.lineHeight;

    measure.style.letterSpacing =
        storyStyle.letterSpacing;

    measure.style.width =
        `${storyContent.clientWidth}px`;


    /*
     * The CSS provides the exact available
     * reading height.
     */

    const availableHeight =
        storyContent.clientHeight;


    /*
     * Build one page at a time.
     */

    let currentPageText = "";


    for (let p = 0; p < paragraphs.length; p++) {

        const words =
            paragraphs[p].split(/\s+/);


        for (let w = 0; w < words.length; w++) {

            const word =
                words[w];


            const testText =
                currentPageText
                    ? currentPageText + " " + word
                    : word;


            measure.textContent =
                testText;


            /*
             * Check whether the text still
             * fits inside the page.
             */

            if (
                measure.scrollHeight <=
                availableHeight
            ) {

                currentPageText =
                    testText;

            } else {

                /*
                 * Current word doesn't fit.
                 * Save the page.
                 */

                if (currentPageText) {

                    pages.push(
                        currentPageText
                    );

                }


                /*
                 * Start a new page with
                 * the word that didn't fit.
                 */

                currentPageText =
                    word;

            }

        }


        /*
         * Preserve paragraph spacing.
         */

        if (p < paragraphs.length - 1) {

            const testText =
                currentPageText + "\n\n";


            measure.textContent =
                testText;


            if (
                measure.scrollHeight <=
                availableHeight
            ) {

                currentPageText =
                    testText;

            } else {

                if (currentPageText.trim()) {

                    pages.push(
                        currentPageText.trim()
                    );

                }

                currentPageText = "";

            }

        }

    }


    /*
     * Save final page.
     */

    if (currentPageText.trim()) {

        pages.push(
            currentPageText.trim()
        );

    }


    document.body.removeChild(measure);


    /*
     * Safety fallback.
     */

    if (pages.length === 0) {

        pages.push(content);

    }

}


/* =====================================================
   RENDER CURRENT PAGE
===================================================== */

function renderCurrentPage() {

    if (!pages.length) return;


    if (currentPage < 0) {

        currentPage = 0;

    }


    if (currentPage >= pages.length) {

        currentPage =
            pages.length - 1;

    }


    const text =
        pages[currentPage];


    storyContent.innerHTML = "";


    /*
     * Restore paragraph structure.
     */

    const paragraphs =
        text
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(Boolean);


    paragraphs.forEach(paragraph => {

        const p =
            document.createElement("p");

        p.textContent =
            paragraph;

        storyContent.appendChild(p);

    });


    /*
     * If there are no paragraph breaks,
     * still display the text.
     */

    if (!paragraphs.length) {

        const p =
            document.createElement("p");

        p.textContent =
            text;

        storyContent.appendChild(p);

    }


    /*
     * Update buttons.
     */

    updateNavigation();


    /*
     * Update URL.
     */

    updateURL();

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

        renderCurrentPage();

        return;
    }


    /*
     * Last page of chapter.
     * Move to next chapter.
     */

    if (
        chapterNumber <
        chapters.length
    ) {

        chapterNumber++;

        buildChapter();

        return;
    }


    /*
     * Last page of entire novel.
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

        renderCurrentPage();

        return;
    }


    /*
     * First page of chapter.
     * Move to previous chapter.
     */

    if (chapterNumber > 1) {

        chapterNumber--;

        buildChapter();

        /*
         * Start at the LAST page of
         * the previous chapter.
         */

        currentPage =
            pages.length - 1;

        renderCurrentPage();

    }

}


/* =====================================================
   NAVIGATION BUTTONS
===================================================== */

function updateNavigation() {

    if (!previousButton ||
        !nextButton) return;


    /*
     * These buttons can remain available
     * for accessibility/laptop users.
     */

    previousButton.style.visibility =
        "visible";


    nextButton.style.visibility =
        "visible";


    if (
        chapterNumber === 1 &&
        currentPage === 0
    ) {

        previousButton.style.visibility =
            "hidden";

    }


    const isLastPage =
        currentPage === pages.length - 1;


    const isLastChapter =
        chapterNumber === chapters.length;


    if (
        isLastPage &&
        isLastChapter
    ) {

        nextButton.textContent =
            "Finish →";

    } else {

        nextButton.textContent =
            "Next →";

    }


    /*
     * Chapter progress still shows
     * chapter number, not reading percentage.
     */

    if (currentChapterNum) {

        currentChapterNum.textContent =
            chapterNumber;

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
   KEYBOARD
===================================================== */

document.addEventListener(
    "keydown",
    function (event) {

        /*
         * Don't hijack arrow keys when
         * typing inside an input.
         */

        const tag =
            event.target.tagName.toLowerCase();


        if (
            tag === "input" ||
            tag === "textarea" ||
            tag === "select"
        ) {

            return;

        }


        if (event.key === "ArrowRight") {

            event.preventDefault();

            nextPage();

        }


        if (event.key === "ArrowLeft") {

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
    function (event) {

        if (!event.touches.length) return;


        touchStartX =
            event.touches[0].clientX;

        touchStartY =
            event.touches[0].clientY;

    },
    { passive: true }
);


document.addEventListener(
    "touchend",
    function (event) {

        if (!event.changedTouches.length) return;


        const touch =
            event.changedTouches[0];


        const endX =
            touch.clientX;

        const endY =
            touch.clientY;


        const differenceX =
            endX - touchStartX;

        const differenceY =
            endY - touchStartY;


        /*
         * Ignore vertical movement.
         */

        if (
            Math.abs(differenceX) < 50 ||
            Math.abs(differenceX) <
            Math.abs(differenceY)
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
    { passive: true }
);


/* =====================================================
   TAP LEFT / RIGHT
===================================================== */

document.addEventListener(
    "click",
    function (event) {

        /*
         * Don't activate page tapping on
         * buttons, links or menu.
         */

        if (
            event.target.closest("button") ||
            event.target.closest("a") ||
            event.target.closest(".reader-dropdown")
        ) {

            return;

        }


        const width =
            window.innerWidth;

        const x =
            event.clientX;


        /*
         * Left third = previous
         * Right third = next
         * Middle = nothing
         */

        if (x < width * 0.30) {

            previousPage();

        } else if (x > width * 0.70) {

            nextPage();

        }

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
   BROWSER BACK/FORWARD
===================================================== */

window.addEventListener(
    "popstate",
    function () {

        const currentParams =
            new URLSearchParams(
                window.location.search
            );


        const newChapter =
            Number(
                currentParams.get("chapter")
            ) || 1;


        if (
            newChapter >= 1 &&
            newChapter <= chapters.length
        ) {

            chapterNumber =
                newChapter;

            buildChapter();

        }

    }
);


/* =====================================================
   SCREEN RESIZE / ROTATION
===================================================== */

let resizeTimer;

window.addEventListener(
    "resize",
    function () {

        clearTimeout(resizeTimer);


        resizeTimer =
            setTimeout(
                function () {

                    if (!chapters.length) {
                        return;
                    }


                    /*
                     * Rebuild pages because the
                     * number of lines that fit
                     * changed.
                     */

                    buildChapter();

                },
                250
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
                <div class="reader-error-icon">📖</div>
                <h3>Something went wrong</h3>
                <p>${escapeHTML(message)}</p>
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

        chapterHeader.textContent = "";

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