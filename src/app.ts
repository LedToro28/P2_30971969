import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, Application, NextFunction } from 'express'; 
import path from 'path';
import session from 'express-session';
import flash from 'connect-flash';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Database } from 'sqlite3';
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

// Extender tipo de usuario para Passport
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password_hash?: string;
      google_id?: string;
    }
  }
}

const app: Application = express(); 
const usersModel = new UsersModel(db);
const authCtrl = new AuthController(usersModel);
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SESSION_SECRET || 'supersecreta_default_key';

// Configuración de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middlewares estáticos
app.use(express.static(path.join(__dirname, '../public')));
app.use('/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, '../node_modules/bootstrap-icons/font')));

// Middlewares de parseo
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('trust proxy', true);

// Configuración de sesión
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

// Flash messages y Passport
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Serialización de usuario
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await usersModel.findById(id);
    done(null, user || null);
  } catch (err) {
    done(err);
  }
});

// Estrategia de Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/auth/google/callback',
  passReqToCallback: true
}, async (req, _accessToken, _refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email found in Google profile'));
    }

    const user = await usersModel.findOrCreateGoogleUser(profile);
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Middleware de variables locales
app.use((req, res, next) => {
  res.locals.user = req.user;
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

// Middleware de autenticación mejorado
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Por favor inicia sesión para acceder');
  return res.redirect('/login');
}

// Inicialización de servicios
const paymentModel = new PaymentModel(db);
const mailerService = new MailerService();
const recaptchaService = new RecaptchaService();
const contactsModel = new ContactsModel(db);

const contactController = new ContactController(contactsModel, mailerService);
const adminController = new AdminController(contactsModel, mailerService, paymentModel);
const paymentController = new PaymentController(mailerService, paymentModel);

// Rutas públicas
app.get('/', (req: Request, res: Response) => {
  res.render('index', { pageTitle: 'Inicio Ciclexpress' });
});

app.get('/servicios', (req: Request, res: Response) => {
  res.render('servicios', { pageTitle: 'Servicios Ciclexpress' });
});

app.get('/informacion', (req: Request, res: Response) => {
  res.render('informacion', { pageTitle: 'Sobre Ciclexpress' });
});

app.get('/contacto', contactController.showContactForm);
app.post('/contacto', contactController.add);

app.get('/payment', paymentController.showPaymentForm);
app.post('/payment/add', paymentController.add);

// Rutas de autenticación
app.get('/login', authCtrl.showLogin);
app.post('/login', authCtrl.login);
app.get('/logout', authCtrl.logout);

// Rutas de Google OAuth
app.get('/auth/google', authCtrl.googleAuth);
app.get('/auth/google/callback', authCtrl.googleCallback);

// Ruta para completar registro (para usuarios de Google)
app.get('/complete-registration', isAuthenticated, (req, res) => {
  if (req.user?.password_hash) {
    return res.redirect('/admin');
  }
  res.render('complete-registration', { 
    pageTitle: 'Completar Registro',
    user: req.user 
  });
});

app.post('/complete-registration', isAuthenticated, async (req, res) => {
  try {
    if (!req.user) throw new Error('Usuario no autenticado');
    if (req.user.password_hash) throw new Error('El usuario ya tiene contraseña');
    
    const { password } = req.body;
    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    await usersModel.setPassword(req.user.id, password);
    req.flash('success', 'Contraseña establecida correctamente');
    res.redirect('/admin');
  } catch (error) {
    req.flash('error', error instanceof Error ? error.message : 'Error desconocido');
    res.redirect('/complete-registration');
  }
});

// Rutas administrativas
app.get('/admin', isAuthenticated, adminController.showAdminDashboard);
app.get('/admin/contacts', isAuthenticated, (req, res) => res.redirect('/admin'));
app.get('/admin/register', isAuthenticated, authCtrl.showRegister);
app.post('/admin/register', isAuthenticated, authCtrl.register);
app.get('/admin/payments', isAuthenticated, adminController.showPaymentsList);

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).render('404', { pageTitle: 'Página no encontrada' });
});

// Inicio de la aplicación
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
    console.error('Error crítico durante la inicialización:', err);
    process.exit(1);
  }
}

startApp();
