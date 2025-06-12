import { Request, Response, NextFunction } from 'express';
import ContactsModel, { DetailedMessage } from '../models/ContactsModel';
import MailerService from '../service/MailerService';

class AdminController { 
    private contactsModel: ContactsModel;
    private mailerService: MailerService;

    constructor(
        contactsModel: ContactsModel,
        mailerService: MailerService,
    ) {
        this.contactsModel = contactsModel;
        this.mailerService = mailerService;
        this.index = this.index.bind(this);
        this.sendReply = this.sendReply.bind(this);
        this.getMessagesByStatus = this.getMessagesByStatus.bind(this);
        this.getMessageById = this.getMessageById.bind(this);
    }

    async index(req: Request, res: Response): Promise<void> {
        try {
            const allContacts = await this.contactsModel.getAllContacts();
            res.render('admin/contacts', {
                pageTitle: 'Todos los Contactos (Admin)',
                contacts: allContacts
            });
        } catch (err) {
            console.error('Error al obtener todos los contactos (Admin):', err);
            req.flash('error', 'Hubo un error al obtener los contactos de administración.');
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
            console.error('Error al obtener mensajes por estado (Admin):', err);
            req.flash('error', 'Hubo un error al obtener los mensajes.');
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
            console.error('Error al obtener detalle del mensaje (Admin):', err);
            req.flash('error', 'Hubo un error al obtener el mensaje.');
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

            const originalMessage = await this.contactsModel.getMessageById(Number(messageId));

            if (!originalMessage) {
                req.flash('error', 'Mensaje original no encontrado para enviar respuesta.');
                return res.redirect('/admin/contacts');
            }

            if (originalMessage.status === 'replied' || originalMessage.status === 'Respondido') {
                req.flash('replyWarning', `El mensaje de ${originalMessage.contact_name} (ID: ${messageId}) ya ha sido respondido.`);
                return res.redirect(`/admin/message/${messageId}`);
            }

            if (originalMessage.contact_email && originalMessage.contact_name) {
                await this.mailerService.sendReplyToContact(
                    originalMessage.contact_name, 
                    originalMessage.contact_email, 
                    replyContent ?? '',
                    originalMessage.message_content 
                );
                req.flash('success', `Respuesta enviada exitosamente a ${originalMessage.contact_name}. Correo enviado al usuario.`); // CORREGIDO: usar contact_name
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
            console.error('Error al enviar la respuesta (Admin):', err);
            req.flash('error', 'Hubo un error al enviar la respuesta. Por favor, intenta de nuevo más tarde.');
            res.redirect(`/admin/contacts`);
        }
    }
}

export default AdminController;