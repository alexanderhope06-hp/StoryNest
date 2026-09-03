/* =====================================================
   STORYNEST - EDIT NOVEL
   ===================================================== */

const params = new URLSearchParams(window.location.search);
const novelId = params.get('id');

const editForm = document.getElementById('editNovelForm');
const titleInput = document.getElementById('novelTitle');
const descriptionInput = document.getElementById('novelDescription');
const genreInput = document.getElementById('novelGenre');
const statusInput = document.getElementById('novelStatus');
const saveButton = document.getElementById('saveNovel');
const manageChapters = document.getElementById('manageChapters');
const manageCharacters = document.getElementById('manageCharacters');

let currentUser = null;

if (!novelId) {
    showToast('No novel selected.', 'error');
    setTimeout(() => window.location.href = 'author.html', 1500);
} else {
    loadNovel();
}

async function loadNovel() {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    const { data: novel, error } = await supabaseClient
        .from('novels')
        .select('*')
        .eq('id', novelId)
        .eq('author_id', user.id)
        .single();
    
    if (error || !novel) {
        console.error('Could not load novel:', error);
        showToast('Novel not found.', 'error');
        setTimeout(() => window.location.href = 'author.html', 1500);
        return;
    }
    
    titleInput.value = novel.title || '';
    descriptionInput.value = novel.description || '';
    genreInput.value = novel.genre || '';
    statusInput.value = novel.status || 'draft';
    
    document.title = `Edit ${novel.title} — StoryNest`;
}

editForm.addEventListener('submit', saveNovelChanges);

async function saveNovelChanges(event) {
    event.preventDefault();
    
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const genre = genreInput.value;
    
    if (!title || !description || !genre) {
        showToast('Please complete all fields.', 'error');
        return;
    }
    
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    const { data, error } = await supabaseClient
        .from('novels')
        .update({ title, description, genre })
        .eq('id', novelId)
        .eq('author_id', currentUser.id)
        .select()
        .single();
    
    if (error) {
        console.error('Could not update novel:', error);
        showToast('Could not save changes: ' + error.message, 'error');
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
        return;
    }
    
    console.log('Novel updated:', data);
    showToast('Novel updated successfully!');
    setTimeout(() => window.location.href = 'author.html', 1000);
}

if (manageChapters) {
    manageChapters.addEventListener('click', () => {
        window.location.href = `chapters.html?id=${encodeURIComponent(novelId)}`;
    });
}

if (manageCharacters) {
    manageCharacters.addEventListener('click', () => {
        window.location.href = `characters.html?id=${encodeURIComponent(novelId)}`;
    });
}