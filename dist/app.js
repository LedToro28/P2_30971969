"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const port = 3000;
// Servir archivos estáticos desde la carpeta 'public'
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path_1.default.join(__dirname, '../views'));
// Definir los datos a mostrar
const nombreCompleto = "Juan Pablo Gonzalez La Posta";
const cedula = "V-31499269";
const seccion = "3";
// Implementar la ruta para la página inicial
app.get('/', (req, res) => {
    res.render('index', { nombreCompleto, cedula, seccion });
});
// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en ${port}`);
});
