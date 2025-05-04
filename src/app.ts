// src/app.ts

import express, { Request, Response, Application } from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import session from 'express-session'; // << Importa express-session
import flash from 'connect-flash';     // << Importa connect-flash

import ContactsController from './controllers/ContactsController';
import ContactsModel from './models/ContactsModel';

const app: Application = express();
app.set('trust proxy', true);
const port = 3000;

// Middleware que NO dependen de la conexión a la DB
app.use(express.static(path.join(__dirname, '../public')));
app.use('/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, '../node_modules/bootstrap-icons/font')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// **** CONFIGURACIÓN DE SESIÓN Y MENSAJES FLASH ****
// Configura express-session. Necesitas una 'secret' para firmar las cookies de sesión.
// ¡USA UNA CADENA LARGA, COMPLEJA Y ALEATORIA EN PRODUCCIÓN! CAMBIA LA SIGUIENTE LÍNEA.
app.use(session({
    secret: process.env.SESSION_SECRET || 'tu-cadena-secreta-cambiala-en-produccion-12345abc', // Usa una variable de entorno en producción
    resave: false, // No guardar la sesión si no ha cambiado
    saveUninitialized: true // Guardar una nueva sesión aunque no tenga datos
}));
// Configura connect-flash. DEBE ir DESPUÉS de express-session.
app.use(flash());
// ****************************************************


const db = new sqlite3.Database('./database.db', (err: Error | null) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
        // Considera terminar el proceso aquí si la DB es crítica: process.exit(1);
    } else {
        console.log('Conectado a la base de datos SQLite.');

        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, '../views'));
        console.log('EJS Views Directory configured as:', app.get('views'));

        const contactsModel = new ContactsModel(db);
        const contactsController = new ContactsController(contactsModel);

        // **** RUTAS ****

        // Rutas generales que renderizan vistas (GET)
        app.get('/', (req: Request, res: Response) => { res.render('index', { pageTitle: 'Inicio Ciclexpress' }); });
        app.get('/servicios', (req: Request, res: Response) => { res.render('servicios', { pageTitle: 'Servicios Ciclexpress' }); });
        app.get('/informacion', (req: Request, res: Response) => { res.render('informacion', { pageTitle: 'Sobre Ciclexpress' }); });

        // *** Usa el nuevo método del controlador para la ruta GET /contacto ***
        // Este método leerá los mensajes flash y renderizará la vista
        app.get('/contacto', contactsController.showContactForm); // << Cambia esta línea

        // Rutas que usan métodos del controlador (POST o GET de acciones)
        // Estos métodos ya están vinculados (.bind) en el constructor del controlador
        app.post('/contact/add', contactsController.add); // Usa el método 'add' (ahora guardará flash y redirigirá)
        app.get('/admin/contacts', contactsController.index); // Usa el método 'index'

        // Rutas de pago (simuladas)
        app.get('/payment', (req: Request, res: Response) => { res.render('payment', { pageTitle: 'Procesar Pago' }); });
        app.post('/payment/add', (req: Request, res: Response) => {
            console.log("Datos de pago recibidos:", req.body);
            res.send('<h1>Pago simulado realizado!</h1><p>Los datos fueron recibidos (simulados).</p>');
        });

        app.listen(port, () => {
            console.log(`Servidor corriendo en http://localhost:${port}`);
        });
    }
});