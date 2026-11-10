
const tablesContainer = document.querySelector("#tablesContainer")
const createTableButton = document.querySelector("#createTable")

let coordenadores = []
let missas = []

const api = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    })

    const data = await response.json().catch(() => null)

    if (!response.ok)
        throw new Error(data?.msg || "Ocorreu um erro na solicitação")

    return data
}

const criarElemento = (tag, classe, texto) => {
    const elemento = document.createElement(tag)

    if (classe)
        elemento.className = classe

    if (texto !== undefined)
        elemento.textContent = texto

    return elemento
}

const verificarUsuario = async () => {
    try {
        const data = await api("/login/user")

        if (data.perm !== "admin") {
            window.location.href = "/missas"
            return false
        }

        document.querySelector(".profile .username").textContent = data.username
        return true
    } catch {
        window.location.href = "/"
        return false
    }
}

const carregarCoordenadores = async () => {
    coordenadores = await api("/api/coordenadores")
}

const carregarMissas = async () => {
    missas = await api("/api/missas")
    atualizarTabelas()
}

const carregarDados = async () => {
    try {
        const autorizado = await verificarUsuario()

        if (!autorizado)
            return

        await carregarCoordenadores()
        await carregarMissas()
    } catch (erro) {
        alert(erro.message)
    }
}

const formatarData = (data) => {
    if (!data)
        return ""

    const [ano, mes, dia] = data.split("-")
    return `${dia}/${mes}/${ano}`
}

const atualizarTabelas = () => {
    tablesContainer.innerHTML = ""

    if (missas.length === 0) {
        const mensagem = criarElemento("p", "empty-message", "Nenhuma escala cadastrada.")
        tablesContainer.appendChild(mensagem)
        return
    }

    missas.forEach(missa => {
        const card = criarElemento("div", "table-card")
        const header = criarElemento("div", "table-header")
        const info = criarElemento("div", "scale-info")
        const actions = criarElemento("div", "table-actions")

        const data = criarElemento("span", "scale-date", formatarData(missa.data_missa))
        const horario = criarElemento("span", "scale-time", missa.horario)
        const coordenador = criarElemento("span", "scale-coordinator", `Coordenador: ${missa.coordenador}`)

        const editar = criarElemento("button", "btn-edit", "Editar escala")
        const excluir = criarElemento("button", "delete-table", "Excluir escala")

        editar.type = "button"
        excluir.type = "button"

        editar.addEventListener("click", () => abrirModalEscala(missa))
        excluir.addEventListener("click", () => excluirMissa(missa.id))

        info.append(data, horario, coordenador)
        actions.append(editar, excluir)
        header.append(info, actions)

        const tabela = document.createElement("table")
        const thead = document.createElement("thead")
        const linhaCabecalho = document.createElement("tr")

        linhaCabecalho.append(
            criarElemento("th", "", "Coroinha"),
            criarElemento("th", "", "Função"),
            criarElemento("th", "", "Ações")
        )

        thead.appendChild(linhaCabecalho)

        const tbody = document.createElement("tbody")

        missa.coroinhas.forEach(coroinha => {
            const linha = document.createElement("tr")

            const nome = criarElemento("td", "", coroinha.nome)
            const funcao = criarElemento("td", "", coroinha.funcao)
            const acoes = document.createElement("td")

            const remover = criarElemento("button", "btn-remove", "Remover")
            remover.type = "button"
            remover.addEventListener("click", () => removerCoroinha(missa.id, coroinha.id))

            acoes.appendChild(remover)
            linha.append(nome, funcao, acoes)
            tbody.appendChild(linha)
        })

        tabela.append(thead, tbody)

        const adicionar = criarElemento("button", "btn-add", "+ Adicionar coroinha")
        adicionar.type = "button"
        adicionar.addEventListener("click", () => abrirModalCoroinha(missa.id))

        card.append(header, tabela, adicionar)
        tablesContainer.appendChild(card)
    })
}

const criarModal = (titulo) => {
    const overlay = criarElemento("div", "modal-overlay")
    const modal = criarElemento("div", "modal")
    const header = criarElemento("div", "modal-header")
    const nome = criarElemento("h2", "", titulo)
    const fechar = criarElemento("button", "modal-close", "×")

    fechar.type = "button"
    fechar.addEventListener("click", () => overlay.remove())

    header.append(nome, fechar)
    modal.appendChild(header)
    overlay.appendChild(modal)

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay)
            overlay.remove()
    })

    document.body.appendChild(overlay)

    return { overlay, modal }
}


