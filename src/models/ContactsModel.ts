import sqlite3 from 'sqlite3';
export interface Contact {
    id?: number;
    name: string;
    email: string;
    country: string;
    client_ip: string;
    created_at?: string;
    updated_at?: string;
}

export interface Message {
    id?: number;
    contact_id: number;
    message_content: string;
    status: 'new' | 'read' | 'replied' | 'Pending' | 'Respondido';
    reply_content?: string;
    replied_by?: string;
    created_at?: string;
    updated_at?: string;
}

export interface DetailedMessage extends Message {
    contact_name?: string;
    contact_email?: string;
    contact_country?: string;
    contact_client_ip?: string;
}

class ContactsModel {
    private db: sqlite3.Database;

    constructor(db: sqlite3.Database) {
        this.db = db;
        this.findContactByEmail = this.findContactByEmail.bind(this);
        this.findContactById = this.findContactById.bind(this);
        this.addContact = this.addContact.bind(this);
        this.addMessage = this.addMessage.bind(this);
        this.getAllContacts = this.getAllContacts.bind(this);
        this.getMessagesByStatus = this.getMessagesByStatus.bind(this);
        this.getMessageById = this.getMessageById.bind(this);
        this.updateMessageReplyStatus = this.updateMessageReplyStatus.bind(this);
    }

    async findContactById(id: number): Promise<Contact | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM contacts WHERE id = ?', [id], (err: Error | null, row: Contact) => {
                if (err) {
                    return reject(err);
                }
                resolve(row || null);
            });
        });
    }

    async findContactByEmail(email: string): Promise<Contact | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM contacts WHERE email = ?', [email], (err: Error | null, row: Contact) => {
                if (err) {
                    return reject(err);
                }
                resolve(row || null);
            });
        });
    }

    async addContact(name: string, email: string, country: string, clientIp: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO contacts (name, email, country, client_ip) VALUES (?, ?, ?, ?)');
            stmt.run(name, email, country, clientIp, function(this: sqlite3.RunResult, err: Error | null) {
                if (err) {
                    return reject(err);
                }
                resolve(this.lastID);
            });
            stmt.finalize();
        });
    }

    async getAllContacts(): Promise<Contact[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM contacts ORDER BY created_at DESC', (err: Error | null, rows: Contact[]) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    async addMessage(contactId: number, messageContent: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO messages (contact_id, message_content, status) VALUES (?, ?, ?)');
            stmt.run(contactId, messageContent, 'new', function(this: sqlite3.RunResult, err: Error | null) {
                if (err) {
                    return reject(err);
                }
                resolve(this.lastID);
            });
            stmt.finalize();
        });
    }

    async getMessagesByStatus(status: 'new' | 'read' | 'replied' | 'Pending' | 'Respondido'): Promise<Message[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM messages WHERE status = ? ORDER BY created_at DESC', [status], (err: Error | null, rows: Message[]) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    async getMessageById(messageId: number): Promise<DetailedMessage | null> {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT
                    m.*,
                    c.name as contact_name,
                    c.email as contact_email,
                    c.country as contact_country,
                    c.client_ip as contact_client_ip
                FROM messages m
                JOIN contacts c ON m.contact_id = c.id
                WHERE m.id = ?
            `, [messageId], (err: Error | null, row: DetailedMessage) => {
                if (err) {
                    return reject(err);
                }
                resolve(row || null);
            });
        });
    }

    async updateMessageReplyStatus(messageId: number, replyContent: string, repliedBy: string): Promise<void> {
        return new Promise((resolve, reject) => {
  
            this.db.run(
                'UPDATE messages SET status = ?, reply_content = ?, replied_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['Respondido', replyContent, repliedBy, messageId], 
                (err: Error | null) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }
}

export default ContactsModel;