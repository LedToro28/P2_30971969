import express, { Request, Response } from 'express';
import path from 'path';

const app = express();
const port = 3000;

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '../public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Definir los datos a mostrar
const nombreCompleto = "Juan Pablo Gonzalez La Posta";
const cedula = "V-31499269";
const seccion = "3"; 

// Implementar la ruta para la página inicial
app.get('/', (req: Request, res: Response) => {
    res.render('index', { nombreCompleto, cedula, seccion });

});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en ${port}`);
});