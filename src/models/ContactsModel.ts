import sqlite3 from 'sqlite3';

interface ContactData { // Define una interfaz para la estructura de los datos de contacto
    name: string;
    email: string;
    comment: string;
    ip_address?: string; // Opcional si a veces no está
}

interface Contact extends ContactData { // Interfaz para el contacto completo (con ID y fecha)
    id: number;
    created_at: string;
}

class ContactsModel {
    private db: sqlite3.Database; // Especifica el tipo y que es privado

    constructor(db: sqlite3.Database) {
        this.db = db;
        this.createTable();
    }
    createTable(): void { // Especifica tipo de retorno void
        const sql = `CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    comment TEXT,
    ip_address TEXT,
    created_at TEXT
)`;
        this.db.run(sql, (err: Error | null) => { // Especifica tipo de err
            if (err) {
                console.error('Error al crear la tabla contacts:', err.message);
            } else {
                console.log('Tabla contacts lista.');
            }
        });
    }

    addContact(contactData: ContactData, callback: (err: Error | null, contactId?: number) => void): void { // Especifica tipos de parámetros y retorno
        const sql = `INSERT INTO contacts (name, email, comment, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?)`;
        const now = new Date().toISOString();

        this.db.run(
            sql,
            [contactData.name, contactData.email, contactData.comment, contactData.ip_address, now],
            function(this: sqlite3.RunResult, err: Error | null) { // Usa 'this: sqlite3.RunResult' para tipar 'this'
                if (err) {
                    console.error('Error al guardar el contacto:', err.message);
                    return callback(err);
                }
                callback(null, this.lastID);
            }
        );
    }

    getAllContacts(callback: (err: Error | null, contacts?: Contact[]) => void): void { // Especifica tipos
        const sql = `SELECT * FROM contacts ORDER BY created_at DESC`;
        this.db.all(sql, [], (err: Error | null, rows: any[]) => { // sqlite3.all devuelve any[] por defecto, puedes castear o mapear si necesitas Contact[] fuertemente tipado
            if (err) {
                console.error('Error al obtener contactos:', err.message);
                return callback(err);
            }
            // Opcional: Mapear a tipo Contact si la estructura es exactamente la misma
            // const contacts: Contact[] = rows.map(row => row as Contact);
            callback(null, rows as Contact[]); // Casteo simple si sabes que la estructura coincide
        });
    }
}

export default ContactsModel; // Usar export default en lugar de module.exports (preferido en TS/ESM)