/* =========================================
   STORYNEST LIBRARY ADMIN
   Adds public-domain / free-license novels
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    addChapter();

    document
        .getElementById("addChapter")
        ?.addEventListener("click", addChapter);

    document
        .getElementById("publishBook")
        ?.addEventListener("click", publishBook);

});


/* =========================================
   ADD CHAPTER
========================================= */

function addChapter() {

    const container =
        document.getElementById("chaptersContainer");

    if (!container) return;


    const chapterNumber =
        container.children.length + 1;


    const chapter = document.createElement("div");

    chapter.className = "chapter-row";


    chapter.innerHTML = `

        <div class="chapter-row-header">

            <strong>
                Chapter ${chapterNumber}
            </strong>

            <button
                type="button"
                class="remove-chapter"
            >
                Remove
            </button>

        </div>


        <div class="form-group">

            <label>
                Chapter title
            </label>

            <input
                type="text"
                class="chapter-title"
                placeholder="Example: Chapter One"
            >

        </div>


        <div class="form-group">

            <label>
                Chapter content
            </label>

            <textarea
                class="chapter-content"
                placeholder="Paste the chapter text here..."
            ></textarea>

        </div>

    `;


    chapter
        .querySelector(".remove-chapter")
        .addEventListener("click", () => {

            chapter.remove();

            renumberChapters();

        });


    container.appendChild(chapter);

}


/* =========================================
   RENUMBER CHAPTERS
========================================= */

function renumberChapters() {

    const chapters =
        document.querySelectorAll(".chapter-row");


    chapters.forEach((chapter, index) => {

        const heading =
            chapter.querySelector(
                ".chapter-row-header strong"
            );

        if (heading) {

            heading.textContent =
                `Chapter ${index + 1}`;

        }

    });

}


/* =========================================
   PUBLISH BOOK
========================================= */

async function publishBook() {

    const button =
        document.getElementById("publishBook");

    const message =
        document.getElementById("adminMessage");


    try {

        button.disabled = true;

        button.textContent =
            "Adding book...";


        hideMessage();


        /* -------------------------------------
           GET BOOK INFORMATION
        ------------------------------------- */

        const title =
            getValue("bookTitle");

        const originalAuthor =
            getValue("originalAuthor");

        const description =
            getValue("bookDescription");

        const coverUrl =
            getValue("coverUrl");


        /* -------------------------------------
           GET LICENSE INFORMATION
        ------------------------------------- */

        const sourceType =
            getValue("sourceType");


        const license =
            getValue("license");


        const sourceName =
            getValue("sourceName");


        const sourceUrl =
            getValue("sourceUrl");


        const attribution =
            getValue("attribution");


        /* -------------------------------------
           VALIDATION
        ------------------------------------- */

        if (!title) {

            throw new Error(
                "Please enter the book title."
            );

        }


        if (!originalAuthor) {

            throw new Error(
                "Please enter the original author."
            );

        }


        if (!license) {

            throw new Error(
                "Please enter the license."
            );

        }


        if (!sourceName) {

            throw new Error(
                "Please enter the source/library."
            );

        }


        if (!sourceUrl) {

            throw new Error(
                "Please enter the original source URL."
            );

        }


        /* -------------------------------------
           GET CHAPTERS
        ------------------------------------- */

        const chapterRows =
            document.querySelectorAll(
                ".chapter-row"
            );


        if (!chapterRows.length) {

            throw new Error(
                "Please add at least one chapter."
            );

        }


        const chapters = [];


        chapterRows.forEach((row, index) => {

            const chapterTitle =
                row
                    .querySelector(".chapter-title")
                    ?.value
                    .trim();


            const chapterContent =
                row
                    .querySelector(".chapter-content")
                    ?.value
                    .trim();


            if (!chapterTitle) {

                throw new Error(
                    `Please enter a title for Chapter ${index + 1}.`
                );

            }


            if (!chapterContent) {

                throw new Error(
                    `Please enter content for Chapter ${index + 1}.`
                );

            }


            chapters.push({

                chapter_number: index + 1,

                title: chapterTitle,

                content: chapterContent

            });

        });


        /* -------------------------------------
           CREATE NOVEL
        ------------------------------------- */

        const {
            data: novel,
            error: novelError
        } = await supabaseClient

            .from("novels")

            .insert({

                title: title,

                description:
                    description || null,

                cover_url:
                    coverUrl || null,

                author_id: null,

                status: "published",

                source_type: sourceType,

                license: license,

                original_author:
                    originalAuthor,

                source_name:
                    sourceName,

                source_url:
                    sourceUrl,

                attribution:
                    attribution || null

            })

            .select("id")
            .single();


        if (novelError) {

            console.error(
                "NOVEL INSERT ERROR:",
                novelError
            );

            throw new Error(
                novelError.message
            );

        }


        /* -------------------------------------
           CREATE CHAPTERS
        ------------------------------------- */

        const chapterRowsToInsert =
            chapters.map(chapter => ({

                novel_id: novel.id,

                chapter_number:
                    chapter.chapter_number,

                title:
                    chapter.title,

                content:
                    chapter.content

            }));


        const {
            error: chaptersError
        } = await supabaseClient

            .from("chapters")

            .insert(chapterRowsToInsert);


        if (chaptersError) {

            console.error(
                "CHAPTER INSERT ERROR:",
                chaptersError
            );


            /*
             * If chapters failed, remove the novel
             * so we don't leave an incomplete book.
             */

            await supabaseClient

                .from("novels")

                .delete()
                .eq("id", novel.id);


            throw new Error(
                chaptersError.message
            );

        }


        /* -------------------------------------
           SUCCESS
        ------------------------------------- */

        showMessage(
            "success",
            `✓ "${title}" has been added to the Free Library.`
        );


        button.textContent =
            "Book Added ✓";


        /*
         * Give Supabase a moment, then
         * return to the Free Library.
         */

        setTimeout(() => {

            window.location.href =
                "free-library.html";

        }, 1500);


    } catch (error) {

        console.error(
            "LIBRARY ADMIN ERROR:",
            error
        );


        showMessage(
            "error",
            error.message ||
            "Could not add the book."
        );


        button.disabled = false;

        button.textContent =
            "Add Book to Free Library";

    }

}


/* =========================================
   GET INPUT VALUE
========================================= */

function getValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return "";
    }


    return element.value.trim();

}


/* =========================================
   MESSAGE
========================================= */

function showMessage(type, text) {

    const message =
        document.getElementById("adminMessage");


    if (!message) return;


    message.className =
        `admin-message ${type}`;


    message.textContent =
        text;


    message.style.display =
        "block";

}


function hideMessage() {

    const message =
        document.getElementById("adminMessage");


    if (!message) return;


    message.className =
        "admin-message";


    message.textContent =
        "";


    message.style.display =
        "none";

}