/* =====================================================
   STORYNEST - PROJECT GUTENBERG INTEGRATION (LIGHTWEIGHT)
   ===================================================== */

const GUTENDEX_API = 'https://gutendex.com';

// Get a single book by ID (lightweight - only what we need)
async function getGutenbergBook(id) {
    try {
        const response = await fetch(`${GUTENDEX_API}/books/${id}`);
        if (!response.ok) throw new Error('Failed to fetch');
        return await response.json();
    } catch (error) {
        console.error('Gutenberg book error:', error);
        return null;
    }
}

// Get plain text URL
function getPlainTextUrl(book) {
    return book?.formats?.['text/plain; charset=utf-8'] || 
           book?.formats?.['text/plain'] || null;
}

// Fetch and clean book content
async function fetchBookContent(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        const start = text.indexOf('*** START OF THE PROJECT GUTENBERG EBOOK');
        const end = text.indexOf('*** END OF THE PROJECT GUTENBERG EBOOK');
        if (start !== -1 && end !== -1) {
            return text.substring(start, end + 41);
        }
        return text;
    } catch (error) {
        console.error('Fetch book content error:', error);
        return null;
    }
}

// Split content into chapters
function splitIntoChapters(text) {
    const patterns = [
        /\n\s*(CHAPTER|Chapter|CHAP\.)\s+[IVXLCDM]+\s*/i,
        /\n\s*(CHAPTER|Chapter)\s+\d+\s*/i,
        /\n\s*[IVXLCDM]+\.\s+/i
    ];
    
    let parts = [text];
    for (const pattern of patterns) {
        const newParts = [];
        for (const part of parts) {
            const split = part.split(pattern);
            if (split.length > 1) {
                newParts.push(...split.filter(p => p.trim().length > 50));
            } else {
                newParts.push(part);
            }
        }
        if (newParts.length > parts.length) {
            parts = newParts;
            break;
        }
    }
    
    return parts.filter(p => p.trim().length > 100);
}

// MANUAL SEED - Call this function by clicking a button
async function seedPublicDomainStories() {
    // List of 5 books to start with (reduced from 10)
    const booksToSeed = [
        { id: 1342, title: 'Pride and Prejudice', author: 'Jane Austen' },
        { id: 84, title: 'Frankenstein', author: 'Mary Shelley' },
        { id: 345, title: 'Dracula', author: 'Bram Stoker' },
        { id: 1661, title: 'Sherlock Holmes', author: 'Arthur Conan Doyle' },
        { id: 11, title: "Alice's Adventures", author: 'Lewis Carroll' }
    ];

    let seeded = 0;

    for (const bookInfo of booksToSeed) {
        try {
            // Check if already exists
            const { data: existing } = await supabaseClient
                .from('novels')
                .select('id')
                .eq('gutenberg_id', bookInfo.id)
                .single();

            if (existing) {
                console.log(`⏭️ "${bookInfo.title}" already exists.`);
                continue;
            }

            // Get book data
            const book = await getGutenbergBook(bookInfo.id);
            if (!book) {
                console.log(`❌ Could not fetch "${bookInfo.title}"`);
                continue;
            }

            const genre = book.subjects?.[0]?.split('--')[0]?.trim() || 'Classic';

            // Insert into database
            const { data: novel, error } = await supabaseClient
                .from('novels')
                .insert({
                    title: book.title,
                    author_name: book.authors?.[0]?.name || bookInfo.author,
                    genre: genre,
                    status: 'published',
                    description: `A classic public domain work from Project Gutenberg.`,
                    gutenberg_id: book.id,
                    is_public_domain: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error(`Error creating "${book.title}":`, error);
                continue;
            }

            console.log(`✅ Added "${book.title}"`);
            seeded++;

        } catch (error) {
            console.error(`Error:`, error);
        }
    }

    if (seeded > 0) {
        localStorage.setItem('gutenberg_seeded', 'true');
        alert(`✅ Successfully added ${seeded} public domain stories! Refresh the page to see them.`);
    } else {
        alert('No new stories were added. They may already exist.');
    }
}

// Load public domain novels from database
async function loadPublicDomainNovels() {
    try {
        const { data: novels, error } = await supabaseClient
            .from('novels')
            .select('*')
            .eq('is_public_domain', true)
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading public domain novels:', error);
            return [];
        }

        return novels || [];
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

// Fetch chapters for a public domain novel
async function fetchPublicDomainChapters(novelId) {
    try {
        const { data: novel, error } = await supabaseClient
            .from('novels')
            .select('gutenberg_id, title')
            .eq('id', novelId)
            .single();

        if (error || !novel?.gutenberg_id) {
            console.error('Error fetching novel:', error);
            return [];
        }

        const book = await getGutenbergBook(novel.gutenberg_id);
        if (!book) return [];

        const content = await fetchBookContent(getPlainTextUrl(book));
        if (!content) return [];

        const chapters = splitIntoChapters(content);
        
        // Save chapters
        for (let i = 0; i < Math.min(chapters.length, 20); i++) {
            const { data: existing } = await supabaseClient
                .from('chapters')
                .select('id')
                .eq('novel_id', novelId)
                .eq('chapter_number', i + 1)
                .single();

            if (!existing) {
                await supabaseClient
                    .from('chapters')
                    .insert({
                        novel_id: novelId,
                        chapter_number: i + 1,
                        title: `Chapter ${i + 1}`,
                        content: chapters[i].trim()
                    });
            }
        }

        // Return the chapters
        const { data: savedChapters } = await supabaseClient
            .from('chapters')
            .select('*')
            .eq('novel_id', novelId)
            .order('chapter_number', { ascending: true });

        return savedChapters || [];

    } catch (error) {
        console.error('Error fetching chapters:', error);
        return [];
    }
}

// AUTO-SEED - Only runs if we're on the homepage and NO novels exist
document.addEventListener('DOMContentLoaded', async function() {
    // Only run on homepage
    const isHomepage = window.location.pathname.endsWith('index.html') || 
                       window.location.pathname === '/' || 
                       window.location.pathname.endsWith('/');
    
    if (!isHomepage) return;

    // Check if we already have ANY novels in the database
    const { count, error } = await supabaseClient
        .from('novels')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

    if (error) {
        console.error('Error checking novels:', error);
        return;
    }

    // If there are already novels, don't auto-seed
    if (count > 0) {
        console.log(`📚 ${count} novels already exist. Skipping auto-seed.`);
        return;
    }

    // Only auto-seed if NO novels exist AND we haven't seeded before
    if (localStorage.getItem('gutenberg_seeded') !== 'true') {
        console.log('📚 No novels found. Auto-seeding public domain stories...');
        await seedPublicDomainStories();
    }
});