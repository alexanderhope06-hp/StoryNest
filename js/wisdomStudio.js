```javascript
// ============================================
// STORYNEST WISDOM STUDIO
// ============================================

let editingPostId = null;


// ============================================
// ELEMENTS
// ============================================

const form = document.getElementById("wisdomForm");

const postIdInput = document.getElementById("postId");

const titleInput = document.getElementById("title");

const categoryInput = document.getElementById("category");

const excerptInput = document.getElementById("excerpt");

const contentInput = document.getElementById("content");

const highlightInput = document.getElementById("highlight");

const authorNameInput = document.getElementById("authorName");

const statusInput = document.getElementById("status");

const postList = document.getElementById("postList");

const message = document.getElementById("message");

const editorTitle = document.getElementById("editorTitle");

const clearBtn = document.getElementById("clearBtn");

const logoutBtn = document.getElementById("logoutBtn");


// ============================================
// CHECK ADMIN
// ============================================

async function checkAdmin() {

    try {

        const {
            data: { user },
            error
        } = await supabase.auth.getUser();

        if (error || !user) {

            window.location.href = "login.html";

            return false;
        }


        const { data, error: adminError } =
            await supabase.rpc("is_wisdom_admin");


        if (adminError || !data) {

            alert("You are not authorized to access Wisdom Studio.");

            window.location.href = "index.html";

            return false;
        }


        return true;

    } catch (error) {

        console.error(error);

        alert("Unable to verify administrator.");

        window.location.href = "index.html";

        return false;
    }
}


// ============================================
// LOAD POSTS
// ============================================

async function loadPosts() {

    postList.innerHTML = "Loading posts...";


    const {
        data,
        error
    } = await supabase
        .from("wisdom_posts")
        .select("*")
        .order("created_at", {
            ascending: false
        });


    if (error) {

        console.error(error);

        postList.innerHTML =
            "<p>Unable to load posts.</p>";

        return;
    }


    if (!data || data.length === 0) {

        postList.innerHTML =
            "<p>You haven't created any wisdom posts yet.</p>";

        return;
    }


    postList.innerHTML = "";


    data.forEach(post => {

        const item = document.createElement("div");

        item.className = "post-item";


        const date = new Date(
            post.created_at
        ).toLocaleDateString();


        const statusClass =
            post.status === "published"
                ? "status-published"
                : "status-draft";


        item.innerHTML = `

            <h3>${escapeHTML(post.title)}</h3>

            <div class="post-meta">

                ${escapeHTML(
                    categoryName(post.category)
                )}

                • ${date}

                • ${post.views || 0} views

                <br><br>

                <span class="status ${statusClass}">
                    ${escapeHTML(post.status)}
                </span>

            </div>


            <div class="post-actions">

                <button
                    class="edit-btn"
                    onclick="editPost('${post.id}')"
                >
                    Edit
                </button>


                ${
                    post.status === "published"
                    ?
                    `
                    <button
                        class="view-btn"
                        onclick="viewPost('${post.id}')"
                    >
                        View
                    </button>
                    `
                    :
                    ""
                }


                <button
                    class="delete-btn"
                    onclick="deletePost('${post.id}')"
                >
                    Delete
                </button>

            </div>
        `;


        postList.appendChild(item);

    });

}


// ============================================
// CREATE / UPDATE POST
// ============================================

form.addEventListener("submit", async function(event) {

    event.preventDefault();


    const title = titleInput.value.trim();

    const category = categoryInput.value;

    const excerpt = excerptInput.value.trim();

    const content = contentInput.value.trim();

    const highlight = highlightInput.value.trim();

    const authorName =
        authorNameInput.value.trim() || "StoryNest";

    const status = statusInput.value;


    if (!title || !category || !content) {

        showMessage(
            "Please complete the required fields.",
            "error"
        );

        return;
    }


    const slug = createSlug(title);


    const postData = {

        title,

        category,

        excerpt,

        content,

        highlight,

        author_name: authorName,

        status,

        slug

    };


    showMessage(
        "Saving post...",
        "normal"
    );


    let result;


    if (editingPostId) {

        result = await supabase
            .from("wisdom_posts")
            .update(postData)
            .eq("id", editingPostId);

    } else {

        result = await supabase
            .from("wisdom_posts")
            .insert([postData]);

    }


    if (result.error) {

        console.error(result.error);

        showMessage(
            result.error.message,
            "error"
        );

        return;
    }


    showMessage(
        status === "published"
            ? "Post published successfully! 🔥"
            : "Draft saved successfully.",
        "success"
    );


    clearForm();

    await loadPosts();

});


// ============================================
// EDIT POST
// ============================================

async function editPost(id) {

    const {
        data,
        error
    } = await supabase
        .from("wisdom_posts")
        .select("*")
        .eq("id", id)
        .single();


    if (error) {

        alert("Unable to load this post.");

        console.error(error);

        return;
    }


    editingPostId = data.id;


    postIdInput.value = data.id;

    titleInput.value = data.title || "";

    categoryInput.value = data.category || "";

    excerptInput.value = data.excerpt || "";

    contentInput.value = data.content || "";

    highlightInput.value = data.highlight || "";

    authorNameInput.value =
        data.author_name || "StoryNest";

    statusInput.value =
        data.status || "draft";


    editorTitle.textContent =
        "Edit Wisdom Post";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ============================================
// DELETE POST
// ============================================

async function deletePost(id) {

    const confirmed = confirm(
        "Delete this wisdom post permanently?"
    );


    if (!confirmed) return;


    const {
        error
    } = await supabase
        .from("wisdom_posts")
        .delete()
        .eq("id", id);


    if (error) {

        console.error(error);

        alert(
            "Unable to delete post: " +
            error.message
        );

        return;
    }


    await loadPosts();

}


// ============================================
// VIEW POST
// ============================================

function viewPost(id) {

    window.location.href =
        `wisdom-post.html?id=${encodeURIComponent(id)}`;

}


// ============================================
// CLEAR FORM
// ============================================

function clearForm() {

    editingPostId = null;

    postIdInput.value = "";

    form.reset();

    authorNameInput.value = "StoryNest";

    statusInput.value = "draft";

    editorTitle.textContent =
        "Create New Post";

}


// ============================================
// CLEAR BUTTON
// ============================================

clearBtn.addEventListener(
    "click",
    clearForm
);


// ============================================
// LOGOUT
// ============================================

logoutBtn.addEventListener(
    "click",
    async function() {

        await supabase.auth.signOut();

        window.location.href =
            "login.html";

    }
);


// ============================================
// CATEGORY NAME
// ============================================

function categoryName(category) {

    const names = {

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


    return names[category] || category;

}


// ============================================
// CREATE SLUG
// ============================================

function createSlug(text) {

    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 100)
        +
        "-" +
        Date.now();

}


// ============================================
// SAFE HTML
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
// MESSAGE
// ============================================

function showMessage(text, type) {

    message.textContent = text;

    message.style.display = "block";


    if (type === "error") {

        message.style.background =
            "#ffe3e3";

        message.style.color =
            "#a00000";

    } else if (type === "success") {

        message.style.background =
            "#e3f8e8";

        message.style.color =
            "#16733a";

    } else {

        message.style.background =
            "#eee";

        message.style.color =
            "#333";

    }


    setTimeout(() => {

        message.style.display = "none";

    }, 4000);

}


// ============================================
// START
// ============================================

(async function() {

    const allowed = await checkAdmin();

    if (!allowed) return;

    await loadPosts();

})();
```
