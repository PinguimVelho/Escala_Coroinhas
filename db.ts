
import { Database } from "bun:sqlite";

const db = new Database("database.sqlite");

// Ativar chaves estrangeiras
db.run("PRAGMA foreign_keys = ON");

// Usuários
const users = db.query(`
    CREATE TABLE IF NOT EXISTS users (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        username        TEXT NOT NULL UNIQUE,
        password_hash   TEXT NOT NULL,
        perm            TEXT NOT NULL
    );
`);

users.run();

// Coordenadores
const coordenadores = db.query(`
    CREATE TABLE IF NOT EXISTS coordenadores (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        nome            TEXT NOT NULL
    );
`);

coordenadores.run();

// Coroinhas
const coroinhas = db.query(`
    CREATE TABLE IF NOT EXISTS coroinhas (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        nome            TEXT NOT NULL
    );
`);

coroinhas.run();

// Missas
const missas = db.query(`
    CREATE TABLE IF NOT EXISTS missas (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        data_missa      TEXT NOT NULL,
        horario         TEXT NOT NULL,
        coordenador_id  INTEGER NOT NULL,

        FOREIGN KEY (coordenador_id)
            REFERENCES coordenadores(id)
    );
`);

missas.run();

// Escala dos coroinhas
const escala_missa = db.query(`
    CREATE TABLE IF NOT EXISTS escala_missa (
        missa_id        INTEGER NOT NULL,
        coroinha_id     INTEGER NOT NULL,
        funcao          TEXT NOT NULL,

        PRIMARY KEY (missa_id, coroinha_id),

        FOREIGN KEY (missa_id)
            REFERENCES missas(id)
            ON DELETE CASCADE,

        FOREIGN KEY (coroinha_id)
            REFERENCES coroinhas(id)
    );
`);

escala_missa.run();

export { db };
export default db;
