/* =====================================================
   STORYNEST - CHAPTER EDITOR
   ===================================================== */

/* =====================================================
   URL PARAMS
   ===================================================== */

const params = new URLSearchParams(window.location.search);
const novelId = params.get('id');

/* =====================================================
   ELEMENTS
   ===================================================== */

const novelTitleDisplay = document.getElementById('novelTitleDisplay');
const novelGenreDisplay = document.getElementById('novelGenreDisplay');
const chapterTitle = document.getElementById('chapterTitle');
const chapterContent = document.getElementById('chapterContent');
const chapterList = document.getElementById('chapterList');
const chapterCount = document.getElementById('chapterCount');
const saveChapterButton = document.getElementById('saveChapter');
const clearChapterButton = document.getElementById('clearChapter');
const publishNovelButton = document.getElementById('publishNovel');

let currentUser = null;
let novel = null;
let editingChapterId = null;

/* =====================================================
   CHECK NOVEL
   ===================================================== */

if (!novelId) {
    showToast('No novel selected. Please choose a novel first.', 'error');
    setTimeout(() => window.location.href = 'author.html', 1500);
} else {
    initializeChapterEditor();
}

/* =====================================================
   INITIALIZE
   ===================================================== */

async function initializeChapterEditor() {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
        redirectToLogin('chapters.html');
        return;
    }
    
    currentUser = user;
    
    // Load novel
    const { data, error } = await supabaseClient
        .from('novels')
        .select('*')
        .eq('id', novelId)
        .eq('author_id', user.id)
        .single();
    
    if (error || !data) {
        console.error('Could not load novel:', error);
        showToast('Novel not found or you do not have permission.', 'error');
        setTimeout(() => window.location.href = 'author.html', 1500);
        return;
    }
    
    novel = data;
    
    // Display novel information
    novelTitleDisplay.textContent = novel.title;
    novelGenreDisplay.textContent = `${novel.genre || 'Story'} • ${novel.status || 'draft'}`;
    document.title = `Chapters — ${novel.title} — StoryNest`;
    
    await loadChapters();
}

/* =====================================================
   LOAD CHAPTERS
   ===================================================== */

async function loadChapters() {
    const { data: chapters, error } = await supabaseClient
        .from('chapters')
        .select('*')
        .eq('novel_id', novelId)
        .order('chapter_number', { ascending: true });
    
    if (error) {
        console.error('Could not load chapters:', error);
        chapterList.innerHTML = `
            <div class="chapter-empty">
                <div>⚠️</div>
                <p>Could not load chapters.</p>
            </div>
        `;
        return;
    }
    
    updateChapterCount(chapters.length);
    
    if (!chapters || chapters.length === 0) {
        chapterList.innerHTML = `
            <div class="chapter-empty">
                <div>📖</div>
                <p>No chapters yet. Add your first chapter above.</p>
            </div>
        `;
        return;
    }
    
    chapterList.innerHTML = '';
    chapters.forEach(chapter => displayChapter(chapter));
}

/* =====================================================
   DISPLAY CHAPTER
   ===================================================== */

function displayChapter(chapter) {
    const item = document.createElement('div');
    item.className = 'editor-chapter';
    item.innerHTML = `
        <div class="editor-chapter-number">${chapter.chapter_number}</div>
        <div class="editor-chapter-info">
            <strong>${escapeHTML(chapter.title)}</strong>
            <span>${escapeHTML(chapter.content || '').length} characters</span>
        </div>
        <div class="editor-chapter-actions">
            <button class="secondary-btn edit-chapter" data-id="${chapter.id}">Edit</button>
            <button class="delete-chapter" data-id="${chapter.id}">Delete</button>
        </div>
    `;
    
    item.querySelector('.edit-chapter').addEventListener('click', () => editChapter(chapter));
    item.querySelector('.delete-chapter').addEventListener('click', () => deleteChapter(chapter.id));
    
    chapterList.appendChild(item);
}

/* =====================================================
   SAVE CHAPTER
   ===================================================== */

saveChapterButton.addEventListener('click', saveChapter);

