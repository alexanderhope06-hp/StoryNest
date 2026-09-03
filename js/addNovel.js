/* =====================================================
   STORYNEST - ADD NOVEL (COMPLETE UPDATED)
   ===================================================== */

const novelForm = document.getElementById("novelForm");

async function createNovel(event) {
    event.preventDefault();

    /*
     * Check logged-in user
     */
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        alert("Please login before creating a novel.");
        window.location.href = "login.html";
        return;
    }

    /*
     * Get form data
     */
    const title = document.getElementById("novelTitle").value.trim();
    const description = document.getElementById("novelDescription").value.trim();
    const genre = document.getElementById("novelGenre").value;

    if (!title || !description || !genre) {
        alert("Please complete all required fields.");
        return;
    }

    /*
     * Get author name from user metadata
     */
    const authorName = user.user_metadata?.display_name || 
                      user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'Author';

    /*
     * Show loading state
     */
    const submitButton = novelForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Creating...";

    /*
     * Insert novel into Supabase
     */
    const { data: novel, error } = await supabaseClient
        .from("novels")
        .insert({
            author_id: user.id,
            author_name: authorName,
            title: title,
            description: description,
            genre: genre,
            status: "draft"
        })
        .select()
        .single();

    /*
     * Handle error
     */
    if (error) {
        console.error("Create novel error:", error);
        alert("Could not create the novel:\n\n" + error.message);
        submitButton.disabled = false;
        submitButton.textContent = originalText;
        return;
    }

    /*
     * Success
     */
    console.log("Novel created successfully:", novel);
    
    // Show success message
    alert(`"${novel.title}" has been created!`);

    /*
     * Save the novel ID and redirect to characters page
     */
    localStorage.setItem("editingNovelId", novel.id);
    window.location.href = "characters.html";
}

/*
 * Initialize form event listener
 */
if (novelForm) {
    novelForm.addEventListener("submit", createNovel);
}

/*
 * Optional: Save Draft functionality
 */
const saveDraftBtn = document.querySelector('.secondary-btn[type="button"]');
if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', async function() {
        // Get form data
        const title = document.getElementById("novelTitle").value.trim();
        const description = document.getElementById("novelDescription").value.trim();
        const genre = document.getElementById("novelGenre").value;

        if (!title || !description || !genre) {
            alert("Please complete all required fields before saving.");
            return;
        }

        // Check user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            alert("Please login first.");
            window.location.href = "login.html";
            return;
        }

        // Get author name
        const authorName = user.user_metadata?.display_name || 
                          user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          user.email?.split('@')[0] || 
                          'Author';

        // Save as draft
        const { data: novel, error } = await supabaseClient
            .from("novels")
            .insert({
                author_id: user.id,
                author_name: authorName,
                title: title,
                description: description,
                genre: genre,
                status: "draft"
            })
            .select()
            .single();

        if (error) {
            alert("Could not save draft:\n\n" + error.message);
            return;
        }

        alert(`"${novel.title}" has been saved as a draft!`);
        localStorage.setItem("editingNovelId", novel.id);
        window.location.href = "author.html";
    });
}