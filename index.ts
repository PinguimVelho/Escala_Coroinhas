import login from "./public/login.html"
import cadastro from "./public/cadastro.html"
import missas from "./public/missas.html"
import missasadm from "./public/missasADM.html"
import db from "./db"

const loggedUsers: any = {}

const verificarUsuario = (req: any) => {
    const ses = req.cookies.get("ses") as string
    const usuario = loggedUsers[ses]

    if (!ses || !usuario)
        return Response.json({ msg: "Usuário não está logado" }, { status: 401 })

    if (usuario.perm !== "user")
        return Response.json({ msg: "Acesso negado" }, { status: 403 })

    return null
}

const verificarADM = (req: any) => {
    const ses = req.cookies.get("ses") as string
    const usuario = loggedUsers[ses]

    if (!ses || !usuario)
        return Response.json({ msg: "Usuário não está logado" }, { status: 401 })

    if (usuario.perm != "admin")
        return Response.json({ msg: "Acesso negado" }, { status: 403 })

    return null
}

const obterCoordenadorId = (nome: string) => {
    const nomeLimpo = nome.trim()

    if (!nomeLimpo)
        throw new Error("Informe o nome do coordenador")

    const existente = db.query(`
        SELECT id FROM coordenadores
        WHERE nome = ? COLLATE NOCASE
    `).get(nomeLimpo) as { id: number } | null

    if (existente)
        return existente.id

    const resultado = db.query(`
        INSERT INTO coordenadores(nome)
        VALUES (?)
    `).run(nomeLimpo)

    return Number(resultado.lastInsertRowid)
}

