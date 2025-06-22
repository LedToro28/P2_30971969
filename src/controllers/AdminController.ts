// src/controllers/AdminController.ts

import { Request, Response } from 'express';
import ContactsModel from '../models/ContactsModel';
import MailerService from '../service/MailerService';
import PaymentModel from '../models/PaymentModel';

class AdminController {

  constructor(
    private contactsModel: ContactsModel,
    private mailerService: MailerService,
    private paymentModel: PaymentModel
  ) {
    this.showPaymentsList    = this.showPaymentsList.bind(this);
    this.showAdminDashboard  = this.showAdminDashboard.bind(this);
    this.showContactList     = this.showContactList.bind(this);
    this.showPendingReplies  = this.showPendingReplies.bind(this);
    this.showRepliedMessages = this.showRepliedMessages.bind(this);
    this.sendReply           = this.sendReply.bind(this);
    // (¡elimina showPaymentList si no lo vas a usar!)
  }
  async showPaymentsList(req: Request, res: Response): Promise<void> {
    try {
      const payments = await this.paymentModel.getAllPayments();
      console.log('pagos:', payments);
      return res.render('payments', {
        pageTitle: 'Pagos y Ventas',
        payments
      });
    } catch (error) {
      console.error('Error al cargar los pagos:', error);
      return res.render('payments', {
        pageTitle: 'Pagos y Ventas',
        payments: []
      });
    }
  }

    // Renderiza el panel de administración con todos los datos necesarios
    async showAdminDashboard(req: Request, res: Response): Promise<void> {
        try {
            const allContacts = await this.contactsModel.getAllContacts();
            const pendingContacts = await this.contactsModel.getMessagesByStatus('Pending');
            const payments = await this.paymentModel.getAllPayments();

            res.render('administracion', {
                pageTitle: 'Panel de Administración',
                allContacts,
                pendingContacts,
                payments
            });
        } catch (error) {
            req.flash('error', 'Error al cargar los datos del panel de administración.');
            res.render('administracion', {
                pageTitle: 'Panel de Administración',
                allContacts: [],
                pendingContacts: [],
                payments: []
            });
        }
    }

    // Redirige a la vista principal del panel
    showContactList(req: Request, res: Response): void {
        res.redirect('/admin');
    }

    showPendingReplies(req: Request, res: Response): void {
        res.redirect('/admin');
    }

    showPaymentList(req: Request, res: Response): void {
        res.redirect('/admin');
    }

    showRepliedMessages(req: Request, res: Response): void {
        res.redirect('/admin');
    }

    // Envía una respuesta a un mensaje pendiente
    async sendReply(req: Request, res: Response): Promise<void> {
        const messageId = parseInt(req.params.messageId);
        const { replySubject, replyContent } = req.body;

        if (isNaN(messageId)) {
            req.flash('replyError', 'ID de mensaje inválido para enviar respuesta.');
            return res.redirect('/admin');
        }
        if (!replyContent || replyContent.trim() === '') {
            req.flash('replyError', 'El mensaje de respuesta no puede estar vacío.');
            return res.redirect('/admin');
        }

        try {
            const message = await this.contactsModel.getMessageById(messageId);

            if (!message) {
                req.flash('replyError', `Mensaje con ID ${messageId} no encontrado para enviar respuesta.`);
                return res.redirect('/admin');
            }
            if (message.status !== 'Pending') {
                req.flash('replyWarning', `El mensaje de ${message.name} (ID: ${messageId}) ya ha sido respondido.`);
                return res.redirect('/admin');
            }

            const adminName = 'Admin';
            await this.mailerService.sendContactReply(
                message.email,
                message.message,
                replyContent,
                adminName,
                true
            );

            await this.contactsModel.updateMessageReplyStatus(messageId, replyContent, adminName);

            req.flash('replySuccess', `Respuesta enviada exitosamente a ${message.name}.`);
            res.redirect('/admin');
        } catch (error) {
            req.flash('replyError', `Error al enviar la respuesta para el mensaje con ID ${messageId}.`);
            res.redirect('/admin');
        }
    }
}

export default AdminController;