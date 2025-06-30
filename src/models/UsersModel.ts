import { Database } from 'sqlite3';
import bcrypt from 'bcrypt';

export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export default class UsersModel {
  constructor(private db: Database) {}

  findByUsername(username: string): Promise<UserRecord | null> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) return reject(err);
        resolve(row ? (row as UserRecord) : null);
      });
    });
  }

  findById(id: number): Promise<UserRecord | null> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row ? (row as UserRecord) : null);
      });
    });
  }

  async createUser(username: string, password: string): Promise<number> {
    const password_hash = await bcrypt.hash(password, 10);
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
        [username, password_hash],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  verifyPassword(user: UserRecord, plain: string): Promise<boolean> {
    return bcrypt.compare(plain, user.password_hash);
  }
}
