/* =====================================================
   STORYNEST - NOVEL STATISTICS
   ===================================================== */


const params =
    new URLSearchParams(
        window.location.search
    );


const novelId =
    params.get("id");


let currentUser = null;
let novel = null;


/* =====================================================
   ELEMENTS
   ===================================================== */

const statisticsTitle =
    document.getElementById(
        "statisticsTitle"
    );


const statisticsDescription =
    document.getElementById(
        "statisticsDescription"
    );


const novelTitle =
    document.getElementById(
        "novelTitle"
    );


const novelGenre =
    document.getElementById(
        "novelGenre"
    );


const novelStatus =
    document.getElementById(
        "novelStatus"
    );


const statusLabel =
    document.getElementById(
        "statusLabel"
    );


const totalReaders =
    document.getElementById(
        "totalReaders"
    );


const totalChapters =
    document.getElementById(
        "totalChapters"
    );


const novelRating =
    document.getElementById(
        "novelRating"
    );


const publishedDate =
    document.getElementById(
        "publishedDate"
    );


const statisticsCover =
    document.getElementById(
        "statisticsCover"
    );


const statisticsChapters =
    document.getElementById(
        "statisticsChapters"
    );


/* =====================================================
   CHECK NOVEL
   ===================================================== */

if (!novelId) {

    alert(
        "No novel selected."
    );


    window.location.href =
        "author.html";

} else {

    loadStatistics();

}


/* =====================================================
   LOAD STATISTICS
   ===================================================== */

async function loadStatistics() {


    /*
     * Check user
     */

    const {
        data: {
            user
        },
        error: userError
    } =
        await supabaseClient.auth.getUser();


    if (
        userError ||
        !user
    ) {

        window.location.href =
            "login.html";

        return;

    }


    currentUser =
        user;


    /*
     * Load author's novel
     */

    const {
        data,
        error
    } =
        await supabaseClient

            .from("novels")

            .select("*")

            .eq(
                "id",
                novelId
            )

            .eq(
                "author_id",
                user.id
            )

            .single();


    if (
        error ||
        !data
    ) {

        console.error(
            "Could not load novel:",
            error
        );


        alert(
            "Novel not found."
        );


        window.location.href =
            "author.html";

        return;

    }


    novel =
        data;


    displayNovel();


    loadChapterStatistics();

}


/* =====================================================
   DISPLAY NOVEL
   ===================================================== */

function displayNovel() {


    document.title =
        `Statistics — ${novel.title} — StoryNest`;


    statisticsTitle.textContent =
        `${novel.title} Statistics`;


    statisticsDescription.textContent =
        "View the performance of your story.";


    novelTitle.textContent =
        novel.title;


    novelGenre.textContent =
        novel.genre ||
        "Story";


    const status =
        novel.status === "published"
            ? "Published"
            : "Draft";


    novelStatus.textContent =
        status;


    statusLabel.textContent =
        `● ${status}`;


    /*
     * Readers
     *
     * Reader tracking will be implemented later.
     */

    totalReaders.textContent =
        "0";


    /*
     * Rating
     *
     * Rating system will be implemented later.
     */

    novelRating.textContent =
        "No rating";


    /*
     * Published date
     */

    if (
        novel.created_at
    ) {

        const date =
            new Date(
                novel.created_at
            );


        publishedDate.textContent =
            `Created: ${date.toLocaleDateString()}`;

    }


    /*
     * Cover placeholder
     */

    statisticsCover.textContent =
        novel.title;

}


/* =====================================================
   LOAD CHAPTER STATISTICS
   ===================================================== */

async function loadChapterStatistics() {


    const {
        data: chapters,
        error
    } =
        await supabaseClient

            .from("chapters")

            .select(
                "id, chapter_number, title, created_at"
            )

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


    if (error) {

        console.error(
            "Could not load chapters:",
            error
        );


        statisticsChapters.innerHTML = `

            <p>
                Could not load chapters.
            </p>

        `;


        return;

    }


    const count =
        chapters?.length || 0;


    totalChapters.textContent =
        count;


    /*
     * No chapters
     */

    if (
        !chapters ||
        chapters.length === 0
    ) {

        statisticsChapters.innerHTML = `

            <p>
                No chapters yet.
            </p>

        `;

        return;

    }


    /*
     * Display chapters
     */

    statisticsChapters.innerHTML =
        "";


    chapters.forEach(
        chapter => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "editor-chapter";


            item.innerHTML = `

                <div
                    class="editor-chapter-number"
                >

                    ${
                        chapter.chapter_number
                    }

                </div>


                <div
                    class="editor-chapter-info"
                >

                    <strong>

                        ${escapeHTML(
                            chapter.title
                        )}

                    </strong>


                    <span>

                        Chapter
                        ${
                            chapter.chapter_number
                        }

                    </span>

                </div>

            `;


            statisticsChapters.appendChild(
                item
            );

        }
    );

}


/* =====================================================
   HTML SAFETY
   ===================================================== */

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}