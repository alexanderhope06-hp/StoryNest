import { supabase } from "./supabase.js";

const novelsContainer = document.getElementById("allNovels");
const novelCount = document.getElementById("novelCount");
const emptyState = document.getElementById("emptyState");

const genreButtons = document.querySelectorAll(
    ".novel-filters .genre-btn"
);

const searchBtn = document.getElementById("searchBtn");
const searchPanel = document.getElementById("searchPanel");
const searchInput = document.getElementById("searchInput");

let allNovels = [];


// =====================================================
// LOAD PUBLISHED NOVELS
// =====================================================

async function loadNovels() {

    console.log("Loading published novels...");

    novelsContainer.innerHTML = `
        <div class="loading-message">
            Loading published novels...
        </div>
    `;

    const { data, error } = await supabase
        .from("novels")
        .select("*")
        .eq("status", "published")
        .order("created_at", {
            ascending: false
        });


    if (error) {

        console.error("SUPABASE ERROR:", error);

        novelsContainer.innerHTML = `
            <div class="loading-message">
                Unable to load novels.
                <br><br>
                ${escapeHTML(error.message)}
            </div>
        `;

        novelCount.textContent = "Error loading novels";

        return;
    }


    console.log("Published novels:", data);

    allNovels = data || [];

    displayNovels(allNovels);
}


// =====================================================
// DISPLAY NOVELS
// =====================================================

function displayNovels(novels) {

    novelsContainer.innerHTML = "";


    novelCount.textContent =
        `${novels.length} ${
            novels.length === 1
                ? "novel"
                : "novels"
        } available`;


    if (novels.length === 0) {

        emptyState.style.display = "block";

        return;
    }


    emptyState.style.display = "none";


    novels.forEach(novel => {

        const card = document.createElement("a");

        card.className = "novel-card";

        card.href = `novel.html?id=${novel.id}`;


        const cover = novel.cover_url
            ? novel.cover_url
            : "image/fav.png";


        card.innerHTML = `

            <div class="novel-cover">

                <img
                    src="${escapeHTML(cover)}"
                    alt="${escapeHTML(
                        novel.title || "Novel"
                    )}"
                    loading="lazy"
                >

            </div>


            <div class="novel-info">

                <h3>
                    ${escapeHTML(
                        novel.title || "Untitled Novel"
                    )}
                </h3>

                <p class="novel-author">
                    StoryNest Author
                </p>

                <span class="novel-genre">
                    ${escapeHTML(
                        novel.genre || "General"
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

    button.addEventListener("click", () => {

        genreButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");


        const selectedGenre =
            button.dataset.genre;


        if (selectedGenre === "all") {

            displayNovels(allNovels);

            return;
        }


        const filteredNovels =
            allNovels.filter(novel => {

                return novel.genre === selectedGenre;

            });


        displayNovels(filteredNovels);

    });

});


// =====================================================
// SEARCH BUTTON
// =====================================================

if (searchBtn) {

    searchBtn.addEventListener("click", () => {

        searchPanel.classList.toggle("active");

        if (
            searchPanel.classList.contains("active")
            && searchInput
        ) {

            searchInput.focus();

        }

    });

}


// =====================================================
// SEARCH NOVELS
// =====================================================

if (searchInput) {

    searchInput.addEventListener("input", () => {

        const searchTerm =
            searchInput.value
                .toLowerCase()
                .trim();


        if (!searchTerm) {

            displayNovels(allNovels);

            return;
        }


        const results =
            allNovels.filter(novel => {

                const title =
                    (novel.title || "")
                        .toLowerCase();

                const genre =
                    (novel.genre || "")
                        .toLowerCase();

                const description =
                    (novel.description || "")
                        .toLowerCase();


                return (
                    title.includes(searchTerm) ||
                    genre.includes(searchTerm) ||
                    description.includes(searchTerm)
                );

            });


        displayNovels(results);

    });

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================================
// START
// =====================================================

loadNovels();