import express, { Request, Response } from 'express';
import path from 'path';

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));


app.get('/', (req, res) => {
    res.render('index', {});
  });
app.get('/servicios', (req, res) => {
    res.render('servis', {});
  });
app.get('/contacto', (req, res) => {
    res.render('contac', {});
  });   
app.get('/info', (req, res) => {
    res.render('info', {});
  });


app.listen(port, () => {
    console.log(`Servidor corriendo en ${port}`);
});