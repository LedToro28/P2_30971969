import { Request, Response } from 'express';
import PaymentsModel, { Payment } from '../models/PaymentModel';
import MailerService from '../service/MailerService';

class PaymentsController {
    private mailerService: MailerService;
    private paymentsModel: PaymentsModel;

    constructor(mailerService: MailerService, paymentsModel: PaymentsModel) {
        this.mailerService = mailerService;
        this.paymentsModel = paymentsModel;

        this.showPaymentForm = this.showPaymentForm.bind(this);
        this.add = this.add.bind(this);
        this.index = this.index.bind(this);
    }

    showPaymentForm(req: Request, res: Response): void {
        res.render('payment', {
            pageTitle: 'Realizar Pago',
            ogDescription: 'Procese su pago de forma segura por los servicios de jardinería en jardines sagitario.',
            ogImage: 'https://fakepayment.onrender.com/', 
            ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl 
        });
    }

    async add(req: Request, res: Response): Promise<void> {
        const { amount, currency, service, description, email: customerEmailFromForm } = req.body;

        if (!amount || isNaN(Number(amount)) || !currency || !service) {
            req.flash('error', 'Por favor, completa todos los campos de pago correctamente.');
            return res.redirect('/payment');
        }

        try {
            const parsedAmount = parseFloat(amount);

            const transactionId = Math.floor(Math.random() * 1000000);
            const paymentStatus = 'Completado';

            let userIdForPayment: number | null = null;
            let userNameForEmail: string = 'Cliente';
            let userEmailForEmail: string = 'cliente@example.com';

            if (req.user) {
                const authenticatedUser = req.user as Express.User;
                userIdForPayment = authenticatedUser.id ?? null;
                userNameForEmail = authenticatedUser.username || authenticatedUser.display_name || 'Usuario';
                userEmailForEmail = authenticatedUser.email || 'cliente@example.com';
            } else {
                if (customerEmailFromForm) {
                    userEmailForEmail = customerEmailFromForm;
                }
            }

            const newPayment = await this.paymentsModel.addPayment({
                user_id: userIdForPayment,
                amount: parsedAmount,
                currency: currency,
                description: description || service,
                status: paymentStatus,
                transaction_id_external: `TRX-${transactionId}`
            });

            await this.mailerService.sendPaymentConfirmation(
                userNameForEmail,
                userEmailForEmail,
                {
                    id: newPayment.id as number,
                    amount: parsedAmount,
                    currency: currency,
                    date: new Date().toLocaleDateString('es-ES'),
                    description: description || service,
                    status: paymentStatus
                }
            );

            req.flash('paymentSuccess', `¡Pago de ${parsedAmount.toFixed(2)} ${currency} realizado con éxito! ID de transacción: ${transactionId}`);
            res.redirect('/payment');
        } catch (err) {
            console.error('Error al procesar el pago:', err);
            req.flash('paymentError', 'Hubo un error al procesar tu pago. Por favor, intenta de nuevo más tarde.');
            res.redirect('/payment');
        }
    }

    async index(req: Request, res: Response): Promise<void> {
        try {
            const allPayments = await this.paymentsModel.getAllPayments();
            res.render('admin/payments', {
                pageTitle: 'Pagos Realizados',
                payments: allPayments
            });
        } catch (err) {
            console.error('Error al obtener pagos:', err);
            req.flash('error', 'Hubo un error al obtener los pagos.');
            res.redirect('/admin');
        }
    }
}

export default PaymentsController;
