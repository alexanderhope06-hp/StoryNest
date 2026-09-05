/* =====================================================
   STORYNEST — PAGE BASED READER
   ===================================================== */

const params = new URLSearchParams(window.location.search);

const novelId = params.get("id");

let chapterNumber =
    Number(params.get("chapter")) || 1;

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

const chapterTitle =
    document.getElementById("chapterTitle");

const storyContent =
    document.getElementById("storyContent");

const readerPageContent =
    document.getElementById("readerPageContent");

const progressBar =
    document.getElementById("readingProgress");


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

        console.error(
            "Chapter error:",
            chapterError
        );

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


    if (
        chapterNumber < 1 ||
        chapterNumber > chapters.length
    ) {

        chapterNumber = 1;
    }


    readerNovelTitle.textContent =
        novel.title;


    displayChapter();

}


/* =====================================================
   DISPLAY CHAPTER
   ===================================================== */

function displayChapter() {

    const chapter =
        chapters[chapterNumber - 1];


    if (!chapter) return;


    chapterHeader.textContent =
        `Chapter ${chapter.chapter_number}`;


    chapterTitle.textContent =
        chapter.title || "";


    document.title =
        `${chapter.title} — ${novel.title}`;


    /*
     * Put the entire chapter into a temporary
     * measurement container.
     */

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


    const content =
        chapter.content || "";


    /*
     * Create temporary measurement area.
     */

    const measure =
        document.createElement("div");

    measure.className =
        "reader-measure";


    document.body.appendChild(measure);


    /*
     * Copy the exact reader dimensions.
     */

    const availableHeight =
        getReaderHeight();


    measure.style.height =
        `${availableHeight}px`;


    /*
     * Add chapter title first.
     */

    const title =
        document.createElement("h1");

    title.className =
        "page-chapter-title";

    title.textContent =
        chapter.title || "";


    measure.appendChild(title);


    /*
     * Convert paragraphs.
     */

    const paragraphs =
        content
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(Boolean);


    /*
     * Build pages progressively.
     */

    let currentPageHTML = "";


    /*
     * Temporary page used to test
     * whether content fits.
     */

    const testPage =
        document.createElement("div");

    testPage.className =
        "reader-test-page";


    measure.innerHTML = "";

    measure.appendChild(testPage);


    /*
     * Add title first.
     */

    testPage.innerHTML =
        title.outerHTML;


    currentPageHTML =
        title.outerHTML;


    for (
        const paragraph of paragraphs
    ) {

        const words =
            paragraph.split(/\s+/);


        let currentParagraph = "";


        for (
            let i = 0;
            i < words.length;
            i++
        ) {

            const word =
                words[i];


            const candidate =
                currentParagraph
                    ? currentParagraph + " " + word
                    : word;


            const candidateHTML =
                `<p>${escapeHTML(candidate)}</p>`;


            testPage.innerHTML =
                currentPageHTML +
                candidateHTML;


            if (
                testPage.scrollHeight <=
                availableHeight
            ) {

                currentParagraph =
                    candidate;


            } else {

                /*
                 * Current paragraph no longer fits.
                 */

                if (currentParagraph) {

                    currentPageHTML +=
                        `<p>${escapeHTML(currentParagraph)}</p>`;

                }


                /*
                 * Save completed page.
                 */

                pages.push(
                    currentPageHTML
                );


                /*
                 * Start new page.
                 */

                currentPageHTML =
                    `<p>${escapeHTML(word)}`;


                /*
                 * Continue adding words
                 * to the new paragraph.
                 */

                currentParagraph =
                    word;


                testPage.innerHTML =
                    currentPageHTML +
                    "</p>";
            }
        }


        /*
         * Close paragraph.
         */

        if (currentParagraph) {

            const finalParagraph =
                `<p>${escapeHTML(currentParagraph)}</p>`;


            testPage.innerHTML =
                currentPageHTML +
                finalParagraph;


            if (
                testPage.scrollHeight <=
                availableHeight
            ) {

                currentPageHTML =
                    testPage.innerHTML;

            } else {

                pages.push(
                    currentPageHTML
                );


                currentPageHTML =
                    finalParagraph;
            }
        }
    }


    /*
     * Save final page.
     */

    if (
        currentPageHTML.trim()
    ) {

        pages.push(
            currentPageHTML
        );
    }


    measure.remove();


    /*
     * Safety fallback.
     */

    if (pages.length === 0) {

        pages.push(
            `<h1 class="page-chapter-title">${escapeHTML(chapter.title || "")}</h1>`
        );

    }

}


