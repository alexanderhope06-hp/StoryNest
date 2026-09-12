// ============================================
// STORYNEST — LIFE & WISDOM
// ============================================

const wisdomPosts =
    document.getElementById("wisdomPosts");

const categoryFilters =
    document.getElementById("categoryFilters");

let allPosts = [];


// ============================================
// CATEGORY NAMES
// ============================================

const categoryNames = {

    "my-son":
        "My Son",

    "my-daughter":
        "My Daughter",

    "my-friend":
        "My Friend",

    "my-enemy":
        "My Enemy",

    "things-nobody-tells-you":
        "Things Nobody Tells You",

    "life-is-funny":
        "Life Is Funny",

    "hard-truths":
        "Hard Truths",

    "before-you-love-someone":
        "Before You Love Someone",

    "one-minute-wisdom":
        "One Minute Wisdom"

};


// ============================================
// LOAD PUBLISHED POSTS
// ============================================

async function loadWisdomPosts() {

    wisdomPosts.innerHTML = `
        <div class="loading-state">
            Loading wisdom...
        </div>
    `;


    const {
        data,
        error
    } = await supabase

        .from("wisdom_posts")

        .select(`
            id,
            title,
            category,
            excerpt,
            highlight,
            author_name,
            created_at
        `)

        .eq("status", "published")

        .order("created_at", {
            ascending: false
        });


    if (error) {

        console.error(
            "Wisdom loading error:",
            error
        );

        wisdomPosts.innerHTML = `
            <div class="empty-state">
                <h2>Something went wrong.</h2>
                <p>
                    We couldn't load the wisdom posts.
                    Please try again later.
                </p>
            </div>
        `;

        return;
    }


    allPosts = data || [];


    if (allPosts.length === 0) {

        wisdomPosts.innerHTML = `
            <div class="empty-state">

                <h2>Wisdom is coming...</h2>

                <p>
                    Our first Life & Wisdom posts
                    will appear here soon.
                </p>

            </div>
        `;

        return;
    }


    displayPosts(allPosts);

    applyCategoryFromURL();
}


// ============================================
// DISPLAY POSTS
// ============================================

function displayPosts(posts) {

    if (!posts || posts.length === 0) {

        wisdomPosts.innerHTML = `
            <div class="empty-state">

                <h2>No posts found.</h2>

                <p>
                    Try another category.
                </p>

            </div>
        `;

        return;
    }


    wisdomPosts.innerHTML = "";


    posts.forEach(post => {

        const card =
            document.createElement("article");

        card.className =
            "wisdom-card";


        const category =
            categoryNames[post.category]
            || post.category;


        const excerpt =
            post.excerpt
            || "A thought worth reading.";


        card.innerHTML = `

            <div class="wisdom-category">
                ${escapeHTML(category)}
            </div>


            <h2>
                ${escapeHTML(post.title)}
            </h2>


            <p>
                ${escapeHTML(excerpt)}
            </p>


            ${
                post.highlight
                ?
                `
                <div class="highlight-box">
                    ${escapeHTML(post.highlight)}
                </div>
                `
                :
                ""
            }


            <a
                class="read-wisdom"
                href="wisdom-post.html?id=${encodeURIComponent(post.id)}"
            >
                Read More →
            </a>

        `;


        wisdomPosts.appendChild(card);

    });

}


// ============================================
// FILTER
// ============================================

categoryFilters.addEventListener(
    "click",
    function(event) {

        const button =
            event.target.closest(
                ".category-btn"
            );


        if (!button) return;


        const category =
            button.dataset.category;


        document
            .querySelectorAll(
                ".category-btn"
            )
            .forEach(btn => {

                btn.classList.remove(
                    "active"
                );

            });


        button.classList.add("active");


        if (category === "all") {

            displayPosts(allPosts);

        } else {

            const filtered =
                allPosts.filter(
                    post =>
                        post.category === category
                );

            displayPosts(filtered);

        }


        const url =
            new URL(
                window.location.href
            );


        if (category === "all") {

            url.searchParams.delete(
                "category"
            );

        } else {

            url.searchParams.set(
                "category",
                category
            );

        }


        window.history.replaceState(
            {},
            "",
            url
        );

    }
);


// ============================================
// CATEGORY FROM URL
// ============================================

function applyCategoryFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const category =
        params.get("category");


    if (!category) return;


    const button =
        document.querySelector(
            `.category-btn[data-category="${CSS.escape(category)}"]`
        );


    if (!button) return;


    document
        .querySelectorAll(
            ".category-btn"
        )
        .forEach(btn => {

            btn.classList.remove(
                "active"
            );

        });


    button.classList.add("active");


    const filtered =
        allPosts.filter(
            post =>
                post.category === category
        );


    displayPosts(filtered);
}


// ============================================
// ESCAPE HTML
// ============================================

function escapeHTML(value) {

    if (!value) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================
// START
// ============================================

loadWisdomPosts();