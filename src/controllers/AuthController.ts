import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import UsersModel from '../models/UsersModel';

export default class AuthController {
  constructor(private users: UsersModel) {
    this.showLogin     = this.showLogin.bind(this);
    this.login         = this.login.bind(this);
    this.logout        = this.logout.bind(this);
    this.showRegister  = this.showRegister.bind(this);
    this.register      = this.register.bind(this);

    // Google OAuth
    this.googleAuth     = passport.authenticate('google', { scope: ['profile','email'] });
    this.googleCallback = [
      passport.authenticate('google', { failureRedirect: '/admin' }),
      (_req: Request, res: Response) => res.redirect('/admin')
    ];
  }

  showLogin(req: Request, res: Response) {
    res.render('login', { pageTitle: 'Login Admin' });
  }

  async login(req: Request, res: Response, next: NextFunction) {
    const { username, password } = req.body;
    if (!username || !password) {
      req.flash('error', 'Usuario y contraseña requeridos');
      return res.redirect('/admin');
    }

    try {
      const user = await this.users.findByUsername(username);
      if (!user || !(await this.users.verifyPassword(user, password))) {
        req.flash('error', 'Credenciales inválidas');
        return res.redirect('/admin');
      }
      req.login(user, err => {
        if (err) return next(err);
        res.redirect('/admin');
      });
    } catch (err) {
      next(err);
    }
  }

  logout(req: Request, res: Response) {
    req.logout(() => {
      req.session.destroy(() => {
        res.redirect('/');
      });
    });
  }

  showRegister(req: Request, res: Response) {
    res.render('register', { pageTitle: 'Registrar Usuario' });
  }

  async register(req: Request, res: Response) {
    const { username, password } = req.body;
    if (!username || !password) {
      req.flash('error', 'Todos los campos son obligatorios');
      return res.redirect('/admin/register');
    }
    try {
      await this.users.createUser(username, password);
      req.flash('success', 'Usuario creado');
      res.redirect('/admin/register');
    } catch (err: any) {
      req.flash('error', err.message);
      res.redirect('/admin/register');
    }
  }

  // Passport hooks
  googleAuth: any;
  googleCallback: any;
}
