import { Database, RunResult } from 'sqlite3';
import bcrypt from 'bcrypt';

export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  google_id?: string;
  created_at: string;
}

export default class UsersModel {
  constructor(private db: Database) {}

  async findByUsername(username: string): Promise<UserRecord | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM users WHERE username = ?`, 
        [username],
        (err: Error | null, row: UserRecord) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  async findById(id: number): Promise<UserRecord | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM users WHERE id = ?`,
        [id],
        (err: Error | null, row: UserRecord) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  async createUser(username: string, password: string): Promise<number> {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const existingUser = await this.findByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const password_hash = await bcrypt.hash(password, 12);
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
        [username, password_hash],
        function (this: RunResult, err: Error | null) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  async verifyPassword(user: UserRecord, plainPassword: string): Promise<boolean> {
    if (!user?.password_hash) return false;
    return bcrypt.compare(plainPassword, user.password_hash);
  }

  async findOrCreateGoogleUser(profile: any): Promise<UserRecord> {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new Error('No email provided in Google profile');

    // Buscar usuario existente
    const existingUser = await this.findByUsername(email);
    if (existingUser) return existingUser;

    // Crear nuevo usuario para Google
    const username = email;
    const displayName = profile.displayName || username.split('@')[0];

    return new Promise((resolve, reject) => {
      // Guardar referencia a la instancia de db
      const dbInstance = this.db;

      this.db.run(
        `INSERT INTO users (username, google_id) VALUES (?, ?)`,
        [displayName, profile.id],
        function (this: RunResult, err: Error | null) {
          if (err) return reject(err);
          
          // Usar la referencia guardada
          dbInstance.get(
            `SELECT * FROM users WHERE id = ?`,
            [this.lastID],
            (err: Error | null, row: UserRecord) => {
              if (err) return reject(err);
              if (!row) return reject(new Error('User not found after creation'));
              resolve(row);
            }
          );
        }
      );
    });
  }

  async setPassword(userId: number, newPassword: string): Promise<void> {
    const password_hash = await bcrypt.hash(newPassword, 12);
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE users SET password_hash = ? WHERE id = ?`,
        [password_hash, userId],
        (err: Error | null) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }
}
