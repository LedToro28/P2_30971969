import express, { Request, Response } from 'express';
import path from 'path';

import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3'; // No es necesario .verbose() en la importación con tipos, se usa en new

import ContactsController from './controllers/ContactsController';
import ContactsModel from './models/ContactsModel';

const app = express();
const port = 3000;

// Conexión a la base de datos
const db = new sqlite3.Database('./database.db', (err: Error | null) => {
    if (err) {
        // ... manejo de error ...
    } else { // <--- Bloque de éxito de conexión a la DB
        console.log('Conectado a la base de datos SQLite.');

        // *** 1. INSTANCIAR EL MODELO Y EL CONTROLADOR ***
        // (Estos objetos necesitan 'db' y 'contactsModel' respectivamente, que están disponibles aquí)
        const contactsModel = new ContactsModel(db); // contactsModel es la INSTANCIA del modelo
        const contactsController = new ContactsController(contactsModel); // contactsController es la INSTANCIA del controlador

        app.set('views', path.join(__dirname, '../views')); // <--- Supuesta línea correcta

        // **** AÑADE ESTA LÍNEA JUSTO DESPUÉS ****
        console.log('EJS Views Directory configured as:', app.get('views'));
        
        // ... otras rutas que no usan la DB (pueden ir aquí o fuera, es opcional) ...
        app.get('/contacto', (req, res) => { res.render('contacto', { pageTitle: 'Contacto Ciclexpress' }); });
         app.get('/payment', (req, res) => { res.render('payment', { pageTitle: 'Procesar Pago' }); });
         app.post('/payment/add', (req, res) => { /* ... lógica de pago simulado ... */ });


        // *** 2. DEFINIR LAS RUTAS QUE USAN LA INSTANCIA DEL CONTROLADOR ***
        // Aquí debes usar la VARIABLE 'contactsController', NO el nombre de la clase 'ContactsController'
        app.post('/contact/add', contactsController.add); // <-- Correcto
        app.get('/admin/contacts', contactsController.index); // <-- Correcto

    } // <--- Cierre del bloque 'else'
}); // <--- Cierre del callback de new sqlite3.Database

app.use(express.static(path.join(__dirname, '../public')));

app.use(bodyParser.urlencoded({ extended: true })); // Para formularios HTML estándar
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));


app.get('/', (req, res) => {res.render('index', {});});

app.get('/servicios', (req, res) => {res.render('servis', {});});

app.get('/contacto', (req, res) => {res.render('contac', {});});   

app.get('/info', (req, res) => {res.render('info', {});});

app.get('/payment', (req: Request, res: Response) => { res.render('payment', {}); });

app.post('/payment/add', (req: Request, res: Response) => {
    const body = req.body; // body ya tendrá el tipo any por defecto, podrías crear un tipo específico
    console.log("Datos de pago recibidos:", body);
    res.send('<h1>Pago realizado</h1><p>...</p>');
});


app.listen(port, () => {
    console.log(`Servidor corriendo en ${port}`);
});