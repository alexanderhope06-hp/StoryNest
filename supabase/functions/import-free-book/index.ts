import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "npm:jszip";
import { XMLParser } from "npm:fast-xml-parser";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-library-admin-key",
    "Access-Control-Allow-Methods":
        "POST, OPTIONS"
};


const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});


Deno.serve(async (req) => {

    if (req.method === "OPTIONS") {

        return new Response(
            "ok",
            {
                headers: corsHeaders
            }
        );

    }


    try {

        /* =====================================
           ADMIN KEY
        ===================================== */

        const adminKey =
            req.headers.get(
                "x-library-admin-key"
            );


        const expectedKey =
            Deno.env.get(
                "LIBRARY_ADMIN_KEY"
            );


        if (
            !adminKey ||
            !expectedKey ||
            adminKey !== expectedKey
        ) {

            return json(
                {
                    error:
                        "Invalid library admin key."
                },
                401
            );

        }


        /* =====================================
           AUTHENTICATION
        ===================================== */

        const authHeader =
            req.headers.get(
                "Authorization"
            );


        if (!authHeader) {

            return json(
                {
                    error:
                        "Authentication required."
                },
                401
            );

        }


        const supabaseUrl =
            Deno.env.get(
                "SUPABASE_URL"
            );


        const serviceRoleKey =
            Deno.env.get(
                "SUPABASE_SERVICE_ROLE_KEY"
            );


        if (
            !supabaseUrl ||
            !serviceRoleKey
        ) {

            throw new Error(
                "Supabase server configuration is incomplete."
            );

        }


        const supabase =
            createClient(
                supabaseUrl,
                serviceRoleKey
            );


        /* =====================================
           VERIFY USER
        ===================================== */

        const jwt =
            authHeader.replace(
                "Bearer ",
                ""
            );


        const {
            data: userData,
            error: userError
        } =
            await supabase.auth.getUser(jwt);


        if (
            userError ||
            !userData?.user
        ) {

            return json(
                {
                    error:
                        "Invalid login session."
                },
                401
            );

        }


        /* =====================================
           REQUEST DATA
        ===================================== */

        const body =
            await req.json();


        const bookUrl =
            String(
                body.book_url || ""
            ).trim();


        const sourceName =
            String(
                body.source_name ||
                "Unknown source"
            ).trim();


        const sourceType =
            String(
                body.source_type ||
                "public_domain"
            ).trim();


        if (!bookUrl) {

            throw new Error(
                "No ebook URL was supplied."
            );

        }


        /* =====================================
           ONLY HTTPS
        ===================================== */

        const parsedUrl =
            new URL(bookUrl);


        if (
            parsedUrl.protocol !==
            "https:"
        ) {

            throw new Error(
                "Only HTTPS ebook URLs are allowed."
            );

        }


        /* =====================================
           PROTECT AGAINST ARBITRARY SOURCES
        ===================================== */

        const hostname =
            parsedUrl.hostname
                .toLowerCase()
                .replace(/^www\./, "");


        const approvedHosts = [

            "standardebooks.org"

        ];


        if (
            !approvedHosts.includes(
                hostname
            )
        ) {

            throw new Error(
                `Source "${hostname}" is not currently approved by StoryNest.`
            );

        }


        /* =====================================
           RECORD IMPORT
        ===================================== */

        const {
            data: importRecord,
            error: importError
        } =
            await supabase
                .from("library_imports")
                .insert({

                    source_url:
                        bookUrl,

                    source_name:
                        sourceName,

                    status:
                        "pending"

                })
                .select("id")
                .single();


        if (importError) {

            throw importError;

        }


        const importId =
            importRecord.id;


        try {

            /* =================================
               DOWNLOAD EPUB
            ================================= */

            const epubResponse =
                await fetch(
                    bookUrl,
                    {
                        headers: {
                            "User-Agent":
                                "StoryNest-Free-Library/1.0"
                        }
                    }
                );


            if (
                !epubResponse.ok
            ) {

                throw new Error(
                    `Could not download ebook. HTTP ${epubResponse.status}.`
                );

            }


            const epubBytes =
                await epubResponse.arrayBuffer();


            if (
                epubBytes.byteLength >
                30 * 1024 * 1024
            ) {

                throw new Error(
                    "The ebook is larger than the 30 MB import limit."
                );

            }


            /* =================================
               OPEN EPUB
            ================================= */

            const zip =
                await JSZip.loadAsync(
                    epubBytes
                );


            /* =================================
               FIND CONTAINER
            ================================= */

            const containerFile =
                zip.file(
                    "META-INF/container.xml"
                );


            if (!containerFile) {

                throw new Error(
                    "Invalid EPUB: container.xml is missing."
                );

            }


            const containerXml =
                await containerFile.async(
                    "text"
                );


            const container =
                parser.parse(
                    containerXml
                );


            const rootFile =
                container
                    ?.container
                    ?.rootfiles
                    ?.rootfile;


            if (!rootFile) {

                throw new Error(
                    "Could not locate EPUB package file."
                );

            }


            const opfPath =
                rootFile[
                    "@_full-path"
                ];


            if (!opfPath) {

                throw new Error(
                    "Invalid EPUB package path."
                );

            }


            /* =================================
               READ OPF
            ================================= */

            const opfFile =
                zip.file(opfPath);


            if (!opfFile) {

                throw new Error(
                    "EPUB package file is missing."
                );

            }


            const opfXml =
                await opfFile.async(
                    "text"
                );


            const opf =
                parser.parse(
                    opfXml
                );


            /* =================================
               METADATA
            ================================= */

            const metadata =
                opf.package?.metadata || {};


            const title =
                getMetadata(
                    metadata,
                    "dc:title"
                ) ||
                "Untitled Book";


            const author =
                getMetadata(
                    metadata,
                    "dc:creator"
                ) ||
                "Unknown Author";


            const description =
                getMetadata(
                    metadata,
                    "dc:description"
                ) ||
                "";


            /* =================================
               MANIFEST
            ================================= */

            const manifestItems =
                normalizeArray(
                    opf.package
                        ?.manifest
                        ?.item
                );


            const spineItems =
                normalizeArray(
                    opf.package
                        ?.spine
                        ?.itemref
                );


            const manifest =
                new Map();


            for (
                const item
                of manifestItems
            ) {

                const id =
                    item?.["@_id"];


                if (id) {

                    manifest.set(
                        id,
                        item
                    );

                }

            }


            /* =================================
               SPINE → CHAPTERS
            ================================= */

            const chapters = [];


            for (
                let i = 0;
                i < spineItems.length;
                i++
            ) {

                const itemref =
                    spineItems[i];


                const idref =
                    itemref?.["@_idref"];


                const item =
                    manifest.get(
                        idref
                    );


                if (!item) {
                    continue;
                }


                const href =
                    item?.["@_href"];


                if (!href) {
                    continue;
                }


                const chapterPath =
                    resolvePath(
                        opfPath,
                        href
                    );


                const chapterFile =
                    zip.file(
                        chapterPath
                    );


                if (!chapterFile) {
                    continue;
                }


                const xhtml =
                    await chapterFile.async(
                        "text"
                    );


                const chapterText =
                    htmlToText(
                        xhtml
                    );


                const cleaned =
                    cleanText(
                        chapterText
                    );


                if (
                    cleaned.length < 20
                ) {

                    continue;

                }


                const chapterTitle =
                    extractChapterTitle(
                        xhtml,
                        i + 1
                    );


                chapters.push({

                    chapter_number:
                        chapters.length + 1,

                    title:
                        chapterTitle,

                    content:
                        cleaned

                });

            }


            if (!chapters.length) {

                throw new Error(
                    "No readable chapters were found in this EPUB."
                );

            }


            /* =================================
               DUPLICATE CHECK
            ================================= */

            const {
                data: existing
            } =
                await supabase
                    .from("novels")
                    .select("id")
                    .eq(
                        "title",
                        title
                    )
                    .eq(
                        "source_type",
                        sourceType
                    )
                    .limit(1);


            if (
                existing &&
                existing.length
            ) {

                throw new Error(
                    `"${title}" is already in the Free Library.`
                );

            }


            /* =================================
               CREATE NOVEL
            ================================= */

            const {
                data: novel,
                error: novelError
            } =
                await supabase
                    .from("novels")
                    .insert({

                        title:

                            title,

                        description:

                            description ||
                            null,

                        author_id:

                            null,

                        status:

                            "published",

                        source_type:

                            sourceType,

                        license:

                            sourceType === "cc0"
                                ? "CC0"
                                : sourceType === "public_domain"
                                    ? "Public Domain"
                                    : sourceType.toUpperCase(),

                        original_author:

                            author,

                        source_name:

                            sourceName,

                        source_url:

                            bookUrl,

                        attribution:

                            `Imported from ${sourceName}. Original author: ${author}.`

                    })
                    .select("id")
                    .single();


            if (novelError) {

                throw novelError;

            }


            /* =================================
               INSERT CHAPTERS
            ================================= */

            const rows =
                chapters.map(
                    chapter => ({

                        novel_id:

                            novel.id,

                        chapter_number:

                            chapter.chapter_number,

                        title:

                            chapter.title,

                        content:

                            chapter.content

                    })
                );


            const {
                error: chapterError
            } =
                await supabase
                    .from("chapters")
                    .insert(rows);


            if (chapterError) {

                await supabase
                    .from("novels")
                    .delete()
                    .eq(
                        "id",
                        novel.id
                    );

                throw chapterError;

            }


            /* =================================
               COMPLETE IMPORT
            ================================= */

            await supabase
                .from("library_imports")
                .update({

                    status:
                        "imported",

                    novel_id:
                        novel.id,

                    imported_at:
                        new Date()
                            .toISOString()

                })
                .eq(
                    "id",
                    importId
                );


            return json({

                success:
                    true,

                title:
                    title,

                novel_id:
                    novel.id,

                chapter_count:
                    chapters.length

            });


        } catch (error) {

            await supabase
                .from("library_imports")
                .update({

                    status:
                        "failed",

                    error_message:
                        error.message ||
                        String(error)

                })
                .eq(
                    "id",
                    importId
                );


            throw error;

        }


    } catch (error) {

        console.error(
            "IMPORT ERROR:",
            error
        );


        return json(

            {
                error:
                    error.message ||
                    "Import failed."
            },

            500

        );

    }

});


