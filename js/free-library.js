/* =========================================
   STORYNEST FREE LIBRARY
========================================= */

let freeLibraryBooks = [];


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    loadFreeLibrary();

    const searchInput =
        document.getElementById("librarySearch");

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            handleLibrarySearch
        );

    }

});


/* =========================================
   LOAD FREE BOOKS
========================================= */

async function loadFreeLibrary() {

    const grid =
        document.getElementById("libraryGrid");

    const count =
        document.getElementById("libraryCount");

    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("novels")

            .select(`
                id,
                title,
                description,
                cover_url,
                original_author,
                license,
                source_type,
                source_name,
                source_url,
                source_edition_url,
                license_url,
                attribution,
                copyright_note
            `)

            .eq("status", "published")

            .eq("license_verified", true)

            .in(
                "source_type",
                [
                    "public_domain",
                    "cc0"
                ]
            )

            .order(
                "title",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "FREE LIBRARY ERROR:",
                error
            );

            throw error;

        }


        freeLibraryBooks = data || [];


        renderBooks(
            freeLibraryBooks
        );


        updateCount(
            freeLibraryBooks.length
        );


    } catch (error) {

        console.error(
            "Could not load Free Library:",
            error
        );


        grid.innerHTML = `
            <div class="library-state library-error">
                <h2>Unable to open the Free Library</h2>
                <p>
                    Please try again later.
                </p>
            </div>
        `;


        count.textContent =
            "Unable to load library";

    }

}


/* =========================================
   RENDER BOOKS
========================================= */

function renderBooks(books) {

    const grid =
        document.getElementById("libraryGrid");


    if (!books.length) {

        grid.innerHTML = `
            <div class="library-state">
                <h2>
                    The library is waiting for its
                    first stories 📚
                </h2>

                <p>
                    Free-license books will appear here
                    once they are added to StoryNest.
                </p>
            </div>
        `;

        return;

    }


    grid.innerHTML =
        books
            .map(book => createBookCard(book))
            .join("");

}


/* =========================================
   BOOK CARD
========================================= */

function createBookCard(book) {

    const title =
        escapeHTML(
            book.title || "Untitled"
        );


    const author =
        escapeHTML(
            book.original_author ||
            "Unknown author"
        );


    const license =
        escapeHTML(
            getLicenseName(
                book.source_type,
                book.license
            )
        );


    let coverHTML;


    if (book.cover_url) {

        coverHTML = `
            <img
                class="library-cover"
                src="${escapeAttribute(book.cover_url)}"
                alt="${title} cover"
                loading="lazy"
            >
        `;

    } else {

        coverHTML = `
            <div class="library-cover-placeholder">
                ${title}
            </div>
        `;

    }


    return `

        <article class="library-card">

            ${coverHTML}

            <div class="library-card-body">

                <h2>
                    ${title}
                </h2>

                <p class="library-author">
                    ${author}
                </p>

                <span class="library-license">
                    ${license}
                </span>

                <p class="library-source">
                    ${escapeHTML(book.source_name || "Verified source")}
                </p>

                <button
                    class="library-read"
                    type="button"
                    onclick="openBook('${escapeAttribute(book.id)}')"
                >
                    Read Now
                </button>

            </div>

        </article>

    `;

}


/* =========================================
   OPEN BOOK
========================================= */

function openBook(bookId) {

    if (!bookId) {
        return;
    }


    window.location.href =
        `reader.html?id=${encodeURIComponent(bookId)}&chapter=1`;

}


/* =========================================
   SEARCH
========================================= */

function handleLibrarySearch(event) {

    const search =
        event.target.value
            .trim()
            .toLowerCase();


    if (!search) {

        renderBooks(
            freeLibraryBooks
        );

        updateCount(
            freeLibraryBooks.length
        );

        return;

    }


    const filtered =
        freeLibraryBooks.filter(book => {

            const title =
                String(
                    book.title || ""
                ).toLowerCase();


            const author =
                String(
                    book.original_author || ""
                ).toLowerCase();


            return (
                title.includes(search) ||
                author.includes(search)
            );

        });


    renderBooks(filtered);

    updateCount(
        filtered.length,
        true
    );

}


/* =========================================
   COUNT
========================================= */

function updateCount(
    number,
    filtered = false
) {

    const count =
        document.getElementById("libraryCount");


    if (!count) {
        return;
    }


    if (filtered) {

        count.textContent =
            `${number} result${number === 1 ? "" : "s"}`;

    } else {

        count.textContent =
            `${number} book${number === 1 ? "" : "s"} available`;

    }

}


/* =========================================
   LICENSE NAME
========================================= */

function getLicenseName(
    sourceType,
    license
) {

    if (license) {
        return license;
    }


    switch (sourceType) {

        case "public_domain":
            return "Public Domain";

        case "cc0":
            return "CC0";

        case "cc_by":
            return "CC BY";

        case "cc_by_sa":
            return "CC BY-SA";

        default:
            return "Free License";

    }

}


/* =========================================
   SECURITY HELPERS
========================================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function escapeAttribute(value) {

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}