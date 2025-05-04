// src/controllers/ContactsController.ts

import { Request, Response, RequestHandler } from 'express';
import ContactsModel, { ContactData, Contact } from '../models/ContactsModel';
// Si necesitas los tipos, impórtalos
// import { Error } from 'sqlite3';
// import { FlashTypes } from 'connect-flash'; // Puedes importar FlashTypes si quieres tipar req.flash más estrictamente

class ContactsController { // Asegúrate del nombre y capitalización de la clase
    private contactsModel: ContactsModel;

    constructor(contactsModel: ContactsModel) {
        this.contactsModel = contactsModel;
        // Vincula los métodos para asegurar que 'this' funcione correctamente
        this.add = this.add.bind(this);
        this.index = this.index.bind(this);
        // **** VINCULAR EL NUEVO MÉTODO GET ****
        this.showContactForm = this.showContactForm.bind(this); // << Nueva línea
    }

    // **** NUEVO MÉTODO: Manejar la solicitud GET para mostrar el formulario de contacto ****
    // Este método se ejecutará cuando el usuario navegue a /contacto O después de una redirección POST -> GET
    showContactForm(req: Request, res: Response): void {
        // req.flash('clave') devuelve un array de mensajes con esa clave.
        // connect-flash los elimina automáticamente de la sesión después de leerlos aquí.
        const successMessages = req.flash('success'); // Lee mensajes con la clave 'success'
        const errorMessages = req.flash('error');   // Lee mensajes con la clave 'error'

        // Renderiza la vista 'contacto.ejs'
        // Pasamos pageTitle y los mensajes leídos (si existen)
        res.render('contacto', {
            pageTitle: 'Contacto Ciclexpress',
            // Pasamos el primer mensaje de cada tipo (generalmente solo habrá uno por flash)
            successMessage: successMessages.length > 0 ? successMessages[0] : null, // Pasa el 1er mensaje de éxito o null
            errorMessage: errorMessages.length > 0 ? errorMessages[0] : null     // Pasa el 1er mensaje de error o null
        });
    }
    // **************************************************************************************


    // Método para manejar la solicitud POST del formulario de contacto
    add(req: Request, res: Response): void {
        const { name, email, comment } = req.body;
        const ipAddress = req.ip;

        // Validación básica
        if (!name || !email || !comment) {
             // **** GUARDAR MENSAJE FLASH DE ERROR DE VALIDACIÓN ****
             req.flash('error', 'Error: Faltan campos obligatorios.');
             // ******************************************************
             // **** REDIRIGIR DE VUELTA A LA PÁGINA GET /contacto ****
             res.redirect('/contacto'); // Redirige al navegador a la ruta GET /contacto
             return; // Termina la ejecución del handler POST
        }

        const contactData: ContactData = {
            name: name,
            email: email,
            comment: comment,
            ip_address: ipAddress
        };

        this.contactsModel.addContact(contactData, (err: Error | null, contactId?: number) => {
            if (err) {
                console.error('Error al insertar contacto:', err.message);
                // **** GUARDAR MENSAJE FLASH DE ERROR DE BASE DE DATOS ****
                req.flash('error', 'Hubo un error al guardar tu mensaje. Intenta de nuevo.');
                // ********************************************************
            } else {
                console.log(`Contacto guardado con ID: ${contactId}, IP: ${ipAddress}`);
                // **** GUARDAR MENSAJE FLASH DE ÉXITO ****
                req.flash('success', '¡Tu mensaje ha sido enviado con éxito!');
                // **************************************
            }
            // **** SIEMPRE REDIRIGIR DE VUELTA A LA PÁGINA GET /contacto después de la operación de DB ****
            // Esto completa el patrón Post/Redirect/Get
            res.redirect('/contacto');
            // ****************************************************************************************
            // No necesitas return aquí
        });
        // No hay código aquí después de la llamada al modelo, el callback se encargará de la redirección.
    }

    // Método para mostrar la lista de contactos (admin/contacts)
    index(req: Request, res: Response): void {
         this.contactsModel.getAllContacts((err: Error | null, contacts?: Contact[]) => {
             if (err) {
                 console.error('Error al obtener contactos:', err.message);
                 res.status(500).render('error', { pageTitle: 'Error', message: 'Error al cargar los contactos.' });
             } else {
                 res.render('admin/contacts', { pageTitle: 'Administración de Contactos', contacts: contacts });
             }
         });
    }
}

// Exporta la clase con el nombre y capitalización correctos
export default ContactsController; // Asegúrate que coincide con el nombre de la clase arriba