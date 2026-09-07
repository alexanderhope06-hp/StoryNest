# StoryNest Free Library — Safe Starter Setup

This version changes the Free Library to accept **only Standard Ebooks editions** and records them as **CC0** editions.

Standard Ebooks states that content produced by or for Standard Ebooks L3C is dedicated to the public domain via CC0 1.0. StoryNest still keeps a source URL and copyright note for provenance.

## 1. Run the SQL migration

Open Supabase → SQL Editor and run:

`supabase/migrations/20260907_free_library_safety.sql`

Do this before importing books.

## 2. Set the Edge Function secret

In Supabase → Edge Functions → Secrets, create:

`LIBRARY_ADMIN_KEY`

Use a long random secret. Do NOT put this value in JavaScript, HTML, GitHub, or the database.

## 3. Deploy the function

From the StoryNest project directory:

```bash
supabase functions deploy import-free-book
```

The function is:

`supabase/functions/import-free-book/index.ts`

## 4. Log into StoryNest

Open `library-admin.html` while logged into the StoryNest account that is allowed to manage the library.

Enter the `LIBRARY_ADMIN_KEY`.

## 5. Import books

You can paste either:

- a Standard Ebooks book page, e.g. `https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice`
- or an official Standard Ebooks EPUB download URL.

The server, not the browser, decides the license/source. The browser cannot change an import into CC BY, Public Domain, or another license.

## 6. Import the starter collection

Use **Import Starter Collection** to import the included starter list automatically.

The starter list contains classic editions from Standard Ebooks:

- Pride and Prejudice — Jane Austen
- Frankenstein — Mary Shelley
- Jane Eyre — Charlotte Brontë
- Dracula — Bram Stoker
- Moby Dick — Herman Melville
- A Tale of Two Cities — Charles Dickens
- The Wonderful Wizard of Oz — L. Frank Baum
- Alice's Adventures in Wonderland — Lewis Carroll / John Tenniel edition

Duplicate books are rejected by the server.

## Important legal note

This system is deliberately conservative, but it is not a substitute for legal advice. Standard Ebooks itself warns that an underlying work can have different copyright status outside the United States. Before making the library available commercially, confirm that the underlying works you import are free of copyright restrictions in the countries where StoryNest operates.

Do not remove the source, license, attribution, or copyright fields.

## What is protected

The importer:

- accepts only HTTPS;
- accepts only `standardebooks.org`;
- accepts only `/ebooks/...` pages or official `/downloads/*.epub` files;
- forces `source_type = cc0` on the server;
- records the CC0 license URL;
- records the Standard Ebooks edition URL;
- records a license-verification timestamp;
- marks imported books as verified;
- exposes only verified free-library books to public readers;
- exposes their chapters only when the parent novel is verified;
- rejects duplicate title/license combinations;
- records failed imports in `library_imports`.

