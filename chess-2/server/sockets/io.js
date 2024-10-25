// Exporting a function to handle socket events
module.exports = io => {
    // Listen for new socket connections
    io.on('connection', socket => {
        console.log('New socket connection');

        let currentCode = null; // Track the game code for the connected socket

        // Listen for a 'move' event sent by a client
        socket.on('move', function(move) {
            console.log('move detected');
            io.to(currentCode).emit('newMove', move); // Broadcast the move to other players
        });

        // Listen for a player joining a game
        socket.on('joinGame', function(data) {
            currentCode = data.code; // Store the game code
            socket.join(currentCode); // Join the game room

            // If the game does not exist, create a new one
            if (!games[currentCode]) {
                games[currentCode] = true;
                return;
            }

            // If the game already exists, signal the start to both players
            io.to(currentCode).emit('startGame');
        });

        // Handle socket disconnection
        socket.on('disconnect', function() {
            console.log('socket disconnected');

            // Notify players if the game is interrupted by a disconnect
            if (currentCode) {
                io.to(currentCode).emit('gameOverDisconnect');
                delete games[currentCode]; // Remove the game from the active list
            }
        });
    });
};
