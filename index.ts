// import frontend from "./public/missas.html"

const srv = Bun.serve({
    port: 3000,
    routes: {
        "/": Response.redirect("/login"),
        "/login": {
            GET: async (req) => {
                const file = Bun.file("./public/login.html")
                return new Response(file)
            }
        },
        "/cadastro": {
            GET: async (req) => {
                const file = Bun.file("./public/cadastro.html")
                return new Response(file)
            }
        },
    }
})
console.log(`⚡ Servidor rodando em ${srv.url}`);