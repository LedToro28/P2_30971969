// src/config/passport.ts
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local'; // Aquí es donde se usa Strategy
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import UserModel, { User } from '../models/UserModel'; // Asegúrate de que User esté importado

// Define la función de configuración de Passport
// Ahora acepta userModel como argumento
export default function configurePassport(userModel: UserModel) {
    // Estrategia Local
    passport.use(new LocalStrategy(
        { usernameField: 'username' },
        async (username: string, password: string, done: (error: any, user?: any, info?: any) => void) => { // Tipos explícitos aquí
            try {
                const user = await userModel.findByUsername(username);
                if (!user) {
                    return done(null, false, { message: 'Usuario no encontrado.' });
                }
                // Asegúrate de que user.password_hash no sea undefined antes de comparar
                if (!user.password_hash) {
                    return done(null, false, { message: 'Este usuario no tiene contraseña local.' });
                }
                const isMatch = await userModel.comparePassword(password, user.password_hash);
                if (!isMatch) {
                    return done(null, false, { message: 'Contraseña incorrecta.' });
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    ));

    // Estrategia de Google
    passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            callbackURL: process.env.GOOGLE_CALLBACK_URL as string
        },
        async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any, info?: any) => void) => {
            try {
                let user = await userModel.findByGoogleId(profile.id);
                if (!user) {
                    // Si el usuario no existe, intenta encontrarlo por email o crea uno nuevo
                    const email = profile.emails?.[0]?.value as string;
                    if (email) {
                        user = await userModel.findByEmail(email);
                        if (user) {
                            // Actualizar usuario existente con google_id
                            await userModel.updateUser(user.id as number, { google_id: profile.id });
                        } else {
                            // Crear nuevo usuario
                            user = await userModel.createUserWithGoogle(
                                email,
                                profile.id,
                                profile.displayName || profile.name?.givenName || 'Google User'
                            );
                        }
                    } else {
                        // Si no hay email, no podemos crear ni vincular
                        return done(null, false, { message: 'No se pudo obtener el email del perfil de Google.' });
                    }
                }
                return done(null, user);
            } catch (err) {
                return done(err as Error);
            }
        }
    ));

    // Serializar usuario (lo que se guarda en la sesión)
    passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
        done(null, user.id); // Guardar solo el ID del usuario
    });

    // Deserializar usuario (recuperar usuario de la sesión)
    passport.deserializeUser(async (id: number, done: (err: any, user?: any) => void) => {
        try {
            const user = await userModel.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
}
