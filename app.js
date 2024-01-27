require("dotenv").config()
const express = require("express")
const path = require("path")
const bcrypt = require("bcrypt")
const session = require("express-session")
const saltRounds = 10
const { Pool } = require('pg')
const Stomp = require('@stomp/stompjs')
const WebSocket = require('ws')
const { Socket } = require("socket.io")

const app = express()

const server = require('http').createServer(app);
const io = require('socket.io')(server);

io.on('connection', (socket) =>{
   console.log('usuario conectado');
});

app.set('view engine', 'ejs')


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(session({
   secret: '123456789',
   resave: false,
   saveUninitialized: true
}))

const pool = new Pool({
   user: process.env.DB_USER,
   host: process.env.DB_HOST,
   database: process.env.DB_NAME,
   password: process.env.DB_PASSWORD,
   port: process.env.DB_PORT || 5432,
})

const client = new Stomp.Client({
   brokerURL: `ws://${process.env.BROKER_HOST}:${process.env.BROKER_PORT}/ws`,
   connectHeaders: {
      login: process.env.BROKER_USER,
      passcode: process.env.BROKER_PASSWORD
   },
   debug: function(str){
      console.log(str)
   },
   reconnectDelay: 5000,
   heartbeatIncoming: 4000,
   heartbeatOutgoing: 4000,
   webSocketFactory: () => new WebSocket(`ws://${process.env.BROKER_HOST}:${process.env.BROKER_PORT}/ws`)
})

client.onConnect = function(frame) {
   console.log('Conectado al broker de mensajes.');
   const subscription = client.subscribe('procesamiento', function(message) {
      console.log('Mensaje recibido en procesamiento:', message.body);
      if(message.headers.type == 'error'){
         io.emit("mensajeError", message.body)
      }else if(message.headers.type == 'success'){
         io.emit("mensajeConfirmacion", message.body)
      }
   });
};

client.activate();


app.get("/", (req, res) =>{
   res.redirect("/login")
})
app.get("/menuPrincipal", (req, res) => {
   if(req.session.login){
      req.session.carrito = false
      restartValues();
      res.render('menu', {nombres: req.session.nombres})
   }else{
      res.redirect('/login')
   }
})
app.post("/menuPrincipal", async (req, res) => {

   const values = [
      req.body.lapiceros,
      req.body.cuadernos,
      req.body.lapices,
      req.body.resaltadores,
      req.body.calculadora,
      req.body.notasAd,
      req.body.cartuchera,
      req.body.grapadora,
      req.body.regla,
      req.body.tijera,
      req.body.mochila,
      req.body.colores,
   ]

   for(let i=0; i<products.length; i++){
      products[i].cantidad = values[i]
   }

   req.session.items = products
   req.session.carrito = true

   res.redirect('/carrito')

})

app.get("/carrito", (req, res) => {
   if(req.session.login ){
      if(req.session.carrito){
         res.render('carrito', {items: req.session.items, nombres: req.session.nombres, apellidos: req.session.apellidos, ruc: req.session.ruc})
      }else{
         res.redirect('/menuPrincipal')
      }
   }else{
      res.redirect('/login')
   }
})

app.post("/carrito", (req, res) =>{
   
   var items = []

   products.forEach(pd => {
      let cant = parseInt(pd.cantidad)

      if(cant > 0){
         items.push(pd)
      }
   });

   const mensaje = {
      codigoCliente: req.session.codigo,
      nombreCliente: req.session.nombres + " " + req.session.apellidos,
      ruc: req.session.ruc,
      articulos: items,
   }

   const mensajeJson = JSON.stringify(mensaje);

   if (client.connected) {
      client.publish({
          destination: 'ordenes',
          body: mensajeJson,
          headers: {
              'receipt': 'message-12345'
          }
      });

      client.onReceipt = function(receipt) {
          if (receipt.headers['receipt-id'] === 'message-12345') {
              console.log('Mensaje enviado con éxito');
              res.status(200).send('Mensaje enviado');
          }
      };
   } else {
         console.error('Cliente no conectado, no se puede enviar mensaje');
         res.status(500).send('Cliente no conectado');
   }

   //res.redirect('/carrito')
})

app.get("/login", (req, res) => {
   cleanVariables(req)
   restartValues()
   res.render('login', {error: req.session.loginError})
})

