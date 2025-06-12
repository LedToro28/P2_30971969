// src/config/passport.ts
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import UserModel, { User } from '../models/UserModel'; // Asegúrate de que User esté importado

// Define la función de configuración de Passport
// Ahora acepta userModel como argumento
export default function configurePassport(userModel: UserModel) {
    // Estrategia Local
    passport.use(new LocalStrategy(
        { usernameField: 'username' },
        async (username, password, done) => {
            try {
                const user = await userModel.findByUsername(username); // Usa userModel
                if (!user) {
                    return done(null, false, { message: 'Usuario no encontrado.' });
                }
                const isMatch = await userModel.comparePassword(password, user.password_hash as string); // Usa userModel
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
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await userModel.findByGoogleId(profile.id); // Usa userModel
                if (!user) {
                    // Si el usuario no existe, intenta encontrarlo por email o crea uno nuevo
                    user = await userModel.findByEmail(profile.emails?.[0]?.value as string);
                    if (user) {
                        // Actualizar usuario existente con google_id
                        await userModel.updateUser(user.id as number, { google_id: profile.id });
                    } else {
                        // Crear nuevo usuario
                        user = await userModel.createUserWithGoogle(
                            profile.emails?.[0]?.value as string,
                            profile.id,
                            profile.displayName || profile.name?.givenName || 'Google User'
                        );
                    }
                }
                return done(null, user);
            } catch (err) {
                return done(err as Error);
            }
        }
    ));

    // Serializar usuario (lo que se guarda en la sesión)
    passport.serializeUser((user: any, done) => {
        done(null, user.id); // Guardar solo el ID del usuario
    });

    // Deserializar usuario (recuperar usuario de la sesión)
    passport.deserializeUser(async (id: number, done) => {
        try {
            const user = await userModel.findById(id); // Usa userModel
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
}