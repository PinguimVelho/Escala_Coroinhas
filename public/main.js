
const loginForm = document.querySelector('#formLogin');
let lUsername;
let lPassword;
if (loginForm) {
    lUsername = loginForm.querySelector('#usuario');
    lPassword = loginForm.querySelector('#senha');
}

const cadastroForm = document.querySelector('#formCadastro');
let cUsername;
let cPassword;
if (cadastroForm) {
    cUsername = cadastroForm.querySelector('#usuario');
    cPassword = cadastroForm.querySelector('#senha');
}

