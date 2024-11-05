// Load environment variables from a .env file
require('dotenv').config();

// Import the path module to work with file and directory paths
const path = require('path');

// Start the server by requiring the server.js file
require(path.join(__dirname, 'server', 'server.js'));
