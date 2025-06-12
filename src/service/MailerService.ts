import nodemailer from 'nodemailer';
import 'dotenv/config'; 

    class MailerService {
        private transporter;
        private fromEmail: string;
        private adminEmail: string;

        constructor() {
            this.transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: Number(process.env.EMAIL_PORT),
                secure: process.env.EMAIL_SECURE === 'true', 
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            this.fromEmail = process.env.EMAIL_FROM || 'no-reply@example.com';
            this.adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
            this.transporter.verify((error, success) => {
                if (error) {
                    console.error('Error al verificar la configuración del correo:', error);
                } else {
                    console.log('Servidor de correo listo para enviar mensajes.');
                }
            });
        }

        async sendContactConfirmation(
            name: string,
            email: string,
            message: string,
            country: string,
            clientIp: string,
            isExistingContact: boolean,
            userId?: number,
            createdAt?: string 
        ): Promise<void> {
            const subject = isExistingContact ? 'Tu mensaje ha sido recibido (actualización de contacto)' : 'Gracias por tu mensaje - Ciclexpress';
            const userEmailContent = `
                Hola ${name},
                Hemos recibido tu mensaje con el siguiente contenido:
                "${message}"
                Nos pondremos en contacto contigo lo antes posible.

                Gracias,
                Equipo de Ciclexpress
            `;

            const adminNotificationContent = `
                Nuevo Mensaje de Contacto:
                Nombre: ${name}
                Email: ${email}
                Mensaje: ${message}
                País: ${country}
                IP: ${clientIp}
                ${userId ? `ID de Contacto: ${userId}` : ''}
                ${createdAt ? `Registrado desde: ${createdAt}` : ''}
                Estado: ${isExistingContact ? 'Contacto existente, nuevo mensaje' : 'Nuevo contacto y mensaje'}
            `;

            try {
                await this.transporter.sendMail({
                    from: this.fromEmail,
                    to: email,
                    subject: subject,
                    text: userEmailContent,
                    html: `<p>${userEmailContent.replace(/\n/g, '<br>')}</p>`,
                });
                console.log(`Correo de confirmación de contacto enviado a: ${email}`);

                await this.transporter.sendMail({
                    from: this.fromEmail,
                    to: this.adminEmail,
                    subject: `[Ciclexpress] Nuevo Mensaje de Contacto de ${name}`,
                    text: adminNotificationContent,
                    html: `<p>${adminNotificationContent.replace(/\n/g, '<br>')}</p>`,
                });
                console.log(`Notificación de contacto enviada al administrador: ${this.adminEmail}`);

            } catch (error) {
                console.error('Error al enviar el correo de contacto:', error);
                throw error;
            }
        }

        async sendReplyToContact(
            contactName: string,
            contactEmail: string,
            replyContent: string,
            originalMessageContent: string
        ): Promise<void> {
            const subject = 'Respuesta a tu consulta de Ciclexpress';
            const emailContent = `
                Hola ${contactName},

                Hemos recibido tu mensaje:
                "${originalMessageContent}"

                Nuestra respuesta es la siguiente:
                "${replyContent}"

                Esperamos haber resuelto tu consulta. Si tienes más preguntas, no dudes en contactarnos.

                Saludos,
                Equipo de Ciclexpress
            `;

            try {
                await this.transporter.sendMail({
                    from: this.fromEmail,
                    to: contactEmail,
                    subject: subject,
                    text: emailContent,
                    html: `<p>${emailContent.replace(/\n/g, '<br>')}</p>`,
                });
                console.log(`Respuesta enviada a: ${contactEmail}`);
            } catch (error) {
                console.error('Error al enviar la respuesta al contacto:', error);
                throw error;
            }
        }

        async sendPaymentConfirmation(
            userName: string,
            userEmail: string,
            paymentDetails: {
                id: number;
                amount: number;
                currency: string;
                date: string;
                description: string;
                status: string;
            }
        ): Promise<void> {
            const subject = 'Confirmación de Pago - Ciclexpress';
            const emailContent = `
                Hola ${userName},

                Gracias por tu pago. Hemos recibido la siguiente transacción:

                ID de Transacción: ${paymentDetails.id}
                Monto: ${paymentDetails.amount} ${paymentDetails.currency}
                Fecha: ${paymentDetails.date}
                Descripción: ${paymentDetails.description}
                Estado: ${paymentDetails.status}

                Tu pago ha sido procesado exitosamente.

                Saludos,
                Equipo de Ciclexpress
            `;

            try {
                await this.transporter.sendMail({
                    from: this.fromEmail,
                    to: userEmail,
                    subject: subject,
                    text: emailContent,
                    html: `<p>${emailContent.replace(/\n/g, '<br>')}</p>`,
                });
                console.log(`Confirmación de pago enviada a: ${userEmail}`);
            } catch (error) {
                console.error('Error al enviar la confirmación de pago:', error);
                throw error;
            }
        }
    }

    export default MailerService;
    