async function saveChapter() {
    const title = chapterTitle.value.trim();
    const content = chapterContent.value.trim();
    
    if (!title || !content) {
        showToast('Please enter a chapter title and content.', 'error');
        return;
    }
    
    saveChapterButton.disabled = true;
    saveChapterButton.textContent = editingChapterId ? 'Updating...' : 'Adding...';
    
    // UPDATE
    if (editingChapterId) {
        const { error } = await supabaseClient
            .from('chapters')
            .update({ title, content })
            .eq('id', editingChapterId);
        
        if (error) {
            console.error('Could not update chapter:', error);
            showToast('Could not update chapter: ' + error.message, 'error');
            resetSaveButton();
            return;
        }
        
        showToast('Chapter updated successfully!');
        editingChapterId = null;
        clearEditor();
        resetSaveButton();
        await loadChapters();
        return;
    }
    
    // INSERT NEW - Get next number
    const { data: existingChapters, error: chaptersError } = await supabaseClient
        .from('chapters')
        .select('chapter_number')
        .eq('novel_id', novelId);
    
    if (chaptersError) {
        console.error(chaptersError);
        showToast('Could not determine chapter number.', 'error');
        resetSaveButton();
        return;
    }
    
    let nextNumber = 1;
    if (existingChapters && existingChapters.length > 0) {
        const numbers = existingChapters.map(ch => Number(ch.chapter_number));
        nextNumber = Math.max(...numbers) + 1;
    }
    
    const { data, error } = await supabaseClient
        .from('chapters')
        .insert({
            novel_id: novelId,
            chapter_number: nextNumber,
            title: title,
            content: content
        })
        .select()
        .single();
    
    if (error) {
        console.error('Could not create chapter:', error);
        showToast('Could not create chapter: ' + error.message, 'error');
        resetSaveButton();
        return;
    }
    
    console.log('Chapter created:', data);
    showToast(`Chapter ${nextNumber} added successfully!`);
    clearEditor();
    resetSaveButton();
    await loadChapters();
}

/* =====================================================
   EDIT CHAPTER
   ===================================================== */

function editChapter(chapter) {
    editingChapterId = chapter.id;
    chapterTitle.value = chapter.title;
    chapterContent.value = chapter.content;
    saveChapterButton.textContent = 'Update Chapter';
    
    chapterTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
    chapterTitle.focus();
}

/* =====================================================
   DELETE CHAPTER
   ===================================================== */

async function deleteChapter(chapterId) {
    const confirmed = confirm('Delete this chapter?\n\nThis action cannot be undone.');
    if (!confirmed) return;
    
    const { error } = await supabaseClient
        .from('chapters')
        .delete()
        .eq('id', chapterId);
    
    if (error) {
        console.error('Could not delete chapter:', error);
        showToast('Could not delete chapter: ' + error.message, 'error');
        return;
    }
    
    await renumberChapters();
    showToast('Chapter deleted successfully.');
    await loadChapters();
}

/* =====================================================
   RENUMBER CHAPTERS
   ===================================================== */

async function renumberChapters() {
    const { data: chapters, error } = await supabaseClient
        .from('chapters')
        .select('id')
        .eq('novel_id', novelId)
        .order('chapter_number', { ascending: true });
    
    if (error) {
        console.error('Could not load chapters for renumbering:', error);
        return;
    }
    
    for (let i = 0; i < chapters.length; i++) {
        await supabaseClient
            .from('chapters')
            .update({ chapter_number: i + 1 })
            .eq('id', chapters[i].id);
    }
}

/* =====================================================
   CLEAR EDITOR
   ===================================================== */

clearChapterButton.addEventListener('click', clearEditor);

function clearEditor() {
    chapterTitle.value = '';
    chapterContent.value = '';
    editingChapterId = null;
    resetSaveButton();
}

/* =====================================================
   RESET BUTTON
   ===================================================== */

function resetSaveButton() {
    saveChapterButton.disabled = false;
    saveChapterButton.textContent = '＋ Add Chapter';
}

/* =====================================================
   CHAPTER COUNT
   ===================================================== */

function updateChapterCount(count) {
    chapterCount.textContent = `${count} ${count === 1 ? 'chapter' : 'chapters'}`;
}

/* =====================================================
   PUBLISH NOVEL
   ===================================================== */

publishNovelButton.addEventListener('click', publishNovel);

async function publishNovel() {
    const { data: chapters, error: chaptersError } = await supabaseClient
        .from('chapters')
        .select('id')
        .eq('novel_id', novelId);
    
    if (chaptersError) {
        console.error(chaptersError);
        showToast('Could not check chapters.', 'error');
        return;
    }
    
    if (!chapters || chapters.length === 0) {
        showToast('Add at least one chapter before publishing.', 'error');
        return;
    }
    
    const confirmed = confirm(`Publish "${novel.title}"?\n\nReaders will be able to see this novel.`);
    if (!confirmed) return;
    
    publishNovelButton.disabled = true;
    publishNovelButton.textContent = 'Publishing...';
    
    const { data, error } = await supabaseClient
        .from('novels')
        .update({ status: 'published' })
        .eq('id', novelId)
        .eq('author_id', currentUser.id)
        .select()
        .single();
    
    if (error) {
        console.error('Could not publish novel:', error);
        showToast('Could not publish novel: ' + error.message, 'error');
        publishNovelButton.disabled = false;
        publishNovelButton.textContent = '🚀 Publish Novel';
        return;
    }
    
    console.log('Published novel:', data);
    showToast(`"${novel.title}" has been published!`);
    setTimeout(() => window.location.href = 'author.html', 1000);
}

/* =====================================================
   HTML SAFETY
   ===================================================== */

function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}