app.post("/login", async (req, res) => {
   console.log(req.body)
   const correo = req.body.correo
   const pass = req.body.password

   try{
      const results = await pool.query('SELECT * FROM Users WHERE correo = $1', [correo])
      if(results){
         const user = results.rows[0]
         bcrypt.compare(pass, user.password, function(err, isMatch) {
            if(err){
               res.redirect('/login')
            }else if(isMatch){
               if(user.id_rol == 2){
                  req.session.codigo = user.id
                  req.session.nombres = user.nombres
                  req.session.apellidos = user.apellidos
                  req.session.correo = user.correo
                  req.session.ruc = user.ruc
                  req.session.login = true;
                  res.redirect('/menuPrincipal')
               }else{
                  res.redirect('/login')
               }     
            }else{
               res.redirect('/login')
            }
         })
      }else{
         res.redirect('/login')
      }
   }catch(error){
      res.redirect('/login')
   }
})

app.get("/register", (req, res) => {
   cleanVariables(req)
   restartValues()
   res.render('register')
})

app.post("/register", async (req, res) =>{
   const nombres = req.body.nombres
   const apellidos = req.body.apellidos
   const correo = req.body.correo
   const ruc = req.body.ruc
   const pass = req.body.password
   const rol = 2 //Rol de cliente

   bcrypt.hash(pass, saltRounds, function(err, hash) {
      if (err) {
         return res.status(500).send('Error al generar el hash de la contraseña');
      }
      const passCrypt = hash; 

      try{
         pool.query('INSERT INTO Users (id_rol, nombres, apellidos, correo, ruc, password) VALUES ($1, $2, $3, $4, $5, $6)',
            [rol, nombres, apellidos, correo, ruc, passCrypt], (error, results) =>{
               if(error){
                  res.redirect('/register')
               }else{
                  res.redirect('/login')
               }
            })
      }catch (error){
         res.redirect('/register')
      }
   });

})

function cleanVariables(req){
   req.session.nombres = null
   req.session.apellidos = null
   req.session.correo = null
   req.session.ruc = null
   req.session.codigo = null
   req.session.login = false
   req.session.carrito = false
}

async function getUserCode(req, correo){
   try{
      const results = await pool.query('SELECT * FROM Users WHERE correo = $1', [correo])
      if(results){
         const user = results.rows[0]
         req.session.codigo = user.id
      }
   }catch(error){
      console.log("Error al asignar el código")
   }
}

const PORT = process.env.PORT || 3000
server.listen(PORT, () =>{
   console.log("Servidor corriendo en el puerto " + PORT)
})

var products = [
   {codigo: 'A0001', nombre:'Lapiceros', cantidad:0, precio:5.50 },
   {codigo: 'A0002', nombre:'Cuadernos', cantidad:0, precio:12.90 },
   {codigo: 'A0003', nombre:'Lápices HB', cantidad:0, precio:12.90 },
   {codigo: 'A0004', nombre:'Resaltadores', cantidad:0, precio:7.90 },
   {codigo: 'A0005', nombre:'Calculadora', cantidad:0, precio:24.90 },
   {codigo: 'A0006', nombre:'Notas adhesivas', cantidad:0, precio:6.90 },
   {codigo: 'A0007', nombre:'Cartuchera', cantidad:0, precio:7.50 },
   {codigo: 'A0008', nombre:'Grapadora', cantidad:0, precio:16.70 },
   {codigo: 'A0009', nombre:'Regla', cantidad:0, precio:3.90 },
   {codigo: 'A0010', nombre:'Tijera', cantidad:0, precio:5.50 },
   {codigo: 'A0011', nombre:'Mochila', cantidad:0, precio:58.50 },
   {codigo: 'A0012', nombre:'Paquete de Colores', cantidad:0, precio:12.50 },
]

function restartValues(){
   products = [
      {codigo: 'A0001', nombre:'Lapiceros', cantidad:0, precio:5.50 },
      {codigo: 'A0002', nombre:'Cuadernos', cantidad:0, precio:12.90 },
      {codigo: 'A0003', nombre:'Lápices HB', cantidad:0, precio:12.90 },
      {codigo: 'A0004', nombre:'Resaltadores', cantidad:0, precio:7.90 },
      {codigo: 'A0005', nombre:'Calculadora', cantidad:0, precio:24.90 },
      {codigo: 'A0006', nombre:'Notas adhesivas', cantidad:0, precio:6.90 },
      {codigo: 'A0007', nombre:'Cartuchera', cantidad:0, precio:7.50 },
      {codigo: 'A0008', nombre:'Grapadora', cantidad:0, precio:16.70 },
      {codigo: 'A0009', nombre:'Regla', cantidad:0, precio:3.90 },
      {codigo: 'A0010', nombre:'Tijera', cantidad:0, precio:5.50 },
      {codigo: 'A0011', nombre:'Mochila', cantidad:0, precio:58.50 },
      {codigo: 'A0012', nombre:'Paquete de Colores', cantidad:0, precio:12.50 },
   ]
}