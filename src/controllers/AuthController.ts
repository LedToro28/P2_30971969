import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import UserModel from '../models/UserModel'; // Asegúrate de que esta importación sea correcta
// bcrypt ya está importado, no se usa directamente en este controlador para hashing o comparación,
// esa lógica debería estar encapsulada en UserModel.

// Middleware para asegurar que el usuario está autenticado
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
    // Si el usuario está autenticado (Passport lo verifica)
    if (req.isAuthenticated()) {
        return next(); // Continuar con la siguiente función de middleware/ruta
    }

    // Si no está autenticado, guardar un mensaje flash y redirigir al login
    req.flash('error', 'Por favor, inicia sesión para acceder a esta página.');
    res.redirect('/login');
}

// Middleware para asegurar que el usuario es un administrador
export function ensureAdmin(req: Request, res: Response, next: NextFunction) {
    // Verifica si el usuario está autenticado Y si su nombre de usuario es 'admin'
    if (req.isAuthenticated() && req.user && (req.user as Express.User).username === 'admin') {
        return next(); // Continuar
    }

    // Si no es admin o no está autenticado, acceso denegado
    req.flash('error', 'Acceso denegado. Solo administradores pueden realizar esta acción.');
    res.status(403).redirect('/login'); // Redirigir al login con un estado 403 (Prohibido)
}

class AuthController {
    private userModel: UserModel; // Declara una propiedad para la instancia de UserModel

    // El constructor ahora acepta la instancia de UserModel
    constructor(userModel: UserModel) {
        this.userModel = userModel; // Asigna la instancia pasada a la propiedad de la clase

        // Vinculamos los métodos al contexto de la clase para que 'this' funcione correctamente en las rutas
        this.showLoginForm = this.showLoginForm.bind(this);
        this.loginLocal = this.loginLocal.bind(this);
        this.logout = this.logout.bind(this);
        this.showRegisterForm = this.showRegisterForm.bind(this);
        this.registerUser = this.registerUser.bind(this);
    }

    // Muestra el formulario de inicio de sesión
    showLoginForm(req: Request, res: Response): void {
        res.render('auth/login', {
            pageTitle: 'Iniciar Sesión',
            message: req.flash('error'), // Pasa el mensaje de error si existe
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY // Pasa la clave del sitio reCAPTCHA
        });
    }

    // Maneja el intento de inicio de sesión local
    loginLocal(req: Request, res: Response, next: NextFunction): void {
        // Usa passport.authenticate con la estrategia 'local'
        passport.authenticate('local', (err: Error, user: Express.User, info: { message: string }) => {
            if (err) {
                console.error('Error de autenticación:', err);
                return next(err); // Pasa el error a la siguiente middleware de manejo de errores
            }
            // Si el usuario no es encontrado o las credenciales son incorrectas
            if (!user) {
                req.flash('error', info.message || 'Credenciales incorrectas.'); // Muestra el mensaje de Passport o uno por defecto
                return res.redirect('/login');
            }
            // Si la autenticación es exitosa, inicia la sesión del usuario
            req.logIn(user, (loginErr: Error) => {
                if (loginErr) {
                    console.error('Error al iniciar sesión (req.logIn):', loginErr);
                    return next(loginErr);
                }
                req.flash('success', '¡Has iniciado sesión correctamente!');
                return res.redirect('/admin/contacts'); // Redirige al panel de administración
            });
        })(req, res, next); // Llama al middleware de autenticación de Passport
    }

    // Cierra la sesión del usuario
    logout(req: Request, res: Response, next: NextFunction): void {
        // req.logout es un método proporcionado por Passport para cerrar la sesión
        req.logout((err: Error) => {
            if (err) {
                console.error('Error al cerrar sesión (req.logout):', err);
                return next(err); // Pasa el error a la siguiente middleware
            }

            // Destruye la sesión de Express
            req.session.destroy((sessionErr: Error | null) => {
                if (sessionErr) {
                    console.error('Error al destruir la sesión:', sessionErr);
                    return next(sessionErr); // Pasa el error si la sesión no se puede destruir
                }

                // Limpia la cookie de sesión (nombre por defecto 'connect.sid')
                res.clearCookie('connect.sid');
                req.flash('success', 'Has cerrado sesión exitosamente.');
                res.redirect('/'); // Redirige a la página de inicio
            });
        });
    }

    // Muestra el formulario de registro de usuario
    showRegisterForm(req: Request, res: Response): void {
        res.render('auth/register', {
            pageTitle: 'Registrar Nuevo Usuario',
            message: req.flash('error') // Pasa el mensaje de error si existe
        });
    }

    // Maneja el registro de un nuevo usuario
    async registerUser(req: Request, res: Response): Promise<void> {
        const { username, password, display_name, email, confirm_password } = req.body; // Asegúrate de que 'display_name' y 'confirm_password' están en el body

        // Validación básica
        if (!username || !password || !email || !confirm_password) {
            req.flash('error', 'Nombre de usuario, email, contraseña y confirmación de contraseña son obligatorios.');
            return res.redirect('/register');
        }

        if (password !== confirm_password) {
            req.flash('error', 'Las contraseñas no coinciden.');
            return res.redirect('/register');
        }

        try {
            // Usa la instancia de userModel para interactuar con la base de datos
            const existingUser = await this.userModel.findByUsername(username);
            if (existingUser) {
                req.flash('error', 'El nombre de usuario ya está registrado.');
                return res.redirect('/register');
            }

            const existingEmail = await this.userModel.findByEmail(email);
            if (existingEmail) {
                req.flash('error', 'El email ya está registrado.');
                return res.redirect('/register');
            }

            // Crea el usuario localmente a través del modelo
            const newUserId = await this.userModel.createLocalUser(username, password, display_name, email);
            console.log(`Usuario local registrado con ID: ${newUserId}`);

            req.flash('success', 'Usuario registrado exitosamente. ¡Ahora puedes iniciar sesión!');
            res.redirect('/login');
        } catch (error) {
            console.error('Error al registrar el usuario:', error);
            req.flash('error', 'Hubo un error al registrar el usuario. Inténtalo de nuevo.');
            res.redirect('/register');
        }
    }
}

// Exporta la clase AuthController para que pueda ser instanciada en app.ts
export default AuthController;
