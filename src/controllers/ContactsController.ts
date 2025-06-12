import { Request, Response } from 'express';
import ContactsModel, { DetailedMessage } from '../models/ContactsModel';
import MailerService from '../service/MailerService';
import RecaptchaService from '../service/RecaptchaService';

class ContactsController {
    private contactsModel: ContactsModel;
    private mailerService: MailerService;
    private recaptchaService: RecaptchaService;

    constructor(
        contactsModel: ContactsModel,
        mailerService: MailerService,
        recaptchaService: RecaptchaService
    ) {
        this.contactsModel = contactsModel;
        this.mailerService = mailerService;
        this.recaptchaService = recaptchaService;
        this.add = this.add.bind(this);
        this.showContactForm = this.showContactForm.bind(this);
        this.index = this.index.bind(this);
        this.sendReply = this.sendReply.bind(this);

        this.getMessagesByStatus = this.getMessagesByStatus.bind(this);
        this.getMessageById = this.getMessageById.bind(this);
    }

    showContactForm(req: Request, res: Response): void {
        res.render('contact', {
            pageTitle: 'Contacto'
        });
    }

    async add(req: Request, res: Response): Promise<void> {
        const { name, email, message } = req.body;
        const clientIp = req.ip || 'Desconocida';
        const country = 'Desconocido';

        const recaptchaToken = req.body['g-recaptcha-response'];
        const recaptchaOk = await this.recaptchaService.verifyRecaptcha(recaptchaToken, clientIp);

        if (!recaptchaOk) {
            req.flash('error', 'Debes completar el reCAPTCHA para enviar el formulario.');
            return res.redirect('/contacto');
        }

        try {
            let contact = await this.contactsModel.findContactByEmail(email);
            let contactId: number;

            if (contact) {
                contactId = contact.id as number; 
            } else {
                contactId = await this.contactsModel.addContact(name, email, country, clientIp);
                contact = await this.contactsModel.findContactById(contactId);
            }

            if (!contact) {
                throw new Error('No se pudo obtener la información del contacto después de añadir/encontrar.');
            }

            await this.contactsModel.addMessage(contact.id as number, message);

            await this.mailerService.sendContactConfirmation(
                name,
                email,
                message,
                country,
                clientIp,
                true,
                contact.id,
                contact.created_at
            );

            req.flash('success', contactId
                ? '¡Mensaje recibido! Ya tenías un contacto registrado, tu mensaje fue guardado.'
                : '¡Gracias por tu mensaje! Te hemos registrado como nuevo contacto.');

            res.redirect('/contacto');
        } catch (err) {
            console.error('Error al procesar el contacto:', err);
            req.flash('error', 'Hubo un error interno al enviar tu mensaje. Por favor, intenta de nuevo más tarde.');
            res.redirect('/contacto');
        }
    }

    async index(req: Request, res: Response): Promise<void> {
        try {
            const allContacts = await this.contactsModel.getAllContacts();
            res.render('admin/contacts', {
                pageTitle: 'Todos los Contactos',
                contacts: allContacts
            });
        } catch (err) {
            console.error('Error al obtener todos los contactos:', err);
            req.flash('error', 'Hubo un error al obtener los contactos. Por favor, intenta de nuevo más tarde.');
            res.redirect('/admin');
        }
    }

    async getMessagesByStatus(req: Request, res: Response): Promise<void> {
        const { status } = req.params;

        type MessageStatus = 'new' | 'read' | 'replied' | 'Pending' | 'Respondido';
        const validStatuses: MessageStatus[] = ['new', 'read', 'replied', 'Pending', 'Respondido'];

        if (!validStatuses.includes(status as MessageStatus)) {
            req.flash('error', `Estado de mensaje inválido: ${status}.`);
            return res.redirect('/admin/contacts');
        }

        try {
            const messages = await this.contactsModel.getMessagesByStatus(status as MessageStatus);
            res.render('admin/messages', {
                pageTitle: `Mensajes ${status}`,
                messages
            });
        } catch (err) {
            console.error('Error al obtener mensajes por estado:', err);
            req.flash('error', 'Hubo un error al obtener los mensajes. Por favor, intenta de nuevo más tarde.');
            res.redirect('/admin');
        }
    }

    async getMessageById(req: Request, res: Response): Promise<void> {
        const { messageId } = req.params;

        try {
            const message = await this.contactsModel.getMessageById(Number(messageId));
            if (!message) {
                req.flash('error', 'Mensaje no encontrado.');
                return res.redirect('/admin/contacts');
            }
            res.render('admin/messageDetail', {
                pageTitle: 'Detalle del Mensaje',
                message
            });
        } catch (err) {
            console.error('Error al obtener detalle del mensaje:', err);
            req.flash('error', 'Hubo un error al obtener el mensaje. Por favor, intenta de nuevo más tarde.');
            res.redirect('/admin');
        }
    }

    async sendReply(req: Request, res: Response): Promise<void> {
        const { messageId } = req.params;
        const { replyContent } = req.body;

        const adminName = (req.user as Express.User)?.username || (req.user as Express.User)?.display_name || 'Administrador Desconocido';

        try {
            if (!messageId || isNaN(Number(messageId))) {
                req.flash('error', 'ID de mensaje inválido.');
                return res.redirect('/admin/contacts');
            }

            const originalMessage = (await this.contactsModel.getMessageById(Number(messageId))) as DetailedMessage | null;

            if (!originalMessage) {
                req.flash('error', 'Mensaje original no encontrado para enviar respuesta.');
                return res.redirect('/admin/contacts');
            }
            
            if (originalMessage.contact_email && originalMessage.contact_name) {
                await this.mailerService.sendReplyToContact(
                    originalMessage.contact_name,
                    originalMessage.contact_email,
                    replyContent ?? '',
                    originalMessage.message_content
                );
                req.flash('success', 'Respuesta enviada correctamente. Correo enviado al usuario.');
            } else {
                 req.flash('replyWarning', 'Respuesta guardada, pero no se pudo enviar el correo al usuario (email o nombre de contacto no disponible).');
            }

            await this.contactsModel.updateMessageReplyStatus(
                Number(messageId),
                replyContent ?? '',
                adminName
            );

            res.redirect(`/admin/contacts`);
        } catch (err) {
            console.error('Error al enviar la respuesta:', err);
            req.flash('error', 'Hubo un error al enviar la respuesta. Por favor, intenta de nuevo más tarde.');
            res.redirect(`/admin/contacts`);
        }
    }
}

export default ContactsController;
