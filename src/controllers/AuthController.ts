import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import UsersModel from '../models/UsersModel';

export default class AuthController {
  constructor(private users: UsersModel) {
    // Bind de métodos
    this.showLogin = this.showLogin.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.showRegister = this.showRegister.bind(this);
    this.register = this.register.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.isAdmin = this.isAdmin.bind(this);

    // Configuración de Google OAuth
    this.googleAuth = passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account' // Fuerza a seleccionar cuenta cada vez
    });
    
    this.googleCallback = [
      passport.authenticate('google', { 
        failureRedirect: '/login',
        failureFlash: true 
      }),
      (req: Request, res: Response) => {
        // Verifica si el usuario de Google necesita completar registro
        if (!req.user?.password_hash) {
          return res.redirect('/complete-registration');
        }
        return res.redirect('/admin');
      }
    ];
  }

  showLogin(req: Request, res: Response) {
    res.render('login', { 
      pageTitle: 'Login Admin',
      error: req.flash('error'),
      success: req.flash('success')
    });
  }

  async login(req: Request, res: Response, next: NextFunction) {
    const { username, password } = req.body;
    
    if (!username || !password) {
      req.flash('error', 'Usuario y contraseña requeridos');
      return res.redirect('/login');
    }

    try {
      const user = await this.users.findByUsername(username);
      
      if (!user) {
        req.flash('error', 'Usuario no encontrado');
        return res.redirect('/login');
      }

      // Verifica si es un usuario de Google sin contraseña local
      if (user.google_id && !user.password_hash) {
        req.flash('error', 'Por favor inicia sesión con Google o establece una contraseña');
        return res.redirect('/login');
      }

      const isValid = await this.users.verifyPassword(user, password);
      if (!isValid) {
        req.flash('error', 'Contraseña incorrecta');
        return res.redirect('/login');
      }

      // Inicio de sesión exitoso
      req.login(user, (err) => {
        if (err) return next(err);
        req.flash('success', 'Sesión iniciada correctamente');
        return res.redirect('/admin');
      });

    } catch (err) {
      console.error('Error en login:', err);
      req.flash('error', 'Error al iniciar sesión');
      return res.redirect('/login');
    }
  }

  logout(req: Request, res: Response) {
    req.logout((err) => {
      if (err) {
        console.error('Error al cerrar sesión:', err);
        return res.redirect('/admin');
      }
      req.session.destroy(() => {
        res.redirect('/');
      });
    });
  }

  showRegister(req: Request, res: Response) {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }
    res.render('register', { 
      pageTitle: 'Registrar Usuario',
      error: req.flash('error'),
      success: req.flash('success')
    });
  }

  async register(req: Request, res: Response) {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }

    const { username, password } = req.body;
    if (!username || !password) {
      req.flash('error', 'Todos los campos son obligatorios');
      return res.redirect('/admin/register');
    }

    try {
      await this.users.createUser(username, password);
      req.flash('success', 'Usuario creado exitosamente');
      return res.redirect('/admin/register');
    } catch (err: any) {
      console.error('Error en registro:', err);
      req.flash('error', err.message || 'Error al crear usuario');
      return res.redirect('/admin/register');
    }
  }

  // Middleware para verificar autenticación
  isAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error', 'Por favor inicia sesión');
    res.redirect('/login');
  }

  // Middleware para verificar admin
  isAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && req.user?.username === 'admin') {
      return next();
    }
    req.flash('error', 'Acceso no autorizado');
    res.redirect('/login');
  }

  // Tipado para métodos de Google OAuth
  googleAuth: (req: Request, res: Response, next: NextFunction) => void;
  googleCallback: Array<(req: Request, res: Response, next: NextFunction) => void>;
}
