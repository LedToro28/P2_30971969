// src/models/UserModel.ts

import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';

// Define la interfaz para un usuario
export interface User {
    id?: number;
    username: string;
    password_hash?: string; // Opcional, ya que puede ser un usuario de Google
    google_id?: string;
    display_name?: string;
    email: string;
    created_at?: string;
}

class UserModel {
    private db: sqlite3.Database;
    private saltRounds: number = 10; // Número de rondas de sal para bcrypt

    constructor(db: sqlite3.Database) {
        this.db = db;
        // Vinculamos los métodos al contexto de la clase
        this.findByUsername = this.findByUsername.bind(this);
        this.findByEmail = this.findByEmail.bind(this);
        this.findById = this.findById.bind(this);
        this.findByGoogleId = this.findByGoogleId.bind(this);
        this.createLocalUser = this.createLocalUser.bind(this);
        this.createUserWithGoogle = this.createUserWithGoogle.bind(this);
        this.updateUser = this.updateUser.bind(this);
        this.comparePassword = this.comparePassword.bind(this); // Asegura que comparePassword esté vinculado
    }

    /**
     * Busca un usuario por su nombre de usuario.
     * @param username El nombre de usuario a buscar.
     * @returns Una Promesa que resuelve con el usuario encontrado o null.
     */
    async findByUsername(username: string): Promise<User | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE username = ?', [username], (err: Error | null, row: User) => {
                if (err) {
                    console.error('Error al buscar usuario por nombre de usuario:', err.message);
                    return reject(err);
                }
                resolve(row || null);
            });
        });
    }

    /**
     * Busca un usuario por su email.
     * @param email El email a buscar.
     * @returns Una Promesa que resuelve con el usuario encontrado o null.
     */
    async findByEmail(email: string): Promise<User | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE email = ?', [email], (err: Error | null, row: User) => {
                if (err) {
                    console.error('Error al buscar usuario por email:', err.message);
                    return reject(err);
                }
                resolve(row || null);
            });
        });
    }

    /**
     * Busca un usuario por su ID.
     * @param id El ID del usuario a buscar.
     * @returns Una Promesa que resuelve con el usuario encontrado o null.
     */
    async findById(id: number): Promise<User | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE id = ?', [id], (err: Error | null, row: User) => {
                if (err) {
                    console.error('Error al buscar usuario por ID:', err.message);
                    return reject(err);
                }
                resolve(row || null);
            });
        });
    }

    /**
     * Busca un usuario por su ID de Google.
     * @param googleId El ID de Google a buscar.
     * @returns Una Promesa que resuelve con el usuario encontrado o null.
     */
    async findByGoogleId(googleId: string): Promise<User | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE google_id = ?', [googleId], (err: Error | null, row: User) => {
                if (err) {
                    console.error('Error al buscar usuario por Google ID:', err.message);
                    return reject(err);
                }
                resolve(row || null);
            });
        });
    }

    /**
     * Crea un nuevo usuario local.
     * @param username Nombre de usuario del nuevo usuario.
     * @param password Contraseña sin hashear del nuevo usuario.
     * @param displayName Nombre a mostrar del usuario (opcional).
     * @param email Email del usuario.
     * @returns Una Promesa que resuelve con el ID del nuevo usuario.
     */
    async createLocalUser(username: string, password: string, displayName: string | undefined, email: string): Promise<number> {
        const passwordHash = await bcrypt.hash(password, this.saltRounds);
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO users (username, password_hash, display_name, email) VALUES (?, ?, ?, ?)',
                [username, passwordHash, displayName, email],
                function(this: sqlite3.RunResult, err: Error | null) {
                    if (err) {
                        console.error('Error al crear usuario local:', err.message);
                        return reject(err);
                    }
                    resolve(this.lastID);
                }
            );
        });
    }

    /**
     * Crea un nuevo usuario con credenciales de Google.
     * @param email Email del usuario de Google.
     * @param googleId ID de Google del usuario.
     * @param displayName Nombre a mostrar del usuario.
     * @returns Una Promesa que resuelve con el usuario creado.
     */
    async createUserWithGoogle(email: string, googleId: string, displayName: string): Promise<User> {
        // Para Google, no necesitamos un username local ni password_hash
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO users (email, google_id, display_name) VALUES (?, ?, ?)',
                [email, googleId, displayName],
                function(this: sqlite3.RunResult, err: Error | null) {
                    if (err) {
                        console.error('Error al crear usuario con Google:', err.message);
                        return reject(err);
                    }
                    // Retorna el objeto usuario completo (sin el hash de contraseña, si lo hubiera)
                    resolve({
                        id: this.lastID,
                        email,
                        google_id: googleId,
                        display_name: displayName,
                        username: '', // Puede ser una cadena vacía o generar uno si es necesario para el sistema
                    });
                }
            );
        });
    }

    /**
     * Actualiza un usuario existente.
     * @param id ID del usuario a actualizar.
     * @param updates Objeto con las propiedades a actualizar.
     * @returns Una Promesa que resuelve cuando el usuario es actualizado.
     */
    async updateUser(id: number, updates: Partial<User>): Promise<void> {
        const setClauses: string[] = [];
        const params: any[] = [];

        for (const key in updates) {
            if (updates.hasOwnProperty(key)) {
                setClauses.push(`${key} = ?`);
                params.push((updates as any)[key]);
            }
        }

        if (setClauses.length === 0) {
            return Promise.resolve(); // No hay nada que actualizar
        }

        params.push(id);
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
                params,
                function(this: sqlite3.RunResult, err: Error | null) {
                    if (err) {
                        console.error('Error al actualizar usuario:', err.message);
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    /**
     * Compara una contraseña plana con un hash.
     * @param password Contraseña plana.
     * @param hash Hash de la contraseña.
     * @returns Una Promesa que resuelve con true si coinciden, false en caso contrario.
     */
    async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}

// Exporta la clase UserModel como exportación por defecto
export default UserModel;
