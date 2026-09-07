/* =========================================
   STORYNEST FREE LIBRARY IMPORTER
========================================= */


document.addEventListener(
    "DOMContentLoaded",
    () => {

        const button =
            document.getElementById(
                "importButton"
            );


        if (button) {

            button.addEventListener(
                "click",
                importBook
            );

        }

        const starterButton =
            document.getElementById("starterImportButton");

        if (starterButton) {
            starterButton.addEventListener(
                "click",
                importStarterCollection
            );
        }

    }
);


/* =========================================
   IMPORT BOOK
========================================= */

async function importBook() {

    const button =
        document.getElementById(
            "importButton"
        );


    const message =
        document.getElementById(
            "adminMessage"
        );


    const adminKey =
        document
            .getElementById("adminKey")
            .value
            .trim();


    const bookUrl =
        document
            .getElementById("bookUrl")
            .value
            .trim();


    const sourceName =
        document
            .getElementById("sourceName")
            .value
            .trim();


    if (!adminKey) {

        showMessage(
            "error",
            "Enter your Library Admin Key."
        );

        return;

    }


    if (!bookUrl) {

        showMessage(
            "error",
            "Enter the direct EPUB URL."
        );

        return;

    }


    try {

        new URL(bookUrl);

    } catch {

        showMessage(
            "error",
            "The EPUB URL is not valid."
        );

        return;

    }


    button.disabled = true;

    button.textContent =
        "Importing book...";


    hideMessage();


    try {

        const {
            data: sessionData
        } =
            await supabaseClient
                .auth
                .getSession();


        const session =
            sessionData?.session;


        if (!session) {

            throw new Error(
                "You must be logged into StoryNest before importing a book."
            );

        }


        const functionUrl =
            `${SUPABASE_URL}/functions/v1/import-free-book`;


        const response =
            await fetch(functionUrl, {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${session.access_token}`,

                    "x-library-admin-key":
                        adminKey

                },

                body: JSON.stringify({

                    book_url: bookUrl,

                    source_name:
                        sourceName,

                    source_type:
                        "cc0"

                })

            });


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "The import failed."
            );

        }


        showMessage(
            "success",
            `✓ "${result.title}" was imported successfully with ${result.chapter_count} chapters.`
        );


        button.textContent =
            "Imported ✓";


        setTimeout(() => {

            window.location.href =
                "free-library.html";

        }, 1800);


    } catch (error) {

        console.error(
            "FREE LIBRARY IMPORT ERROR:",
            error
        );


        showMessage(
            "error",
            error.message ||
            "Could not import the book."
        );


        button.disabled =
            false;


        button.textContent =
            "Import Book";

    }

}


/* =========================================
   MESSAGE
========================================= */

function showMessage(
    type,
    text
) {

    const message =
        document.getElementById(
            "adminMessage"
        );


    message.className =
        `admin-message ${type}`;


    message.textContent =
        text;


    message.style.display =
        "block";

}


function hideMessage() {

    const message =
        document.getElementById(
            "adminMessage"
        );


    message.className =
        "admin-message";


    message.textContent =
        "";


    message.style.display =
        "none";

}

/* =========================================
   STARTER COLLECTION
   =========================================
   These are Standard Ebooks editions of classic
   works. The server independently verifies that
   the source is Standard Ebooks and records CC0.
========================================= */

const STORYNEST_STARTER_BOOKS = [
    "https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice",
    "https://standardebooks.org/ebooks/mary-shelley/frankenstein",
    "https://standardebooks.org/ebooks/charlotte-bronte/jane-eyre",
    "https://standardebooks.org/ebooks/bram-stoker/dracula",
    "https://standardebooks.org/ebooks/herman-melville/moby-dick",
    "https://standardebooks.org/ebooks/charles-dickens/a-tale-of-two-cities",
    "https://standardebooks.org/ebooks/l-frank-baum/the-wonderful-wizard-of-oz",
    "https://standardebooks.org/ebooks/lewis-carroll/alices-adventures-in-wonderland/john-tenniel"
];

async function importStarterCollection() {

    const starterButton =
        document.getElementById("starterImportButton");

    const adminKey =
        document.getElementById("adminKey").value.trim();

    if (!adminKey) {
        showMessage(
            "error",
            "Enter your Library Admin Key first."
        );
        return;
    }

    const {
        data: sessionData
    } = await supabaseClient.auth.getSession();

    const session = sessionData?.session;

    if (!session) {
        showMessage(
            "error",
            "You must be logged into StoryNest before importing books."
        );
        return;
    }

    starterButton.disabled = true;
    starterButton.textContent = "Importing starter collection...";

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const bookUrl of STORYNEST_STARTER_BOOKS) {

        try {

            const response = await fetch(
                `${SUPABASE_URL}/functions/v1/import-free-book`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session.access_token}`,
                        "x-library-admin-key": adminKey
                    },
                    body: JSON.stringify({
                        book_url: bookUrl,
                        source_name: "Standard Ebooks",
                        source_type: "cc0"
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                skipped++;
                errors.push(result.error || bookUrl);
            } else {
                imported++;
            }

        } catch (error) {
            skipped++;
            errors.push(error.message || bookUrl);
        }

        // Be gentle with the source and Supabase.
        await new Promise(resolve => setTimeout(resolve, 700));
    }

    if (imported) {

        showMessage(
            "success",
            `✓ Starter collection finished: ${imported} imported, ${skipped} skipped.`
        );

    } else {

        showMessage(
            "error",
            `No books were imported. ${errors[0] || "Check the error and try again."}`
        );

    }

    starterButton.disabled = false;
    starterButton.textContent = "Import Starter Collection";

}
