/* =====================================================
   STORYNEST - PROJECT GUTENBERG INTEGRATION
   ===================================================== */

const GUTENDEX_API = 'https://gutendex.com';

// Search for books from Project Gutenberg
async function searchGutenbergBooks(query, limit = 12) {
    try {
        const response = await fetch(`${GUTENDEX_API}/books?search=${encodeURIComponent(query)}&limit=${limit}`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Gutenberg search error:', error);
        return [];
    }
}

// Get a single book by ID
async function getGutenbergBook(id) {
    try {
        const response = await fetch(`${GUTENDEX_API}/books/${id}`);
        return await response.json();
    } catch (error) {
        console.error('Gutenberg book error:', error);
        return null;
    }
}

// Get the plain text URL from book data
function getPlainTextUrl(book) {
    return book?.formats?.['text/plain; charset=utf-8'] || 
           book?.formats?.['text/plain'] || null;
}

// Fetch and clean the book content
async function fetchBookContent(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        // Strip Project Gutenberg header/footer
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
    // Split on common chapter patterns
    const patterns = [
        /\n\s*(CHAPTER|Chapter|CHAP\.|Ch\.)\s+[IVXLCDM]+\s*/i,
        /\n\s*(CHAPTER|Chapter|CHAP\.|Ch\.)\s+\d+\s*/i,
        /\n\s*[IVXLCDM]+\.\s+/i,
        /\n\s*\d+\.\s+/i
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

// Seed public domain stories
async function seedPublicDomainStories() {
    // Check if already seeded
    if (localStorage.getItem('gutenberg_seeded') === 'true') {
        console.log('📚 Public domain stories already seeded.');
        return;
    }

    console.log('📚 Seeding public domain stories...');

    // List of popular public domain books with their Gutenberg IDs
    const booksToSeed = [
        { id: 1342, title: 'Pride and Prejudice', author: 'Jane Austen' },
        { id: 1400, title: 'Great Expectations', author: 'Charles Dickens' },
        { id: 2701, title: 'Moby Dick', author: 'Herman Melville' },
        { id: 345, title: 'Dracula', author: 'Bram Stoker' },
        { id: 84, title: 'Frankenstein', author: 'Mary Shelley' },
        { id: 98, title: 'A Tale of Two Cities', author: 'Charles Dickens' },
        { id: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle' },
        { id: 11, title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll' },
        { id: 174, title: 'The Picture of Dorian Gray', author: 'Oscar Wilde' },
        { id: 768, title: 'Wuthering Heights', author: 'Emily Brontë' }
    ];

    let seeded = 0;

    for (const bookInfo of booksToSeed) {
        try {
            // Check if this book is already in the database
            const { data: existing, error: checkError } = await supabaseClient
                .from('novels')
                .select('id')
                .eq('gutenberg_id', bookInfo.id)
                .single();

            if (existing) {
                console.log(`⏭️ "${bookInfo.title}" already exists. Skipping.`);
                continue;
            }

            // Get full book data from Gutenberg
            const book = await getGutenbergBook(bookInfo.id);
            if (!book) {
                console.log(`❌ Could not fetch "${bookInfo.title}"`);
                continue;
            }

            // Get the genre from subjects
            const genre = book.subjects?.[0]?.split('--')[0]?.trim() || 'Classic Literature';

            // Insert into novels table
            const { data: novel, error: insertError } = await supabaseClient
                .from('novels')
                .insert({
                    title: book.title,
                    author_name: book.authors?.[0]?.name || bookInfo.author || 'Unknown Author',
                    genre: genre,
                    status: 'published',
                    description: `A classic public domain work from Project Gutenberg.`,
                    gutenberg_id: book.id,
                    is_public_domain: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (insertError) {
                console.error(`Error creating "${book.title}":`, insertError);
                continue;
            }

            console.log(`✅ Added "${book.title}" by ${book.authors?.[0]?.name || bookInfo.author}`);
            seeded++;

        } catch (error) {
            console.error(`Error processing "${bookInfo.title}":`, error);
        }
    }

    if (seeded > 0) {
        localStorage.setItem('gutenberg_seeded', 'true');
        console.log(`🎉 Successfully seeded ${seeded} public domain stories!`);
    } else {
        console.log('ℹ️ No new stories were seeded.');
    }
}

// Load public domain novels from database
async function loadPublicDomainNovels() {
    const { data: novels, error } = await supabaseClient
        .from('novels')
        .select('*')
        .eq('is_public_domain', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(8);

    if (error) {
        console.error('Error loading public domain novels:', error);
        return [];
    }

    return novels || [];
}

// Fetch chapters for a public domain novel
async function fetchPublicDomainChapters(novelId) {
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
    
    // Save chapters to database
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
}

// Auto-seed when the page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(seedPublicDomainStories, 1500);
});