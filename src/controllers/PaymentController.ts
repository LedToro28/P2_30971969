import { Request, Response } from 'express';
import fetch from 'node-fetch';
import MailerService from '../service/MailerService';
import PaymentModel from '../models/PaymentModel';

class PaymentController {
    private readonly API_BASE_URL = 'https://fakepayment.onrender.com';
    private mailerService: MailerService;
    private paymentModel: PaymentModel;
    private readonly API_KEY = process.env.FAKE_PAYMENT_API_KEY;

    constructor(mailerService: MailerService, paymentModel: PaymentModel) {
        this.mailerService = mailerService;
        this.paymentModel = paymentModel;
        if (!this.API_KEY) {
            console.warn('ADVERTENCIA: La clave de API de Fake Payment (FAKE_PAYMENT_API_KEY) no está configurada en .env. Las solicitudes de pago fallarán.');
        }
        this.showPaymentForm = this.showPaymentForm.bind(this);
        this.add = this.add.bind(this);
    }

    showPaymentForm(req: Request, res: Response): void {
        res.render('payment', {
            pageTitle: 'Procesar Pago'
        });
    }

    async add(req: Request, res: Response): Promise<void> {
        const {
            service,
            email,
            cardName,
            cardNumber,
            expiryMonth,
            expiryYear,
            cvc,
            amount,
            currency
        } = req.body;
        console.log(req.body)

        if (!service || !email || !cardName || !cardNumber || !expiryMonth || !expiryYear || !cvc || !amount || !currency) {
            console.log('paymentError', 'Error: Todos los campos del formulario de pago son obligatorios.');

            return res.redirect('/payment');
        }

        const cleanedCardNumber = cardNumber.replace(/[\s-]/g, '');
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            console.log('paymentError', 'Error: El monto a pagar debe ser un número positivo.');
            return res.redirect('/payment');
        }

        const reference = `payment_id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const description = `Pago por servicio: ${service}`;
        const formattedExpiryMonth = String(expiryMonth).padStart(2, '0');

        try {
            const paymentPayload = {
                "amount": parsedAmount.toFixed(2),
                "card-number": cleanedCardNumber,
                "cvv": cvc,
                "expiration-month": formattedExpiryMonth,
                "expiration-year": String(expiryYear),
                "full-name": cardName,
                "currency": currency,
                "description": description,
                "reference": reference
            };

            const fakePaymentApiResponse = await fetch(`${this.API_BASE_URL}/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: JSON.stringify(paymentPayload)
            });

            const rawResponseText = await fakePaymentApiResponse.text();
            let paymentResult;
            try {
                paymentResult = JSON.parse(rawResponseText);
            } catch (parseError) {
                console.log('paymentError', `Error en el pago: La API devolvió un formato inesperado o un error interno.`);
                return res.redirect('/payment');
            }
            console.log('status:', fakePaymentApiResponse.status);
console.log('rawBody:', rawResponseText);
console.log('parsed:', paymentResult);


            if (fakePaymentApiResponse.ok && paymentResult.success) {
                console.log('paymentSuccess', `¡Pago exitoso! Transacción ID: ${paymentResult.data.transaction_id || paymentResult.data.reference}`);
                try {
                    await this.mailerService.sendPaymentConfirmation(
                        email,
                        cardName,
                        paymentResult.data.transaction_id || paymentResult.data.reference,
                        parsedAmount.toFixed(2),
                        currency,
                        new Date()
                    );
                } catch (emailError) {

                }
                try {
                    await this.paymentModel.addPaymentRecord(
                        paymentResult.data.transaction_id || paymentResult.data.reference,
                        parsedAmount,
                        currency,
                        'completed',
                        email,
                        description
                    );
                } catch (dbError) {
 
                }
            } else {
                console.log('paymentError', `Error en el pago: ${paymentResult.message}`);
            }
        } catch (apiError) {
            console.log('paymentError', 'Error al procesar el pago. Intenta de nuevo más tarde.');
        }
        res.render('payment', {
            pageTitle: 'Pago exitoso!'
        });    }
}

export default PaymentController;
