/* =====================================================
   STORYNEST - CHARACTER MANAGER
   ===================================================== */

const params =
    new URLSearchParams(
        window.location.search
    );

const novelId =
    params.get("id");


/* =====================================================
   ELEMENTS
   ===================================================== */

const novelTitle =
    document.getElementById("novelTitle");

const characterName =
    document.getElementById("characterName");

const characterRole =
    document.getElementById("characterRole");

const characterDescription =
    document.getElementById("characterDescription");

const saveCharacter =
    document.getElementById("saveCharacter");

const clearCharacter =
    document.getElementById("clearCharacter");

const characterList =
    document.getElementById("characterList");


let currentUser = null;


/*
 * ID is required
 */

if (!novelId) {

    alert(
        "No novel selected."
    );

    window.location.href =
        "author.html";

} else {

    initializeCharacters();

}


/* =====================================================
   INITIALIZE
   ===================================================== */

async function initializeCharacters() {

    const {
        data: {
            user
        },
        error
    } =
        await supabaseClient
            .auth
            .getUser();


    if (error || !user) {

        window.location.href =
            "login.html";

        return;

    }


    currentUser =
        user;


    /*
     * Make sure this novel belongs
     * to the logged-in author.
     */

    const {
        data: novel,
        error: novelError
    } =
        await supabaseClient
            .from("novels")
            .select("id, title")
            .eq("id", novelId)
            .eq("author_id", user.id)
            .single();


    if (novelError || !novel) {

        console.error(
            novelError
        );

        alert(
            "Novel not found."
        );

        window.location.href =
            "author.html";

        return;

    }


    novelTitle.textContent =
        `${novel.title} — Characters`;


    await loadCharacters();

}


/* =====================================================
   LOAD CHARACTERS
   ===================================================== */

async function loadCharacters() {

    const {
        data: characters,
        error
    } =
        await supabaseClient
            .from("characters")
            .select("*")
            .eq("novel_id", novelId)
            .order("created_at", {
                ascending: true
            });


    if (error) {

        console.error(
            "Could not load characters:",
            error
        );

        characterList.innerHTML = `
            <p>
                Could not load characters.
            </p>
        `;

        return;

    }


    displayCharacters(
        characters || []
    );

}


/* =====================================================
   DISPLAY CHARACTERS
   ===================================================== */

function displayCharacters(characters) {

    if (characters.length === 0) {

        characterList.innerHTML = `

            <div class="chapter-empty">

                <div>👤</div>

                <p>
                    No characters yet.
                </p>

            </div>

        `;

        return;

    }


    characterList.innerHTML =
        "";


    characters.forEach(
        character => {

            const item =
                document.createElement("div");


            item.className =
                "editor-chapter";


            item.innerHTML = `

                <div class="editor-chapter-number">
                    👤
                </div>


                <div class="editor-chapter-info">

                    <strong>
                        ${escapeHTML(
                            character.name
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            character.role ||
                            "Character"
                        )}
                    </span>

                    <span>
                        ${escapeHTML(
                            character.description ||
                            ""
                        )}
                    </span>

                </div>


                <div>

                    <button
                        type="button"
                        class="secondary-btn edit-character"
                        data-id="${character.id}">

                        Edit

                    </button>


                    <button
                        type="button"
                        class="delete-chapter delete-character"
                        data-id="${character.id}">

                        Delete

                    </button>

                </div>

            `;


            characterList.appendChild(
                item
            );

        }
    );


    attachCharacterActions(
        characters
    );

}


/* =====================================================
   SINGLE SAVE BUTTON
   ADD + EDIT
   ===================================================== */

saveCharacter.addEventListener(
    "click",
    saveCharacterData
);


async function saveCharacterData() {

    const editingId =
        saveCharacter.dataset.editingId;


    const name =
        characterName.value.trim();


    const role =
        characterRole.value;


    const description =
        characterDescription.value.trim();


    /*
     * Validation
     */

    if (!name) {

        alert(
            "Please enter the character name."
        );

        return;

    }


    /*
     * Loading
     */

    saveCharacter.disabled =
        true;

    saveCharacter.textContent =
        "Saving...";


    let error;


    /* =================================================
       EDIT EXISTING CHARACTER
       ================================================= */

    if (editingId) {

        const result =
            await supabaseClient
                .from("characters")
                .update({

                    name:
                        name,

                    role:
                        role || null,

                    description:
                        description || null

                })
                .eq(
                    "id",
                    editingId
                )
                .eq(
                    "novel_id",
                    novelId
                );


        error =
            result.error;


    }


    /* =================================================
       CREATE NEW CHARACTER
       ================================================= */

    else {

        const result =
            await supabaseClient
                .from("characters")
                .insert({

                    novel_id:
                        novelId,

                    name:
                        name,

                    role:
                        role || null,

                    description:
                        description || null

                });


        error =
            result.error;

    }


    /*
     * Handle error
     */

    if (error) {

        console.error(
            error
        );

        alert(
            "Could not save character:\n\n" +
            error.message
        );

        saveCharacter.disabled =
            false;

        saveCharacter.textContent =
            editingId
                ? "Save Changes"
                : "+ Add Character";

        return;

    }


    /*
     * Success
     */

    clearCharacterForm();

    await loadCharacters();


    saveCharacter.disabled =
        false;

    saveCharacter.textContent =
        "+ Add Character";

}


/* =====================================================
   EDIT / DELETE BUTTONS
   ===================================================== */

function attachCharacterActions(characters) {

    /*
     * EDIT
     */

    document
        .querySelectorAll(
            ".edit-character"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const character =
                            characters.find(
                                item =>
                                    item.id ===
                                    button.dataset.id
                            );


                        if (!character) {
                            return;
                        }


                        characterName.value =
                            character.name || "";


                        characterRole.value =
                            character.role || "";


                        characterDescription.value =
                            character.description || "";


                        /*
                         * Store the ID of the
                         * character being edited.
                         */

                        saveCharacter.dataset.editingId =
                            character.id;


                        saveCharacter.textContent =
                            "Save Changes";


                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });

                    }
                );

            }
        );


    /*
     * DELETE
     */

    document
        .querySelectorAll(
            ".delete-character"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const confirmed =
                            confirm(
                                "Delete this character?"
                            );


                        if (!confirmed) {
                            return;
                        }


                        const {
                            error
                        } =
                            await supabaseClient
                                .from("characters")
                                .delete()
                                .eq(
                                    "id",
                                    button.dataset.id
                                )
                                .eq(
                                    "novel_id",
                                    novelId
                                );


                        if (error) {

                            console.error(
                                error
                            );

                            alert(
                                "Could not delete character:\n\n" +
                                error.message
                            );

                            return;

                        }


                        await loadCharacters();

                    }
                );

            }
        );

}


/* =====================================================
   CLEAR
   ===================================================== */

clearCharacter.addEventListener(
    "click",
    clearCharacterForm
);


function clearCharacterForm() {

    characterName.value =
        "";

    characterRole.value =
        "";

    characterDescription.value =
        "";


    delete saveCharacter.dataset.editingId;


    saveCharacter.textContent =
        "+ Add Character";

}


/* =====================================================
   HTML SAFETY
   ===================================================== */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;

}