// Required dependencies
const http = require('http'),
      path = require('path'),
      express = require('express'),
      handlebars = require('express-handlebars'),
      socket = require('socket.io');

// Importing configuration and custom modules
const config = require('../config');
const myIo = require('./sockets/io'),
      routes = require('./routes/routes');

// Setting up Express and HTTP server
const app = express(),
      server = http.Server(app),
      io = socket(server);

// Start the server and listen on the configured port
server.listen(config.port);

// Global object to store active games
games = {};

// Initialize socket event handlers
myIo(io);

// Log server start information
console.log(`Server listening on port ${config.port}`);

// Set up Handlebars view engine with custom configuration
const Handlebars = handlebars.create({
  extname: '.html', // Use .html extension for templates
  partialsDir: path.join(__dirname, '..', 'front', 'views', 'partials'),
  defaultLayout: false, // No default layout
  helpers: {} // Placeholder for helper functions if needed
});

// Configure the Express app to use Handlebars
app.engine('html', Handlebars.engine);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '..', 'front', 'views'));

// Serve static files from the 'public' folder
app.use('/public', express.static(path.join(__dirname, '..', 'front', 'public')));

// Register routes
routes(app);