/* =========================================
   HELPERS
========================================= */

function json(
    data: unknown,
    status = 200
) {

    return new Response(

        JSON.stringify(data),

        {

            status,

            headers: {

                ...corsHeaders,

                "Content-Type":
                    "application/json"

            }

        }

    );

}


function normalizeArray(
    value: any
): any[] {

    if (!value) {
        return [];
    }

    return Array.isArray(value)
        ? value
        : [value];

}


function getMetadata(
    metadata: any,
    key: string
): string {

    const value =
        metadata[key];


    if (!value) {
        return "";
    }


    if (
        Array.isArray(value)
    ) {

        const first =
            value[0];

        if (
            typeof first ===
            "string"
        ) {

            return first.trim();

        }

        return String(
            first?.["#text"] ||
            ""
        ).trim();

    }


    if (
        typeof value ===
        "string"
    ) {

        return value.trim();

    }


    return String(
        value["#text"] ||
        ""
    ).trim();

}


function resolvePath(
    baseFile: string,
    href: string
): string {

    const base =
        baseFile
            .split("/")
            .slice(0, -1)
            .join("/");


    const combined =
        base
            ? `${base}/${href}`
            : href;


    const parts =
        combined.split("/");


    const result: string[] =
        [];


    for (
        const part
        of parts
    ) {

        if (
            !part ||
            part === "."
        ) {

            continue;

        }


        if (
            part === ".."
        ) {

            result.pop();

        } else {

            result.push(part);

        }

    }


    return result.join("/");

}


