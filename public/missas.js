const tablesContainer = document.querySelector("#tablesContainer")
const usernameElement = document.querySelector(".profile .username")

let usuario = null
let missas = []

const api = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    })

    const data = await response.json()

    if (!response.ok)
        throw new Error(data.message || "Erro na requisição")

    return data
}

const formatarData = (data) => {
    const [ano, mes, dia] = data.split("-")
    return `${dia}/${mes}/${ano}`
}

const criarElemento = (tag, classe, texto = "") => {
    const elemento = document.createElement(tag)
    elemento.className = classe
    elemento.textContent = texto
    return elemento
}

const carregarUsuario = async () => {
    const response = await fetch("/login/user")

    if (!response.ok) {
        window.location.href = "/"
        return false
    }

    usuario = await response.json()
    usernameElement.textContent = usuario.username

    return true
}

const carregarMissas = async () => {
    try {
        missas = await api("/api/usuario/missas")
        atualizarTabelas()
    } catch (erro) {
        alert(erro.message)
    }
}

const atualizarTabelas = () => {
    tablesContainer.innerHTML = ""

    if (missas.length === 0) {
        tablesContainer.appendChild(
            criarElemento("p", "empty-message", "Nenhuma missa cadastrada.")
        )
        return
    }

    missas.forEach(missa => {
        const card = criarElemento("article", "missa-card")
        const titulo = criarElemento("h2", "", formatarData(missa.data_missa))
        const horario = criarElemento("p", "", `Horário: ${missa.horario}`)
        const coordenador = criarElemento("p", "", `Coordenador: ${missa.coordenador}`)
        const subtitulo = criarElemento("h3", "", "Coroinhas escalados")
        const lista = criarElemento("ul", "coroinhas-list")

        missa.coroinhas.forEach(coroinha => {
            const item = criarElemento(
                "li",
                "",
                `${coroinha.nome} - ${coroinha.funcao}`
            )

            lista.appendChild(item)
        })

        const inscrito = missa.coroinhas.some(coroinha =>
            coroinha.nome.toLowerCase() === usuario.username.toLowerCase()
        )

        card.append(
            titulo,
            horario,
            coordenador,
            subtitulo,
            lista
        )

        if (inscrito) {
            const remover = criarElemento("button", "remove-button", "Remover-me da escala")

            remover.addEventListener("click", () => removerDaEscala(missa.id))

            card.appendChild(remover)
        } else {
            const campoFuncao = document.createElement("input")
            campoFuncao.type = "text"
            campoFuncao.placeholder = "Digite sua função"

            const adicionar = criarElemento("button", "add-button", "Adicionar-me à escala")

            adicionar.addEventListener("click", () => {
                adicionarNaEscala(missa.id, campoFuncao.value)
            })

            card.append(campoFuncao, adicionar)
        }

        tablesContainer.appendChild(card)
    })
}

const adicionarNaEscala = async (missaId, funcao) => {
    if (!funcao.trim()) {
        alert("Digite sua função")
        return
    }

    try {
        await api(`/api/usuario/missas/${missaId}`, {
            method: "POST",
            body: JSON.stringify({ funcao: funcao.trim() })
        })

        await carregarMissas()
    } catch (erro) {
        alert(erro.message)
    }
}

const removerDaEscala = async (missaId) => {
    try {
        await api(`/api/usuario/missas/${missaId}`, {
            method: "DELETE"
        })

        await carregarMissas()
    } catch (erro) {
        alert(erro.message)
    }
}

const init = async () => {
    const logado = await carregarUsuario()

    if (!logado)
        return

    await carregarMissas()
}

init()