/* =====================================================
   GET AVAILABLE READING HEIGHT
   ===================================================== */

function getReaderHeight() {

    const header =
        document.querySelector(
            ".reader-header"
        );


    const adSpace =
        70;


    const headerHeight =
        header
            ? header.getBoundingClientRect().height
            : 70;


    /*
     * Small extra breathing room.
     */

    const safeSpace = 18;


    return Math.max(
        200,
        window.innerHeight -
        headerHeight -
        adSpace -
        safeSpace
    );

}


/* =====================================================
   SHOW CURRENT PAGE
   ===================================================== */

function showPage() {

    if (!pages.length) return;


    readerPageContent.innerHTML =
        pages[currentPage];


    /*
     * Always start the visible page
     * at the top.
     */

    readerPageContent.scrollTop = 0;


    /*
     * Progress through the chapter.
     */

    if (progressBar) {

        const progress =
            ((currentPage + 1) /
            pages.length) * 100;


        progressBar.style.width =
            `${progress}%`;
    }


    /*
     * Update browser title.
     */

    document.title =
        `${chapters[chapterNumber - 1].title} — ${novel.title}`;


    /*
     * Save reading position.
     */

    localStorage.setItem(
        `storynest-progress-${novelId}-${chapterNumber}`,
        currentPage
    );

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
   PREVIOUS PAGE
   ===================================================== */

function previousPage() {

    if (currentPage > 0) {

        currentPage--;

        showPage();

        return;
    }


    /*
     * Beginning of chapter.
     * Move to previous chapter.
     */

    if (chapterNumber > 1) {

        chapterNumber--;

        displayChapter();

        /*
         * Open the last page of
         * previous chapter.
         */

        setTimeout(() => {

            currentPage =
                pages.length - 1;

            showPage();

        }, 50);
    }

}


/* =====================================================
   KEYBOARD
   ===================================================== */

document.addEventListener(
    "keydown",
    function(event) {

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
   TOUCH / SWIPE
   ===================================================== */

let touchStartX = 0;
let touchStartY = 0;


document.addEventListener(
    "touchstart",
    function(event) {

        if (!event.touches.length)
            return;


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

        if (!event.changedTouches.length)
            return;


        const touch =
            event.changedTouches[0];


        const deltaX =
            touch.clientX -
            touchStartX;


        const deltaY =
            touch.clientY -
            touchStartY;


        /*
         * Ignore vertical gestures.
         */

        if (
            Math.abs(deltaX) < 50 ||
            Math.abs(deltaX) <
            Math.abs(deltaY)
        ) {

            return;
        }


        /*
         * Swipe left = next.
         */

        if (deltaX < 0) {

            nextPage();

        }


        /*
         * Swipe right = previous.
         */

        if (deltaX > 0) {

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
         * Ignore buttons, links and menu.
         */

        if (
            event.target.closest(
                "button, a, .reader-dropdown"
            )
        ) {

            return;
        }


        const width =
            window.innerWidth;


        /*
         * Left side = previous.
         */

        if (
            event.clientX <
            width * 0.30
        ) {

            previousPage();

            return;
        }


        /*
         * Right side = next.
         */

        if (
            event.clientX >
            width * 0.70
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
    function() {

        clearTimeout(resizeTimer);


        resizeTimer =
            setTimeout(
                function() {

                    const oldPage =
                        currentPage;


                    displayChapter();


                    /*
                     * Try to keep reader
                     * near the same page.
                     */

                    if (
                        pages.length
                    ) {

                        currentPage =
                            Math.min(
                                oldPage,
                                pages.length - 1
                            );

                        showPage();
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
    function() {

        const currentParams =
            new URLSearchParams(
                window.location.search
            );


        const newChapter =
            Number(
                currentParams.get("chapter")
            ) || 1;


        if (
            newChapter !== chapterNumber
        ) {

            chapterNumber =
                Math.max(
                    1,
                    Math.min(
                        newChapter,
                        chapters.length
                    )
                );


            displayChapter();
        }

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


    if (chapterTitle) {

        chapterTitle.textContent =
            "Unable to open story";
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