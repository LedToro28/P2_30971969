import sqlite3 from 'sqlite3';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'app.db');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log(`Directorio 'data' creado en ${dataDir}`);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error conectando a la base de datos SQLite:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite en', DB_PATH);
    }
});

function runAsync(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

async function addColumnIfNotExists(table: string, column: string, definition: string): Promise<void> {
    try {
        // Verificar si la columna ya existe
        const checkSql = `PRAGMA table_info(${table})`;
        const columns: any[] = await new Promise((resolve, reject) => {
            db.all(checkSql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const columnExists = columns.some(col => col.name === column);
        
        if (!columnExists) {
            const alterSql = `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`;
            await runAsync(alterSql);
            console.log(`Columna ${column} añadida a la tabla ${table}`);
        }
    } catch (error) {
        console.error(`Error verificando/añadiendo columna ${column} a ${table}:`, error);
    }
}

async function initTables(): Promise<void> {
    console.log('Iniciando creación/verificación de tablas...');
    try {
        // Tabla users con campos extendidos
        await runAsync(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                google_id TEXT,
                is_admin BOOLEAN NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                email_verified BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Tabla users lista o ya existía.');

        // Añadir columnas adicionales si no existen
        await addColumnIfNotExists('users', 'google_id', 'TEXT');
        await addColumnIfNotExists('users', 'is_admin', 'BOOLEAN NOT NULL DEFAULT 0');
        await addColumnIfNotExists('users', 'is_active', 'BOOLEAN NOT NULL DEFAULT 1');
        await addColumnIfNotExists('users', 'email_verified', 'BOOLEAN NOT NULL DEFAULT 0');
        await addColumnIfNotExists('users', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

        // Tabla contacts
        await runAsync(`
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                country TEXT,
                clientIp TEXT,
                message TEXT,
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email) REFERENCES users(username) ON DELETE SET NULL
            )
        `);
        console.log('Tabla contacts lista o ya existía.');

        // Añadir columnas adicionales a contacts
        await addColumnIfNotExists('contacts', 'phone', 'TEXT');
        await addColumnIfNotExists('contacts', 'message', 'TEXT');
        await addColumnIfNotExists('contacts', 'is_read', 'BOOLEAN DEFAULT 0');

        // Tabla messages
        await runAsync(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contactId INTEGER NOT NULL,
                message TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'Pending',
                replyMessage TEXT,
                repliedAt DATETIME,
                repliedBy INTEGER,
                is_notified BOOLEAN DEFAULT 0,
                FOREIGN KEY (contactId) REFERENCES contacts(id),
                FOREIGN KEY (repliedBy) REFERENCES users(id)
            )
        `);
        console.log('Tabla messages lista o ya existía.');

        // Añadir columna a messages
        await addColumnIfNotExists('messages', 'is_notified', 'BOOLEAN DEFAULT 0');

        // Tabla payments
        await runAsync(`
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transactionId TEXT UNIQUE,
                userId INTEGER,
                amount REAL,
                currency TEXT,
                status TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                buyerEmail TEXT,
                description TEXT,
                apiResponse TEXT,
                payment_method TEXT,
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);
        console.log('Tabla payments lista o ya existía.');

        // Añadir columna a payments
        await addColumnIfNotExists('payments', 'payment_method', 'TEXT');

        // Tabla para tokens de verificación de email
        await runAsync(`
            CREATE TABLE IF NOT EXISTS verification_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                used BOOLEAN DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('Tabla verification_tokens lista o ya existía.');

        console.log('Creación/verificación de tablas completada.');
    } catch (error) {
        console.error('Error durante la creación/verificación de tablas:', error);
        throw error;
    }
}

export { db, initTables };