'use strict';

const express     = require('express');
const session     = require('express-session');
const bodyParser  = require('body-parser');
const fccTesting  = require('./freeCodeCamp/fcctesting.js');
const auth        = require('./app/auth.js');
const routes      = require('./app/routes.js');
const mongoose    = require("mongoose");
const passport    = require('passport');
const cookieParser= require('cookie-parser')
const app         = express();
const http        = require('http').Server(app);
const sessionStore= new session.MemoryStore();
const cors        = require('cors');
const io          = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');

fccTesting(app); //For FCC testing purposes

app.use(cors());
app.use('/public', express.static(process.cwd() + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'pug')

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  key: 'express.sid',
  store: sessionStore,
}));

mongoose.connect(process.env.DATABASE, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true
});

// get reference to database
const db = mongoose.connection;

db.on("error", err => console.log("Database error: " + err));

db.on("connected", () => {
  console.log("Successful database connection");

  auth(app, db);

  routes(app, db);

  http.listen(process.env.PORT || 3000);

  //start socket.io code  
  // parsing and decoding the cookie that contains the passport session then deserializing it to obtain the user object
  io.use(passportSocketIo.authorize({
    cookieParser: cookieParser,
    key:          'express.sid',
    secret:       process.env.SESSION_SECRET,
    store:        sessionStore
  }));
  
  let currentUsers = 0;

  io.on('connection', socket => {
    const userName = socket.request.user.name;
    console.log('User ' + userName + ' connected');
    ++currentUsers;
    io.emit('user', {name: userName, currentUsers, connected: true});
    
    socket.on('disconnect', () => {
      console.log('User ' + socket.request.user.name + ' has disconnected');
      --currentUsers;
      io.emit('user', {name: userName, currentUsers, connected: false});
    });
    
    socket.on('chat message', (message) => {
      io.emit('chat message', {name: userName, message});
    });
  });

  //end socket.io code
});

