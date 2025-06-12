import sqlite3 from 'sqlite3';
export interface Payment {
    id?: number; 
    user_id: number | null; 
    amount: number;
    currency: string;
    description: string;
    status: string; 
    transaction_id_external?: string; 
    created_at?: string; 
    updated_at?: string; 
}

class PaymentsModel {
    private db: sqlite3.Database;

    constructor(db: sqlite3.Database) {
        this.db = db;
        this.addPayment = this.addPayment.bind(this);
        this.getAllPayments = this.getAllPayments.bind(this);
    }

    async addPayment(paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
        return new Promise((resolve, reject) => {
            const { user_id, amount, currency, description, status, transaction_id_external } = paymentData;
            
            const stmt = this.db.prepare(
                'INSERT INTO payments (user_id, amount, currency, description, status, transaction_id_external) VALUES (?, ?, ?, ?, ?, ?)'
            );

            stmt.run(
                user_id,
                amount,
                currency,
                description,
                status,
                transaction_id_external,
                function(this: sqlite3.RunResult, err: Error | null) {
                    if (err) {
                        return reject(err);
                    }
                    const newPayment: Payment = {
                        id: this.lastID,
                        user_id,
                        amount,
                        currency,
                        description,
                        status,
                        transaction_id_external,
                        created_at: new Date().toISOString(), 
                        updated_at: new Date().toISOString()
                    };
                    resolve(newPayment);
                }
            );
            stmt.finalize();
        });
    }

    async getAllPayments(): Promise<Payment[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM payments ORDER BY created_at DESC', (err: Error | null, rows: Payment[]) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }
}

export default PaymentsModel;
