"use strict";
// src/app.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const body_parser_1 = __importDefault(require("body-parser"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const express_session_1 = __importDefault(require("express-session"));
const connect_flash_1 = __importDefault(require("connect-flash"));
const app = (0, express_1.default)();
app.set('trust proxy', true);
const port = 3000;
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use('/bootstrap', express_1.default.static(path_1.default.join(__dirname, '../node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express_1.default.static(path_1.default.join(__dirname, '../node_modules/bootstrap-icons/font')));
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'tu-cadena-secreta-cambiala-en-produccion-12345abc',
    resave: false,
    saveUninitialized: true
}));
app.use((0, connect_flash_1.default)());
const db = new sqlite3_1.default.Database('./database.db', (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
    }
    else {
        console.log('Conectado a la base de datos SQLite.');
        app.set('view engine', 'ejs');
        app.set('views', path_1.default.join(__dirname, '../views'));
        console.log('EJS Views Directory configured as:', app.get('views'));
        app.get('/', (req, res) => { res.render('index', { pageTitle: 'Inicio Ciclexpress' }); });
        app.get('/servicios', (req, res) => { res.render('servicios', { pageTitle: 'Servicios Ciclexpress' }); });
        app.get('/informacion', (req, res) => { res.render('informacion', { pageTitle: 'Sobre Ciclexpress' }); });
        app.get('/payment', (req, res) => { res.render('payment', { pageTitle: 'Procesar Pago' }); });
        app.post('/payment/add', (req, res) => {
            console.log("Datos de pago recibidos:", req.body);
            res.send('<h1>Pago simulado realizado!</h1><p>Los datos fueron recibidos (simulados).</p>');
        });
        app.listen(port, () => {
            console.log(`Servidor corriendo en http://localhost:${port}`);
        });
    }
});
