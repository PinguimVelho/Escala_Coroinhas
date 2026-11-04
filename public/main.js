
const loginForm = document.querySelector('#formLogin');
if (loginForm) {
    loginForm.addEventListener('submit', async (ev) => {
        ev.preventDefault()
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify({
                "username": loginForm.username.value,
                "password": loginForm.password.value
            })
        })
        if (response.status == 404)
            return alert("Usuário não encontrado")

        if (response.status == 401)
            return alert("Senha incorreta")

        if (response.ok) {
            window.location.href = "/missas-adm"
            return
        }
        alert("Não deveria chegar aqui")
    })

}

const cadastroForm = document.querySelector('#formCadastro');
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (ev) => {
        ev.preventDefault()
        const response = await fetch("/user", {
            method: "POST",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify({
                "username": cadastroForm.username.value,
                "password": cadastroForm.password.value
            })
        })
        if (response.ok) {
            alert("Usuário Cadastrado!!");
            window.location.href = "/"; // Agora vai redirecionar com segurança
        } else {
            const erro = await response.text();
            alert(`Erro no cadastro: ${erro}`);
        }
    })
}

