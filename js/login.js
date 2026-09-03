/* ================= LOGIN ================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                document.getElementById(
                    "loginEmail"
                ).value.trim();

            const password =
                document.getElementById(
                    "loginPassword"
                ).value;


            showMessage("Logging in...");


            const {
                data,
                error
            } =
                await supabaseClient.auth
                    .signInWithPassword({

                        email: email,

                        password: password

                    });


            if (error) {

                showMessage(
                    error.message,
                    true
                );

                return;

            }


            /*
             * Get requested destination
             *
             * Example:
             * login.html?redirect=author.html
             */

            const loginParams =
                new URLSearchParams(
                    window.location.search
                );


            const redirect =
                loginParams.get("redirect");


            showMessage(
                "Login successful! Redirecting..."
            );


            setTimeout(() => {

                if (redirect) {

                    window.location.href =
                        redirect;

                } else {

                    window.location.href =
                        "author.html";

                }

            }, 500);

        }
    );

}