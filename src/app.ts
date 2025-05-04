import express, { Request, Response } from 'express';
import path from 'path';

import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3'; // No es necesario .verbose() en la importación con tipos, se usa en new

import ContactsController from './controllers/ContactsController';
import ContactsModel from './models/ContactsModel';

const app = express();
const port = 3000;

// Middleware que NO dependen de la conexión a la DB (van fuera del callback)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, '../node_modules/bootstrap-icons/font')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('view engine', 'ejs'); // <-- SOLO AQUÍ
app.set('views', path.join(__dirname, '../views')); // <-- SOLO AQUÍ

// Esto te seguirá mostrando la ruta que EJS está usando ahora
console.log('EJS Views Directory configured as:', app.get('views'));

// --- Conexión a la base de datos ---
const db = new sqlite3.Database('./database.db', (err: Error | null) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
        // ** Maneja este error adecuadamente (ej: no inicies el servidor, muestra un mensaje de error fatal) **
    } else { // <--- CONEXIÓN A LA BASE DE DATOS EXITOSA
        console.log('Conectado a la base de datos SQLite.');

        // --- 1. Configurar Vistas EJS (AHORA que la DB está conectada) ---


        // --- 2. Instanciar Modelos y Controladores (AHORA que la DB está disponible) ---
        const contactsModel = new ContactsModel(db);
        const contactsController = new ContactsController(contactsModel);

        // --- 3. Definir TODAS las Rutas (AHORA que EJS está configurado y Modelos/Controladores están listos) ---
        // Pon TODAS tus rutas app.get/app.post/app.use aquí dentro

        // Rutas principales (pueden ir aquí o fuera, pero dentro es más limpio si TODO depende de la DB)
        // Es mejor pasar el pageTitle desde el controlador
        app.get('/', (req, res) => { res.render('index', { pageTitle: 'Inicio Ciclexpress' }); });
        app.get('/servicios', (req, res) => { res.render('servicios', { pageTitle: 'Servicios Ciclexpress' }); }); // Verifica nombre de vista ('servis' vs 'servicios')
        app.get('/contacto', (req, res) => { res.render('contacto', { pageTitle: 'Contacto Ciclexpress' }); }); // Verifica nombre de vista ('contac' vs 'contacto')
        app.get('/informacion', (req, res) => { res.render('informacion', { pageTitle: 'Sobre Ciclexpress' }); }); // Verifica nombre de vista ('info' vs 'informacion')

        // Rutas de contacto (dependen del controlador/modelo)
        app.post('/contact/add', contactsController.add);
        app.get('/admin/contacts', contactsController.index);

        // Rutas de pago (incluso si no usan la DB *aún*, mantenerlas aquí es consistente)
        app.get('/payment', (req: Request, res: Response) => { res.render('payment', { pageTitle: 'Procesar Pago' }); }); // Pasa pageTitle
        app.post('/payment/add', (req: Request, res: Response) => {
            console.log("Datos de pago recibidos:", req.body);
            res.send('<h1>Pago realizado</h1><p>...</p>');
        });
        

        // --- 4. Iniciar el Servidor (SOLO si la conexión a la DB fue exitosa) ---
        app.listen(port, () => {
          console.log(`Servidor corriendo en ${port}`);
        });

    } // <--- Fin del bloque 'else' del callback de la DB
}); // <--- Fin del callback de la conexión a la DB





