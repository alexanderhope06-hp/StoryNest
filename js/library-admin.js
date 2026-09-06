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


    const sourceType =
        document
            .getElementById("sourceType")
            .value;


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
                        sourceType

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