function htmlToText(
    html: string
): string {

    return html

        .replace(
            /<script[\s\S]*?<\/script>/gi,
            " "
        )

        .replace(
            /<style[\s\S]*?<\/style>/gi,
            " "
        )

        .replace(
            /<\/(p|div|section|article|h1|h2|h3|h4|h5|h6|li|blockquote|br)>/gi,
            "\n"
        )

        .replace(
            /<li[^>]*>/gi,
            "\n• "
        )

        .replace(
            /<[^>]+>/g,
            " "
        )

        .replace(
            /&nbsp;/gi,
            " "
        )

        .replace(
            /&amp;/gi,
            "&"
        )

        .replace(
            /&lt;/gi,
            "<"
        )

        .replace(
            /&gt;/gi,
            ">"
        )

        .replace(
            /&quot;/gi,
            '"'
        )

        .replace(
            /&#39;/gi,
            "'"
        )

        .replace(
            /\r/g,
            ""
        );

}


function cleanText(
    text: string
): string {

    return text

        .split("\n")

        .map(
            line =>
                line
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim()
        )

        .filter(
            line => line.length > 0
        )

        .join("\n\n")

        .trim();

}


function extractChapterTitle(
    xhtml: string,
    fallback: number
): string {

    const match =
        xhtml.match(
            /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i
        );


    if (match) {

        const title =
            cleanText(
                htmlToText(
                    match[1]
                )
            );


        if (title) {
            return title;
        }

    }


    return `Chapter ${fallback}`;

}