import frontend from "./03 - Escala Coroinhas/public/missas.html"

const srv = Bun.serve({
    port: 3000,
    routes: {
        "/": frontend,
        "/login": {
            GET: async (req) => {
                const file = Bun.file("./03 - Escala Coroinhas/public/login.html")
                return new Response(file)
            }
        },
        "/cadastro": {
            GET: async (req) => {
                const file = Bun.file("./03 - Escala Coroinhas/public/cadastro.html")
                return new Response(file)
            }
        },
    }
})
console.log(`⚡ Servidor rodando em ${srv.url}`);