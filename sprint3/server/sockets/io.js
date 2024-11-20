module.exports = io => {
    // Optional: Uncomment this to log all incoming events for debugging purposes
    // socket.onAny((eventName, ...args) => {
    //     console.log(`Received event: ${eventName}`);
    // });

    // Define an object to track coin balances by socket ID
    const coinBalances = {};

    io.on('connection', socket => {
        console.log('New socket connection established');
        
        let currentCode = null; // Variable to track the current game code for the socket connection
        coinBalances[socket.id] = 2000; // Set initial coin balance for each new connection

        // Listen for balance updates from the client
        socket.on("updateCoinBalance", (newBalance) => {
            coinBalances[socket.id] = newBalance; // Update the balance for the connected player
        });
        
        // Listen for 'flipBoard' event from client to trigger board flip on opponent's side
        socket.on("flipBoard", (side) => {
            // Broadcast the flipBoard event to the opponent in the same room
            socket.broadcast.to(currentCode).emit("flipBoard", side);
        });

        // Listen for 'reduceOpponentCoins' event to decrease opponent's coin balance
        socket.on("reduceOpponentCoins", (side) => {
            // Broadcast the event to the opponent in the same room
            socket.broadcast.to(currentCode).emit("reduceOpponentCoins", side);
        });

        // Listen for 'increaseOpponentCost' event to increase opponent's action costs
        socket.on("increaseOpponentCost", (side) => {
            // Broadcast the event to the opponent in the same room
            socket.broadcast.to(currentCode).emit("increaseOpponentCost", side);
        });

        // Listen for 'verifyAndRemovePiece' to remove a piece at a specified position for both players
        socket.on("verifyAndRemovePiece", (position) => {
            // Broadcast the removeRandomPiece event to all clients in the current game room
            io.to(currentCode).emit("removeRandomPiece", position);
        });

        socket.on("rizzler", (pieceData, playerColor) => {
            // Broadcast to all clients in the room, including the player who initiated it
            io.to(currentCode).emit("updatePieceOwnership", pieceData, playerColor);
        });

        // Listen for 'move' event to broadcast a new move to both players in the room
        socket.on('move', function(move) {
            console.log('Move detected');
            // Broadcast the move to all clients in the current game room
            io.to(currentCode).emit('newMove', move);
        });

        // Listen for 'joinGame' event when a player joins a game room
        socket.on('joinGame', function(data) {
            currentCode = data.code; // Set current game code to data from the client
            socket.join(currentCode); // Join the specified game room

            // Initialize game state if it's the first player joining
            if (!games[currentCode]) {
                games[currentCode] = true;
                return; // Exit without broadcasting startGame if it's the first player
            }

            // If second player joins, start the game for both players in the room
            io.to(currentCode).emit('startGame');
        });

        // Listen for 'disconnect' event to handle player disconnections
        socket.on('disconnect', function() {
            console.log('Socket disconnected');

            // If the player was in a game room, notify other players and clean up the game
            if (currentCode) {
                io.to(currentCode).emit('gameOverDisconnect'); // Notify all clients in the room of disconnect
                delete games[currentCode]; // Remove game state for the room
            }
        });

        socket.on("activateMultiplier", (side) => {
            // Notify both players in the room of the multiplier activation
            io.to(currentCode).emit("multiplierActivated", side);
        });

        // Listen for 'seeOpponentCoins' request and send opponent's coin balance
        socket.on("seeOpponentCoins", (side) => {
            const opponentSocket = getOpponentSocket(currentCode, socket.id); // Helper function to get opponent socket
            if (opponentSocket) {
                const opponentCoinBalance = coinBalances[opponentSocket.id] || 0; // Get stored coin balance for opponent
                socket.emit("displayOpponentCoins", opponentCoinBalance); // Send balance to requesting player
            }
        });

        // Helper function to get the opponent's socket ID in the same room
        function getOpponentSocket(roomCode, currentSocketId) {
            const roomSockets = io.sockets.adapter.rooms.get(roomCode);
            if (roomSockets) {
                for (let socketId of roomSockets) {
                    if (socketId !== currentSocketId) return io.sockets.sockets.get(socketId);
                }
            }
            return null;
        }

        
    });
};
