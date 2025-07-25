import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, Application } from 'express'; 
import path from 'path';
import session from 'express-session';
import flash from 'connect-flash';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import UsersModel from './models/UsersModel';
import { db, initTables } from './db';

import ContactsModel from './models/ContactsModel';
import PaymentModel from './models/PaymentModel';
import MailerService from './service/MailerService';
import AuthController from './controllers/AuthController';
import AdminController from './controllers/AdminController';
import PaymentController from './controllers/PaymentController';
import ContactController from './controllers/ContactsController';
import RecaptchaService from './service/RecaptchaService';

const app: Application = express(); 
const usersModel = new UsersModel(db);
const authCtrl   = new AuthController(usersModel);
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SESSION_SECRET || 'supersecreta_default_key';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(express.static(path.join(__dirname, '../public')));
app.use('/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, '../node_modules/bootstrap-icons/font')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('trust proxy', true);

app.use(session({
  secret: SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  rolling: true,              
  cookie: {
    httpOnly: true,                                  
    sameSite: 'lax',                                 
    secure: process.env.NODE_ENV === 'production',   
    maxAge: 15 * 60 * 1000                           
  }
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user: any, done) {
  done(null, user.id);
});
passport.deserializeUser(async function(id: number, done) {
  try {
    const u = await usersModel.findById(id);
    done(null, u);
  } catch (err) {
    done(err);
  }
});

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL:  '/auth/google/callback'
}, async (_t, _ts, profile, done) => {
  const email = profile.emails?.[0].value!;
  let user = await usersModel.findByUsername(email);
  if (!user) {
    const id = await usersModel.createUser(email, Math.random().toString(36));
    user = await usersModel.findById(id) as any;
  }
  done(null, user || false);
}));

app.use((req, res, next) => {
    res.locals.successMessage = req.flash('success');
    res.locals.errorMessage = req.flash('error');
    res.locals.paymentSuccess = req.flash('paymentSuccess');
    res.locals.paymentError = req.flash('paymentError');
    res.locals.replySuccess = req.flash('replySuccess');
    res.locals.replyError = req.flash('replyError');
    res.locals.replyWarning = req.flash('replyWarning');
    res.locals.unsentReplyMessage = req.flash('unsentReplyMessage');
    res.locals.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY;
    next();
});
app.use((req, res, next) => {
  res.locals.errorMessage   = req.flash('error');
  res.locals.successMessage = req.flash('success');
  next();
});

function isAuthenticated(req: Request, res: Response, next: any) {
  return req.isAuthenticated() ? next() : authCtrl.showLogin(req, res);
}

const paymentModel = new PaymentModel(db);
const mailerService = new MailerService();
const recaptchaService = new RecaptchaService();

const contactsModel = new ContactsModel(db);
const contactController = new ContactController(contactsModel, mailerService);
const adminController = new AdminController(contactsModel, mailerService, paymentModel);
const paymentController = new PaymentController(mailerService, paymentModel);

async function startApp() {
    try {
        await initTables(); 
        console.log('Tablas de base de datos inicializadas.');

        const server = app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });

        process.on('SIGINT', () => {
            console.log('Recibida señal SIGINT. Cerrando...');
            server.close(() => { 
                console.log('Servidor HTTP cerrado.');
                db.close((err) => { 
                    if (err) {
                        console.error('Error cerrando la base de datos:', err.message);
                    }
                    console.log('Conexión a la base de datos cerrada.');
                    process.exit(0);
                });
            });
        });

    } catch (err) {
        console.error('Error critico durante la inicialización de la aplicación:', err);
        process.exit(1);
    }
}

startApp();

app.get('/', (req: Request, res: Response) => { res.render('index', { pageTitle: 'Inicio Ciclexpress' }); });
app.get('/servicios', (req: Request, res: Response) => { res.render('servicios', { pageTitle: 'Servicios Ciclexpress' }); });
app.get('/informacion', (req: Request, res: Response) => { res.render('informacion', { pageTitle: 'Sobre Ciclexpress' }); });

app.get('/contacto', contactController.showContactForm);
app.post('/contacto', contactController.add);

app.get('/payment', paymentController.showPaymentForm);
app.post('/payment/add', paymentController.add);

app.get('/admin', isAuthenticated, adminController.showAdminDashboard);
app.get('/admin/contacts', (req, res) => res.redirect('/admin'));
app.get('/admin/register', isAuthenticated, authCtrl.showRegister);
app.post('/admin/register', isAuthenticated, authCtrl.register);
app.get('/admin/payments', isAuthenticated, adminController.showPaymentsList);

app.post('/login',  authCtrl.login);
app.get('/logout',  authCtrl.logout);

app.get('/auth/google',           authCtrl.googleAuth);
app.get('/auth/google/callback',  authCtrl.googleCallback);

app.use((req, res) => {
    res.status(404).render('404', { pageTitle: 'Página no encontrada' });
});
