import 'dotenv/config'; // ¡Esto debe ser la primera línea! Para cargar las variables de entorno
import express, { Request, Response, Application } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import path from 'path';
import session from 'express-session';
import flash from 'connect-flash';
import passport from 'passport';
import configurePassport from './config/passport'; // Se importará y configurará después de initTables
import sqlite3 from 'sqlite3';

import { db, initTables } from './db';
import MailerService from './service/MailerService';
import RecaptchaService from './service/RecaptchaService';

// Importa los modelos y controladores, pero instancialos DESPUÉS de initTables
import ContactsModel from './models/ContactsModel';
import PaymentsModel from './models/PaymentModel';
import AuthController, { ensureAuthenticated, ensureAdmin } from './controllers/AuthController';
import ContactsController from './controllers/ContactsController';
import PaymentsController from './controllers/PaymentController';
import UserModel from './models/UserModel'; // Asegúrate de importar UserModel

const app: Application = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'supersecreta_default_key_segura_y_larga_DEV';

// NOTA IMPORTANTE: La configuración de Passport y sus middlewares, así como la
// inicialización de controladores que dependen de la DB, se han movido DENTRO de startApp()
// para asegurar que las tablas ya estén inicializadas.

// Configura EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Sirve archivos estáticos (esto puede ir antes de initTables)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, '../node_modules/bootstrap-icons/font')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de Express-Session (esto puede ir antes de initTables)
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 15
    }
}));

// Middleware para mensajes flash y variables globales accesibles en las vistas (puede ir antes)
app.use(flash());

app.use((req, res, next) => {
    res.locals.successMessage = req.flash('success');
    res.locals.errorMessage = req.flash('error');
    res.locals.paymentSuccess = req.flash('paymentSuccess');
    res.locals.paymentError = req.flash('paymentError');
    res.locals.replySuccess = req.flash('replySuccess');
    res.locals.replyError = req.flash('replyError');
    res.locals.replyWarning = req.flash('replyWarning');
    res.locals.unsentReplyMessage = req.flash('unsentReplyMessage');

    res.locals.currentUser = req.user;
    res.locals.googleAnalyticsId = process.env.GOOGLE_ANALYTICS_ID;
    res.locals.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY;

    res.locals.ogType = 'website';
    res.locals.ogImage = 'https://ciclexpress.onrender.com/img/ciclexpress_logo_social.jpg';
    res.locals.ogUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    res.locals.pageTitle = 'Ciclexpress';
    res.locals.pageDescription = 'Tu servicio web integral de jardinería.';

    next();
});

app.set('trust proxy', 1);

// --- Inicio de la aplicación y configuración tardía ---
async function startApp() {
    try {
        await initTables(); // Espera a que las tablas se creen o verifiquen
        console.log('Tablas de base de datos inicializadas.');

        // --- Mover la inicialización de Modelos y Passport aquí ---
        const userModel = new UserModel(db); // Inicializa UserModel después de que la DB esté lista
        const mailerService = new MailerService();
        const recaptchaService = new RecaptchaService();

        // Configura Passport AHORA, pasándole el userModel si es necesario (ver config/passport.ts)
        configurePassport(userModel); // Pasa userModel a configurePassport
        app.use(passport.initialize());
        app.use(passport.session());

        // Inicialización de Controladores (que dependen de los Modelos y Passport)
        const authController = new AuthController(userModel);
        const contactsModel = new ContactsModel(db);
        const paymentsModel = new PaymentsModel(db);
        const contactController = new ContactsController(contactsModel, mailerService, recaptchaService);
        const paymentsController = new PaymentsController(mailerService, paymentsModel);


        // --- Rutas de Autenticación (ahora usan controladores inicializados) ---
        app.get('/login', authController.showLoginForm);
        app.post('/login', authController.loginLocal);
        app.get('/logout', authController.logout);

        app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
        app.get('/auth/google/callback',
            passport.authenticate('google', { failureRedirect: '/login', failureFlash: true }),
            (req, res) => {
                req.flash('success', '¡Has iniciado sesión correctamente!');
                res.redirect('/admin/contacts');
            }
        );

        // Ruta de registro (solo para administradores)
        app.get('/register', ensureAdmin, authController.showRegisterForm);
        app.post('/register', ensureAdmin, authController.registerUser);

        // --- Rutas Públicas ---
        app.get('/', (req: Request, res: Response) => {
            res.render('index', {}); // Variables globales ya están en res.locals
        });

        app.get('/servicios', (req: Request, res: Response) => {
            res.render('servicios', {});
        });

        app.get('/informacion', (req: Request, res: Response) => {
            res.render('informacion', {});
        });

        app.get('/contacto', (req: Request, res: Response) => {
            res.render('contact', {});
        });
        app.post('/contacto', contactController.add);

        app.get('/payment', paymentsController.showPaymentForm);
        app.post('/payment', paymentsController.add);

        // --- Rutas Protegidas ---
        app.get('/admin', ensureAuthenticated, contactController.index);
        app.get('/admin/contacts', ensureAuthenticated, contactController.index);
        app.get('/admin/payments', ensureAuthenticated, paymentsController.index);
        app.post('/admin/replies/send/:messageId', ensureAuthenticated, contactController.sendReply);

        // Página 404 (manejo de rutas no encontradas)
        app.use((req, res) => {
            res.status(404).render('404', {});
        });

        const server = app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });

        // Manejo de cierre de la aplicación
        process.on('SIGINT', () => {
            console.log('Recibida señal SIGINT. Cerrando...');
            server.close(() => {
                console.log('Servidor HTTP cerrado.');
                db.close((err: Error | null) => {
                    if (err) {
                        console.error('Error cerrando la base de datos:', err.message);
                    }
                    console.log('Conexión a la base de datos cerrada.');
                    process.exit(0);
                });
            });
        });

    } catch (err) {
        console.error('Error crítico durante la inicialización de la aplicación:', err);
        process.exit(1);
    }
}

startApp(); // Llama a la función principal para iniciar la aplicación
