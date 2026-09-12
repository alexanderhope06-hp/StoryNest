/* =====================================================
   STORYNEST — ALL PUBLISHED NOVELS
   ===================================================== */


const novelsContainer = document.getElementById("allNovels");
const novelCount = document.getElementById("novelCount");
const emptyState = document.getElementById("emptyState");

const genreButtons =
    document.querySelectorAll(".novel-filters .genre-btn");

const searchBtn =
    document.getElementById("searchBtn");

const searchPanel =
    document.getElementById("searchPanel");

const searchInput =
    document.getElementById("searchInput");


let allNovels = [];


// =====================================================
// START
// =====================================================

loadNovels();


// =====================================================
// LOAD ALL PUBLISHED NOVELS
// =====================================================

async function loadNovels() {

    console.log("StoryNest: Loading published novels...");


    if (!novelsContainer) {

        console.error(
            "StoryNest: #allNovels was not found."
        );

        return;
    }


    novelsContainer.innerHTML = `
        <div class="loading-message">
            Loading published novels...
        </div>
    `;


    try {

        const {
            data: novelData,
            error: novelError
        } = await supabaseClient

            .from("novels")

            .select("*")

            .eq("status", "published")

            .order("created_at", {
                ascending: false
            });


        // =================================================
        // ERROR
        // =================================================

        if (novelError) {

            console.error(
                "StoryNest Novel Error:",
                novelError
            );


            novelsContainer.innerHTML = `
                <div class="loading-message">

                    <p>
                        Unable to load novels.
                    </p>

                    <small>
                        ${escapeHTML(
                            novelError.message ||
                            "Unknown Supabase error"
                        )}
                    </small>

                </div>
            `;


            if (novelCount) {
                novelCount.textContent =
                    "Unable to load novels";
            }


            return;
        }


        // =================================================
        // SAVE DATA
        // =================================================

        allNovels = novelData || [];


        console.log(
            "StoryNest: Published novels:",
            allNovels
        );


        displayNovels(allNovels);


    } catch (error) {

        console.error(
            "StoryNest: Unexpected error:",
            error
        );


        novelsContainer.innerHTML = `
            <div class="loading-message">

                <p>
                    Something went wrong.
                </p>

                <small>
                    ${escapeHTML(
                        error.message ||
                        "Unknown error"
                    )}
                </small>

            </div>
        `;


        if (novelCount) {
            novelCount.textContent =
                "Unable to load novels";
        }

    }

}


// =====================================================
// DISPLAY NOVELS
// =====================================================

function displayNovels(novels) {

    novelsContainer.innerHTML = "";


    if (novelCount) {

        novelCount.textContent =
            `${novels.length} ${
                novels.length === 1
                    ? "novel"
                    : "novels"
            } available`;

    }


    // =================================================
    // NO NOVELS
    // =================================================

    if (novels.length === 0) {

        if (emptyState) {
            emptyState.style.display = "block";
        }

        return;
    }


    if (emptyState) {
        emptyState.style.display = "none";
    }


    // =================================================
    // CREATE NOVEL CARDS
    // =================================================

    novels.forEach(novel => {

        const card =
            document.createElement("a");


        card.className = "novel-card";


        card.href =
            `novel.html?id=${encodeURIComponent(
                novel.id
            )}`;


        const cover =
            novel.cover_url ||
            "image/fav.png";


        card.innerHTML = `

            <div class="novel-cover">

                <img
                    src="${escapeHTML(cover)}"
                    alt="${escapeHTML(
                        novel.title ||
                        "StoryNest Novel"
                    )}"
                    loading="lazy"
                >

            </div>


            <div class="novel-info">

                <h3>
                    ${escapeHTML(
                        novel.title ||
                        "Untitled Novel"
                    )}
                </h3>


                <p class="novel-author">
                    StoryNest Author
                </p>


                <span class="novel-genre">
                    ${escapeHTML(
                        novel.genre ||
                        "General"
                    )}
                </span>

            </div>

        `;


        novelsContainer.appendChild(card);

    });

}


// =====================================================
// GENRE FILTER
// =====================================================

genreButtons.forEach(button => {

    button.addEventListener(
        "click",
        function () {

            // Remove active from all buttons

            genreButtons.forEach(btn => {

                btn.classList.remove("active");

            });


            // Activate selected button

            this.classList.add("active");


            const selectedGenre =
                this.dataset.genre;


            // ALL

            if (selectedGenre === "all") {

                displayNovels(allNovels);

                return;
            }


            // FILTER

            const filteredNovels =
                allNovels.filter(novel => {

                    return (
                        novel.genre ===
                        selectedGenre
                    );

                });


            displayNovels(filteredNovels);

        }
    );

});


// =====================================================
// SEARCH BUTTON
// =====================================================

if (searchBtn && searchPanel) {

    searchBtn.addEventListener(
        "click",
        function () {

            searchPanel.classList.toggle(
                "active"
            );


            if (
                searchPanel.classList.contains(
                    "active"
                )
            ) {

                if (searchInput) {
                    searchInput.focus();
                }

            }

        }
    );

}


// =====================================================
// SEARCH
// =====================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            const searchTerm =
                this.value
                    .toLowerCase()
                    .trim();


            // Empty search

            if (!searchTerm) {

                displayNovels(allNovels);

                return;
            }


            // Search title, genre and description

            const results =
                allNovels.filter(novel => {

                    const title =
                        (
                            novel.title ||
                            ""
                        ).toLowerCase();


                    const genre =
                        (
                            novel.genre ||
                            ""
                        ).toLowerCase();


                    const description =
                        (
                            novel.description ||
                            ""
                        ).toLowerCase();


                    return (

                        title.includes(
                            searchTerm
                        )

                        ||

                        genre.includes(
                            searchTerm
                        )

                        ||

                        description.includes(
                            searchTerm
                        )

                    );

                });


            displayNovels(results);

        }
    );

}


// =====================================================
// HTML SAFETY
// =====================================================

function escapeHTML(value) {

    const div =
        document.createElement("div");


    div.textContent =
        value ?? "";


    return div.innerHTML;

}