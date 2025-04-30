import { Request, Response } from 'express'; // Importar tipos
import ContactsModel from '../models/ContactsModel'; // Importar el modelo

class ContactsController {
    private contactsModel: ContactsModel; // Especifica tipo y privado

    constructor(contactsModel: ContactsModel) {
        this.contactsModel = contactsModel;
        // Bind sigue siendo necesario para que 'this' funcione en los manejadores de ruta
        this.add = this.add.bind(this);
        this.index = this.index.bind(this);
    }

    add(req: Request, res: Response): void { // Especifica tipos y retorno void
        // body-parser añade body a req, pero su tipo es any por defecto.
        // Puedes castearlo o definir una interfaz para req.body si es complejo
        const { name, email, comment } = req.body as { name: string, email: string, comment: string }; // Casteo simple

        // 1. Validar datos (Validación básica)
        if (!name || !email || !comment) {
            console.log("Validación fallida:", req.body);
            res.status(400).send('Faltan campos obligatorios (Nombre, Email, Comentario).');
            return; // Salir de la función
        }

        // 2. Recopilar datos adicionales
        const ipAddress: string | undefined = req.ip; // Tipo string o undefined

        const contactData = {
            name: name,
            email: email,
            comment: comment,
            ip_address: ipAddress,
        };

        // 3. Llamar al Modelo
        this.contactsModel.addContact(contactData, (err: Error | null, contactId?: number) => {
            if (err) {
                console.error('Error al guardar el contacto:', err);
                res.status(500).send('Hubo un error al guardar tu mensaje.');
                return;
            }

            // 4. Redireccionar
            console.log(`Contacto guardado exitosamente (ID: ${contactId})`);
            res.redirect('/contacto?success=true');
        });
    }

    index(req: Request, res: Response): void { // Especifica tipos
        this.contactsModel.getAllContacts((err: Error | null, contacts?: any[]) => { // Puede ser any[] o Contact[] si lo tipaste
            if (err) {
                console.error('Error al obtener contactos para admin:', err.message);
                res.status(500).send('Error al cargar la lista de contactos.');
                return;
            }

            // contacts será any[] por defecto de db.all, o el tipo que hayas definido
            res.render('admin/contacts', {
                pageTitle: 'Administración de Contactos',
                contacts: contacts // Pasar el array de contactos
            });
        });
    }
}

export default ContactsController; // Usar export default