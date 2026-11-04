import login from "./public/login.html"
import cadastro from "./public/cadastro.html"
import missas from "./public/missas.html"
import missasadm from "./public/missasADM.html"
import db from "./db"

const loggedUsers: any = {}

const srv = Bun.serve({
    port: 3000,
    routes: {
        "/": login,
        "/cadastro": cadastro,
        "/missas": missas,
        "/missas-adm": missasadm,

        "/user": {
            POST: async (req) => {
                const body = await req.body?.json()
                const query = db.query(`INSERT INTO users(username, password_hash, perm) VALUES(:username, :password_hash, 'user')`)
                const hash = await Bun.password.hash(body.password)
                const data = query.run({ ":username": body.username, ":password_hash": hash })
                return Response.json(data)
            }
        },

        "/login": {
            POST: async (req) => {
                const body = await req.body?.json()
                const query = db.query(`SELECT * FROM users WHERE username=:username LIMIT 1`)
                const data: any = query.get({ ":username": body.username })
                if (!data)
                    return Response.json({ msg: "usuário não encontrado" }, { status: 404 })
                const hash = data.password_hash
                const isMatch = await Bun.password.verify(body.password, hash)
                if (!isMatch)
                    return Response.json({ msg: "senha incorreta" }, { status: 401 })
                const uuid = crypto.randomUUID()
                delete data.password_hash
                loggedUsers[uuid] = data
                req.cookies.set("ses", uuid)
                return Response.json(isMatch)
            }
        },

        "/login/user": (req) => {
            const ses = req.cookies.get("ses") as string
            const data = loggedUsers[ses]
            if (!ses || !data)
                return Response.json({ msg: "usuário não esta logado" }, { status: 401 })
            return Response.json(data)
        },
    }
})
console.log(`⚡ Servidor rodando em ${srv.url}`);