import { db } from '../db';
import sqlite3 from 'sqlite3';

export interface Contact {
    id: number;
    name: string;
    email: string;
    country?: string;
    clientIp?: string;
    created_at?: string;
}

export interface Message {
    id: number;
    contactId: number;
    message: string;
    timestamp?: string;
    status?: string;
    replyMessage?: string;
    repliedAt?: string;
    repliedBy?: string;
}

export interface MessageWithContact extends Message {
    name: string;
    email: string;
    country?: string;
    clientIp?: string;
}

class ContactsModel {
    private db: sqlite3.Database;

    constructor(db: sqlite3.Database) {
        this.db = db;
    }

    findContactByEmail(email: string): Promise<Contact | null> {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM contacts WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row ? (row as Contact) : null);
            });
        });
    }

    addContact(name: string, email: string, country: string, clientIp: string): Promise<number> {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO contacts (name, email, country, clientIp) VALUES (?, ?, ?, ?)',
                [name, email, country, clientIp],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    addMessage(contactId: number, message: string): Promise<number> {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO messages (contactId, message) VALUES (?, ?)',
                [contactId, message],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    getAllContacts(): Promise<Contact[]> {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM contacts ORDER BY created_at DESC', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as Contact[]);
            });
        });
    }

    getMessagesByStatus(status: string): Promise<MessageWithContact[]> {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT m.*, c.name, c.email, c.country, c.clientIp, c.country, c.created_at
                 FROM messages m
                 JOIN contacts c ON m.contactId = c.id
                 WHERE m.status = ?
                 ORDER BY m.timestamp DESC`,
                [status],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows as MessageWithContact[]);
                }
            );
        });
    }

    getMessageById(messageId: number): Promise<MessageWithContact | null> {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT m.*, c.name, c.email, c.country, c.clientIp
                 FROM messages m
                 JOIN contacts c ON m.contactId = c.id
                 WHERE m.id = ?`,
                [messageId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve((row as MessageWithContact) || null);
                }
            );
        });
    }

    updateMessageReplyStatus(messageId: number, replyMessage: string, repliedBy: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE messages SET status = 'Respondido', replyMessage = ?, repliedAt = CURRENT_TIMESTAMP, repliedBy = ? WHERE id = ?`,
                [replyMessage, repliedBy, messageId],
                function (err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
}

export default ContactsModel;