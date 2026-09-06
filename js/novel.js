/* =====================================================
   STORYNEST - NOVEL DETAILS
   ===================================================== */


/*
 * Get novel ID from URL
 *
 * Example:
 *
 * novel.html?id=xxxxxxxx
 */

const params =
    new URLSearchParams(
        window.location.search
    );


const novelId =
    params.get("id");


let novel = null;


/* =====================================================
   ELEMENTS
   ===================================================== */

const novelTitle =
    document.getElementById(
        "novelTitle"
    );


const coverTitle =
    document.getElementById(
        "coverTitle"
    );


const novelGenre =
    document.getElementById(
        "novelGenre"
    );


const novelAuthor =
    document.getElementById(
        "novelAuthor"
    );


const storyAbout =
    document.getElementById(
        "storyAbout"
    );


const novelStatus =
    document.getElementById(
        "novelStatus"
    );


const chapterCount =
    document.getElementById(
        "chapterCount"
    );


const chapterList =
    document.getElementById(
        "chapterList"
    );


const characterList =
    document.getElementById(
        "characterList"
    );


const startReading =
    document.getElementById(
        "startReading"
    );


/* =====================================================
   CHECK NOVEL ID
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
        data,
        error
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
     * Handle error
     */

    if (error || !data) {

        console.error(
            "Novel error:",
            error
        );


        showError(
            "This novel could not be found."
        );


        return;

    }


    /*
     * Store novel
     */

    novel =
        data;


    /*
     * Display novel
     */

    displayNovel();


    /*
     * Load chapters
     */

    loadChapters();


    /*
     * Load characters
     */

    loadCharacters();

}


/* =====================================================
   DISPLAY NOVEL
   ===================================================== */

function displayNovel() {

    /*
     * Browser title
     */

    document.title =
        `${novel.title} — StoryNest`;


    /*
     * Main title
     */

    if (novelTitle) {

        novelTitle.textContent =
            novel.title;

    }


    /*
     * Cover title
     */

    if (coverTitle) {

        coverTitle.textContent =
            novel.title;

    }


    /*
     * Genre
     */

    if (novelGenre) {

        novelGenre.textContent =
            novel.genre ||
            "STORY";

    }


    /*
     * Description
     *
     * Description appears only
     * in "About This Novel".
     */

    if (storyAbout) {

        storyAbout.textContent =
            novel.description ||
            "No description available.";

    }


    /*
     * Status
     */

    if (novelStatus) {

        novelStatus.textContent =
            novel.status ||
            "Published";

    }


    /*
     * Author
     *
     * Temporary until author
     * profiles are connected.
     */

    if (novelAuthor) {

        novelAuthor.textContent =
            "StoryNest Author";

    }


    /*
     * Start Reading
     */

    if (startReading) {

        startReading.addEventListener(
            "click",
            () => {

                window.location.href =
                    `reader.html?id=${
                        encodeURIComponent(
                            novelId
                        )
                    }&chapter=1`;

            }
        );

    }

}


/* =====================================================
   LOAD CHAPTERS
   ===================================================== */

async function loadChapters() {

    const {
        data: chapters,
        error
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
     * Handle error
     */

    if (error) {

        console.error(
            "Chapter error:",
            error
        );


        if (chapterList) {

            chapterList.innerHTML = `

                <p>
                    Could not load chapters.
                </p>

            `;

        }

        return;

    }


    /*
     * Chapter count
     */

    if (chapterCount) {

        chapterCount.textContent =
            chapters
                ? chapters.length
                : 0;

    }


    /*
     * No chapters
     */

    if (
        !chapters ||
        chapters.length === 0
    ) {

        if (chapterList) {

            chapterList.innerHTML = `

                <p>
                    No chapters available yet.
                </p>

            `;

        }

        return;

    }


    /*
     * Clear loading
     */

    chapterList.innerHTML = "";


    /*
     * Create chapter links
     */

    chapters.forEach(
        chapter => {

            const link =
                document.createElement(
                    "a"
                );


            link.className =
                "chapter";


            link.href =
                `reader.html?id=${
                    encodeURIComponent(
                        novelId
                    )
                }&chapter=${
                    chapter.chapter_number
                }`;


            link.innerHTML = `

                <div>

                    <span>

                        Chapter
                        ${
                            chapter.chapter_number
                        }

                    </span>


                    <small>

                        ${escapeHTML(
                            chapter.title
                        )}

                    </small>

                </div>


                <span>
                    →
                </span>

            `;


            chapterList.appendChild(
                link
            );

        }
    );

}


/* =====================================================
   LOAD CHARACTERS
   ===================================================== */

async function loadCharacters() {

    const {
        data: characters,
        error
    } = await supabaseClient

        .from("characters")

        .select("*")

        .eq(
            "novel_id",
            novelId
        )

        .order(
            "created_at",
            {
                ascending: true
            }
        );


    /*
     * Handle error
     */

    if (error) {

        console.error(
            "Character error:",
            error
        );


        if (characterList) {

            characterList.innerHTML = `

                <p>
                    Could not load characters.
                </p>

            `;

        }

        return;

    }


    /*
     * No characters
     */

    if (
        !characters ||
        characters.length === 0
    ) {

        if (characterList) {

            characterList.innerHTML = `

                <p>
                    No characters added yet.
                </p>

            `;

        }

        return;

    }


    /*
     * Clear loading
     */

    characterList.innerHTML = "";


    /*
     * Display characters
     */

    characters.forEach(
        character => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "character-card";


            card.innerHTML = `

                <p>

                    <strong>
                        Name:
                    </strong>

                    ${escapeHTML(
                        character.name
                    )}

                </p>


                <p>

                    <strong>
                        Role:
                    </strong>

                    ${escapeHTML(
                        character.role ||
                        "Character"
                    )}

                </p>


                <p>

                    <strong>
                        Description:
                    </strong>

                </p>


                <p class="character-description">

                    ${escapeHTML(
                        character.description ||
                        "No description available."
                    )}

                </p>

            `;


            characterList.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   ERROR
   ===================================================== */

function showError(message) {

    if (novelTitle) {

        novelTitle.textContent =
            "Novel unavailable";

    }


    if (coverTitle) {

        coverTitle.textContent =
            "Unavailable";

    }


    if (novelGenre) {

        novelGenre.textContent =
            "";

    }


    if (novelAuthor) {

        novelAuthor.textContent =
            "";

    }


    if (storyAbout) {

        storyAbout.textContent =
            message;

    }


    if (chapterList) {

        chapterList.innerHTML =
            "";

    }


    if (characterList) {

        characterList.innerHTML =
            "";

    }


    if (startReading) {

        startReading.disabled =
            true;

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