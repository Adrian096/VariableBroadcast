const express    = require('express');
const {body, validationResult} = require('express-validator');
const app        = express();
const session    = require('client-sessions');
const uuid       = require('uuid');
const fs         = require('fs');
const http       = require('http');
const server     = http.createServer(app);
const { Server } = require("socket.io");
const bodyParser = require('body-parser');
const io         = new Server(server);


const port = 3000;

var databaseFile = 'test-database.json';
var data;

fs.readFile('database/' + databaseFile, (err, data_r) => {
  if(err){
    let createData = 
    {
      password: "12345",
      website_data: {
        var1: "value1",
        var2: "value2"
      }
    }
    fs.writeFileSync('database/' + databaseFile, JSON.stringify(createData));
    data = createData;
    console.error(err.message + " | new database created!");
    return;
  }
  data = JSON.parse(data_r);
});

var users = [];

//io Broadcast
io.on('connection', (socket) => {
  console.log('a user connected: ' + socket.id);
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
  socket.on('update', (msg) => {
    io.emit('update', JSON.stringify(data.website_data));
  });
});

//Server config
app.use(session({
  cookieName: 'session',
  secret: '123451234512345',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000
}),

express.static('public'),
express.json());

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set('view engine', 'ejs');


//Handle GET requests
app.get('/', (req, res) => {
  res.render('pages/index', {content: '../partials/body_data'});
  io.emit('update', JSON.stringify(data.website_data));
});

app.get('/login', (req, res) => {
  if(!req.session.user)
    res.render('pages/index', {content: '../partials/form-login'});
  else
    res.redirect('/');
});

app.get('/changeValue', (req, res) => {
  if(req.session.user) 
    res.render('pages/index', {content: '../partials/form-data'});
  else                 
    res.redirect('/login');
});


//Handle POST requests
app.post('/form', (req, res) => {
  if(req.session.user)
    res.redirect('/');

  users[req.sessionID] = req.session.user;
  console.log("REQ: " + req.sessionID);

  if(req.body.password == data.password){
    req.session.user = uuid.v4();
    console.log("User: " + req.session.user);
    res.redirect('/changeValue');
  }else{
    res.redirect('/login');
  }
});

app.post('/formChange', 
         [body('val1', 'Min. 3 chars.').trim().isLength({min: 3}).escape(),
          body('val2', 'Min. 3 chars.').trim().isLength({min: 3}).escape()], 
  (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  if(req.body.val1)
    data.website_data.var1 = req.body.val1;
  if(req.body.val2)
    data.website_data.var2 = req.body.val2;

  fs.writeFileSync('database/test-database.json', JSON.stringify(data));
  io.emit('update', JSON.stringify(data.website_data));
  return res.status(200).json({
    success: true,
    message: 'Values changed successful'
  });
});

app.post('/getData', (req, res) => {
  res.send(JSON.stringify(data.website_data));
  io.emit('update', JSON.stringify(data.website_data));
});

//Server listening on the port
server.listen(port, () => {
  console.log("Listening on port " + port);
});