const abrirModalEscala = (missa = null) => {
    const editando = missa !== null
    const { overlay, modal } = criarModal(editando ? "Editar escala" : "Criar escala")

    const form = document.createElement("form")

    const campoData = criarCampo("Data", "text", "data_missa")
    const campoHorario = criarCampo("Horário", "time", "horario")
    const campoCoordenador = criarCampo("Coordenador responsável", "text", "coordenador")

    campoData.input.placeholder = "DD/MM/AAAA"
    campoData.input.inputMode = "numeric"
    campoData.input.maxLength = 10

    campoCoordenador.input.placeholder = "Digite o nome do coordenador"

    if (missa) {
        campoData.input.value = formatarData(missa.data_missa)
        campoHorario.input.value = missa.horario
        campoCoordenador.input.value = missa.coordenador
    }

    const salvar = criarElemento("button", "modal-submit", editando ? "Salvar alterações" : "Criar escala")
    salvar.type = "submit"

    form.append(
        campoData.label,
        campoHorario.label,
        campoCoordenador.label,
        salvar
    )

    form.addEventListener("submit", async (event) => {
        event.preventDefault()

        let dataMissa

        try {
            dataMissa = converterDataParaBanco(campoData.input.value)
        } catch (erro) {
            alert(erro.message)
            return
        }

        const dados = {
            data_missa: dataMissa,
            horario: campoHorario.input.value,
            coordenador: campoCoordenador.input.value.trim()
        }

        if (!dados.horario || !dados.coordenador) {
            alert("Preencha todos os campos")
            return
        }

        try {
            if (editando) {
                await api(`/api/missas/${missa.id}`, {
                    method: "PUT",
                    body: JSON.stringify(dados)
                })
            } else {
                await api("/api/missas", {
                    method: "POST",
                    body: JSON.stringify(dados)
                })
            }

            overlay.remove()
            await carregarMissas()
        } catch (erro) {
            alert(erro.message)
        }
    })

    modal.appendChild(form)
}


const abrirModalCoroinha = (missaId) => {
    const { overlay, modal } = criarModal("Adicionar coroinha")
    const form = document.createElement("form")

    const campoNome = criarCampo("Nome do coroinha", "text", "nome")
    const campoFuncao = criarCampo("Função", "text", "funcao")

    const salvar = criarElemento("button", "modal-submit", "Adicionar")
    salvar.type = "submit"

    form.append(campoNome.label, campoFuncao.label, salvar)

    form.addEventListener("submit", async (event) => {
        event.preventDefault()

        const dados = {
            nome: campoNome.input.value.trim(),
            funcao: campoFuncao.input.value.trim()
        }

        if (!dados.nome || !dados.funcao)
            return

        try {
            await api(`/api/missas/${missaId}/coroinhas`, {
                method: "POST",
                body: JSON.stringify(dados)
            })

            overlay.remove()
            await carregarMissas()
        } catch (erro) {
            alert(erro.message)
        }
    })

    modal.appendChild(form)
}

const criarCampo = (texto, tipo, nome) => {
    const label = criarElemento("label", "", texto)
    const input = document.createElement("input")

    input.type = tipo
    input.name = nome
    input.required = true

    label.appendChild(input)

    return { label, input }
}

const excluirMissa = async (missaId) => {
    if (!confirm("Tem certeza que deseja excluir esta escala?"))
        return

    try {
        await api(`/api/missas/${missaId}`, {
            method: "DELETE"
        })

        await carregarMissas()
    } catch (erro) {
        alert(erro.message)
    }
}

const removerCoroinha = async (missaId, coroinhaId) => {
    if (!confirm("Deseja remover este coroinha da escala?"))
        return

    try {
        await api(`/api/missas/${missaId}/coroinhas/${coroinhaId}`, {
            method: "DELETE"
        })

        await carregarMissas()
    } catch (erro) {
        alert(erro.message)
    }
}


const converterDataParaBanco = (data) => {
    const resultado = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

    if (!resultado)
        throw new Error("Digite a data no formato DD/MM/AAAA")

    const [, dia, mes, ano] = resultado

    const dataValida = new Date(Number(ano), Number(mes) - 1, Number(dia))

    if (
        dataValida.getDate() != Number(dia) ||
        dataValida.getMonth() + 1 != Number(mes) ||
        dataValida.getFullYear() != Number(ano)
    )
        throw new Error("Data inválida")

    return `${ano}-${mes}-${dia}`
}


createTableButton.addEventListener("click", () => abrirModalEscala())

carregarDados()

