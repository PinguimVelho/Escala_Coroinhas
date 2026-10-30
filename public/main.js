const cadastroForm = document.querySelector("#formCadastro");
const loginForm = document.querySelector("#formLogin");
// lUsername = loginForm.querySelector('#usuario');
// lPassword = loginForm.querySelector('#senha');


console.log(cadastroForm);


if (formCadastro) {
    formCadastro.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const response = await fetch("/user", {
            method: "POST",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify({
                "username": formCadastro.username.value,
                "email": formCadastro.email.value,
                "password": formCadastro.password.value
            }),
        });
    });
}