const srv = Bun.serve({
    port: 3000,
    routes: {
        "/": login,
        "/cadastro": cadastro,
        "/missas": missas,
        "/missas-adm": missasadm,

        "/user": {
            POST: async (req) => {
                try {
                    const body: any = await req.json()

                    if (!body.username || !body.password)
                        return Response.json({ msg: "Preencha todos os campos" }, { status: 400 })

                    const hash = await Bun.password.hash(body.password)

                    const query = db.query(`
                        INSERT INTO users(username, password_hash, perm)
                        VALUES (?, ?, 'user')
                    `)

                    const data = query.run(body.username, hash)

                    return Response.json(data)
                } catch (erro: any) {
                    return Response.json({ msg: "Não foi possível cadastrar o usuário" }, { status: 400 })
                }
            }
        },

        "/login": {
            POST: async (req) => {
                try {
                    const body: any = await req.json()

                    const query = db.query(`
                        SELECT * FROM users
                        WHERE username = ?
                        LIMIT 1
                    `)

                    const data: any = query.get(body.username)

                    if (!data)
                        return Response.json({ msg: "Usuário não encontrado" }, { status: 404 })

                    const isMatch = await Bun.password.verify(body.password, data.password_hash)

                    if (!isMatch)
                        return Response.json({ msg: "Senha incorreta" }, { status: 401 })

                    const uuid = crypto.randomUUID()

                    delete data.password_hash
                    loggedUsers[uuid] = data

                    req.cookies.set("ses", uuid)

                    return Response.json(data)
                } catch {
                    return Response.json({ msg: "Erro ao realizar login" }, { status: 400 })
                }
            }
        },

        "/login/user": {
            GET: (req) => {
                const ses = req.cookies.get("ses") as string
                const data = loggedUsers[ses]

                if (!ses || !data)
                    return Response.json({ msg: "Usuário não está logado" }, { status: 401 })

                return Response.json(data)
            }
        },

        "/api/usuario/missas": {
            GET: (req) => {
                const erro = verificarUsuario(req)
                if (erro) return erro

                const resultado = db.query(`
            SELECT
                missas.id,
                missas.data_missa,
                missas.horario,
                coordenadores.nome AS coordenador,
                coroinhas.id AS coroinha_id,
                coroinhas.nome AS coroinha,
                escala_missa.funcao
            FROM missas
            INNER JOIN coordenadores
                ON coordenadores.id = missas.coordenador_id
            LEFT JOIN escala_missa
                ON escala_missa.missa_id = missas.id
            LEFT JOIN coroinhas
                ON coroinhas.id = escala_missa.coroinha_id
            ORDER BY missas.data_missa, missas.horario
        `).all() as any[]

                const missasMap: any = {}

                resultado.forEach(linha => {
                    if (!missasMap[linha.id]) {
                        missasMap[linha.id] = {
                            id: linha.id,
                            data_missa: linha.data_missa,
                            horario: linha.horario,
                            coordenador: linha.coordenador,
                            coroinhas: []
                        }
                    }

                    if (linha.coroinha_id) {
                        missasMap[linha.id].coroinhas.push({
                            id: linha.coroinha_id,
                            nome: linha.coroinha,
                            funcao: linha.funcao
                        })
                    }
                })

                return Response.json(Object.values(missasMap))
            }
        },

        "/api/usuario/missas/:id": {
            POST: async (req) => {
                const erro = verificarUsuario(req)
                if (erro) return erro

                try {
                    const id = Number(req.params.id)
                    const ses = req.cookies.get("ses") as string
                    const usuario = loggedUsers[ses]
                    const body: any = await req.json()

                    if (!Number.isInteger(id) || id <= 0)
                        return Response.json({ msg: "ID da missa inválido" }, { status: 400 })

                    if (!body.funcao?.trim())
                        return Response.json({ msg: "Informe sua função" }, { status: 400 })

                    const coroinha = db.query(`
                SELECT id FROM coroinhas
                WHERE nome = ? COLLATE NOCASE
            `).get(usuario.username) as { id: number } | null

                    if (!coroinha)
                        return Response.json({ msg: "Seu nome não está cadastrado entre os coroinhas" }, { status: 404 })

                    const resultado = db.query(`
                INSERT INTO escala_missa(missa_id, coroinha_id, funcao)
                VALUES (?, ?, ?)
            `).run(id, coroinha.id, body.funcao.trim())

                    return Response.json(resultado)
                } catch {
                    return Response.json({
                        msg: "Não foi possível adicionar você à escala. Verifique se já está inscrito."
                    }, { status: 400 })
                }
            },

            DELETE: (req) => {
                const erro = verificarUsuario(req)
                if (erro) return erro

                try {
                    const id = Number(req.params.id)
                    const ses = req.cookies.get("ses") as string
                    const usuario = loggedUsers[ses]

                    if (!Number.isInteger(id) || id <= 0)
                        return Response.json({ msg: "ID da missa inválido" }, { status: 400 })

                    const coroinha = db.query(`
                SELECT id FROM coroinhas
                WHERE nome = ? COLLATE NOCASE
            `).get(usuario.username) as { id: number } | null

                    if (!coroinha)
                        return Response.json({ msg: "Coroinha não encontrado" }, { status: 404 })

                    const resultado = db.query(`
                DELETE FROM escala_missa
                WHERE missa_id = ? AND coroinha_id = ?
            `).run(id, coroinha.id)

                    if (resultado.changes === 0)
                        return Response.json({ msg: "Você não está inscrito nesta missa" }, { status: 404 })

                    return Response.json(resultado)
                } catch {
                    return Response.json({ msg: "Não foi possível remover você da escala" }, { status: 400 })
                }
            }
        },


        "/api/coordenadores": {
            GET: (req) => {
                const erro = verificarADM(req)
                if (erro) return erro

                const coordenadores = db.query(`
                    SELECT * FROM coordenadores
                    ORDER BY nome
                `).all()

                return Response.json(coordenadores)
            }
        },

        "/api/missas": {
            GET: (req) => {
                const erro = verificarADM(req)
                if (erro) return erro

                const resultado = db.query(`
                    SELECT
                        missas.id,
                        missas.data_missa,
                        missas.horario,
                        missas.coordenador_id,
                        coordenadores.nome AS coordenador,
                        coroinhas.id AS coroinha_id,
                        coroinhas.nome AS coroinha,
                        escala_missa.funcao
                    FROM missas
                    INNER JOIN coordenadores
                        ON coordenadores.id = missas.coordenador_id
                    LEFT JOIN escala_missa
                        ON escala_missa.missa_id = missas.id
                    LEFT JOIN coroinhas
                        ON coroinhas.id = escala_missa.coroinha_id
                    ORDER BY missas.data_missa, missas.horario
                `).all() as any[]

                const missasMap: any = {}

                resultado.forEach(linha => {
                    if (!missasMap[linha.id]) {
                        missasMap[linha.id] = {
                            id: linha.id,
                            data_missa: linha.data_missa,
                            horario: linha.horario,
                            coordenador_id: linha.coordenador_id,
                            coordenador: linha.coordenador,
                            coroinhas: []
                        }
                    }

                    if (linha.coroinha_id) {
                        missasMap[linha.id].coroinhas.push({
                            id: linha.coroinha_id,
                            nome: linha.coroinha,
                            funcao: linha.funcao
                        })
                    }
                })

                return Response.json(Object.values(missasMap))
            },

            POST: async (req) => {
                const erro = verificarADM(req)
                if (erro) return erro

                try {
                    const body: any = await req.json()

                    if (!body.data_missa || !body.horario || !body.coordenador)
                        return Response.json({ msg: "Preencha todos os campos" }, { status: 400 })

                    const criarMissa = db.transaction(() => {
                        const coordenadorId = obterCoordenadorId(body.coordenador)

                        return db.query(`
                            INSERT INTO missas(data_missa, horario, coordenador_id)
                            VALUES (?, ?, ?)
                        `).run(
                            body.data_missa,
                            body.horario,
                            coordenadorId
                        )
                    })

                    return Response.json(criarMissa())
                } catch (erro: any) {
                    return Response.json({ msg: erro.message }, { status: 400 })
                }
            }
        },

        "/api/missas/:id": {
            PUT: async (req) => {
                const erro = verificarADM(req)
                if (erro) return erro

                try {
                    const id = Number(req.params.id)
                    const body: any = await req.json()

                    if (!Number.isInteger(id) || id <= 0)
                        return Response.json({ msg: "ID inválido" }, { status: 400 })

                    if (!body.data_missa || !body.horario || !body.coordenador)
                        return Response.json({ msg: "Preencha todos os campos" }, { status: 400 })

                    const atualizarMissa = db.transaction(() => {
                        const coordenadorId = obterCoordenadorId(body.coordenador)

                        return db.query(`
                            UPDATE missas
                            SET data_missa = ?, horario = ?, coordenador_id = ?
                            WHERE id = ?
                        `).run(
                            body.data_missa,
                            body.horario,
                            coordenadorId,
                            id
                        )
                    })

                    return Response.json(atualizarMissa())
                } catch (erro: any) {
                    return Response.json({ msg: erro.message }, { status: 400 })
                }
            },

            DELETE: (req) => {
                const erro = verificarADM(req)
                if (erro) return erro

                try {
                    const id = Number(req.params.id)

                    if (!Number.isInteger(id) || id <= 0)
                        return Response.json({ msg: "ID inválido" }, { status: 400 })

                    const resultado = db.query(`
                        DELETE FROM missas
                        WHERE id = ?
                    `).run(id)

                    return Response.json(resultado)
                } catch (erro: any) {
                    return Response.json({ msg: erro.message }, { status: 400 })
                }
            }
        },

        "/api/missas/:id/coroinhas": {
            POST: async (req) => {
                const erro = verificarADM(req)
                if (erro) return erro

                try {
                    const missaId = Number(req.params.id)
                    const body: any = await req.json()

                    if (!Number.isInteger(missaId) || missaId <= 0)
                        return Response.json({ msg: "ID da missa inválido" }, { status: 400 })

                    if (!body.nome?.trim() || !body.funcao?.trim())
                        return Response.json({ msg: "Preencha todos os campos" }, { status: 400 })

                    const adicionarCoroinha = db.transaction(() => {
                        let coroinha = db.query(`
                            SELECT id FROM coroinhas
                            WHERE nome = ? COLLATE NOCASE
                        `).get(body.nome.trim()) as { id: number } | null

                        if (!coroinha) {
                            const resultado = db.query(`
                                INSERT INTO coroinhas(nome)
                                VALUES (?)
                            `).run(body.nome.trim())

                            coroinha = {
                                id: Number(resultado.lastInsertRowid)
                            }
                        }

                        return db.query(`
                            INSERT INTO escala_missa(missa_id, coroinha_id, funcao)
                            VALUES (?, ?, ?)
                        `).run(
                            missaId,
                            coroinha.id,
                            body.funcao.trim()
                        )
                    })

                    return Response.json(adicionarCoroinha())
                } catch (erro: any) {
                    return Response.json({ msg: "Não foi possível adicionar o coroinha. Verifique se ele já está nesta escala." }, { status: 400 })
                }
            }
        },

        "/api/missas/:missaId/coroinhas/:coroinhaId": {
            DELETE: (req) => {
                const erro = verificarADM(req)
                if (erro) return erro

                try {
                    const missaId = Number(req.params.missaId)
                    const coroinhaId = Number(req.params.coroinhaId)

                    const resultado = db.query(`
                        DELETE FROM escala_missa
                        WHERE missa_id = ? AND coroinha_id = ?
                    `).run(missaId, coroinhaId)

                    return Response.json(resultado)
                } catch (erro: any) {
                    return Response.json({ msg: erro.message }, { status: 400 })
                }
            }
        }
    }
})

console.log(`⚡ Servidor rodando em ${srv.url}`)
