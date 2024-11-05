module.exports = io => {
    
        // Add this to check all incoming events
        // socket.onAny((eventName, ...args) => {
        //     console.log(`Received event: ${eventName}`);
        // });

    io.on('connection', socket => {
        console.log('New socket connection');

        let currentCode = null;

        // Add this within the `module.exports` function in io.js
        socket.on("flipBoard", (side) => {
            socket.broadcast.to(currentCode).emit("flipBoard", side);  // Broadcast to opponent
        });

        socket.on("reduceOpponentCoins", (side) => {
            socket.broadcast.to(currentCode).emit("reduceOpponentCoins", side);  // Broadcast to opponent
        });

        
        socket.on("increaseOpponentCost", (side) => {
            socket.broadcast.to(currentCode).emit("increaseOpponentCost", side);  // Broadcast to opponent
        });

        socket.on("verifyAndRemovePiece", (position) => {
            io.to(currentCode).emit("removeRandomPiece", position); // Broadcast to both clients to remove the piece
        });
        
        
        socket.on('move', function(move) {
            console.log('move detected')

            io.to(currentCode).emit('newMove', move);
        });
        
        socket.on('joinGame', function(data) {

            currentCode = data.code;
            socket.join(currentCode);
            if (!games[currentCode]) {
                games[currentCode] = true;
                return;
            }
            
            io.to(currentCode).emit('startGame');
        });

        socket.on('disconnect', function() {
            console.log('socket disconnected');

            if (currentCode) {
                io.to(currentCode).emit('gameOverDisconnect');
                delete games[currentCode];
            }
        });

    });
};