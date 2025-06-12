// src/database.ts

import sqlite3 from 'sqlite3';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

// Define la ruta de la base de datos
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');

// Asegura que el directorio 'data' exista
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Directorio 'data' creado en ${dataDir}`);
}

// Conecta a la base de datos SQLite
export const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error conectando a la base de datos SQLite:', err.message);
        process.exit(1); // Salir si no se puede conectar a la DB
    } else {
        console.log('Conectado a la base de datos SQLite en', DB_PATH);
        // Habilitar el modo de claves foráneas para asegurar la integridad referencial
        db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
            if (pragmaErr) {
                console.error('Error al habilitar PRAGMA foreign_keys:', pragmaErr.message);
            } else {
                console.log('PRAGMA foreign_keys está ON.');
            }
        });
    }
});

/**
 * Ejecuta una consulta SQL de forma asíncrona.
 * @param sql La consulta SQL a ejecutar.
 * @param params Los parámetros para la consulta.
 * @returns Una Promesa que resuelve con el lastID y changes, o rechaza con un error.
 */
export function runAsync(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
            if (err) {
                console.error(`ERROR al ejecutar SQL (runAsync): "${sql}" con params: ${JSON.stringify(params)}`, err.message);
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

/**
 * Ejecuta una consulta SQL para obtener un único registro de forma asíncrona.
 * @param sql La consulta SQL para seleccionar un registro.
 * @param params Los parámetros para la consulta.
 * @returns Una Promesa que resuelve con el registro (objeto) o null.
 */
export function getAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err: Error | null, row: T) => {
            if (err) {
                console.error(`ERROR al ejecutar SQL (getAsync): "${sql}" con params: ${JSON.stringify(params)}`, err.message);
                reject(err);
            } else {
                resolve(row || null);
            }
        });
    });
}

/**
 * Ejecuta una consulta SQL para obtener múltiples registros de forma asíncrona.
 * @param sql La consulta SQL para seleccionar múltiples registros.
 * @param params Los parámetros para la consulta.
 * @returns Una Promesa que resuelve con un array de registros.
 */
export function allAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err: Error | null, rows: T[]) => {
            if (err) {
                console.error(`ERROR al ejecutar SQL (allAsync): "${sql}" con params: ${JSON.stringify(params)}`, err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Función para inicializar y verificar la existencia de las tablas
export async function initTables(): Promise<void> {
    console.log('--- Iniciando creación/verificación de tablas ---');
    try {
        console.log('Intentando crear tabla users...');
        await runAsync(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                google_id TEXT UNIQUE,
                display_name TEXT,
                email TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('OK: Tabla users lista o ya existía.');

        console.log('Intentando crear tabla contacts...');
        await runAsync(`
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                country TEXT,
                client_ip TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('OK: Tabla contacts lista o ya existía.');

        console.log('Intentando crear tabla messages...');
        await runAsync(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id INTEGER NOT NULL,
                message_content TEXT NOT NULL,
                status TEXT DEFAULT 'new',
                reply_content TEXT,
                replied_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
            )
        `);
        console.log('OK: Tabla messages lista o ya existía.');

        console.log('Intentando crear tabla payments...');
        await runAsync(`
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                amount REAL NOT NULL,
                currency TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                transaction_id_external TEXT UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('OK: Tabla payments lista o ya existía.');

        console.log('--- Creación/verificación de tablas completada exitosamente ---');
    } catch (error) {
        console.error('--- ERROR CRÍTICO durante la creación/verificación de tablas ---', error);
        throw error; // Re-lanza el error para que la aplicación principal falle si esto ocurre
    }
}
