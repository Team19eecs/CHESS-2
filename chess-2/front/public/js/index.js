// Game Initialization
let gameHasStarted = false;
let board = null;
let game = new Chess();
let $status = $('#status');
let $pgn = $('#pgn');
let gameOver = false;
let costMultiplier = 1; // Initial cost multiplier (no increase)

// Coin and Action Costs Setup
let coinBalance = 20; // Starting coin balance for the player

// Function to update the displayed coin balance
function updateDisplay() {
    document.getElementById("coinBalance").innerText = `Coins: ${coinBalance}`;
}

// Function to handle action costs and trigger the corresponding socket events
function handleAction(buttonId, action, cost) {
    cost = Math.ceil(cost * costMultiplier); // Adjust cost based on multiplier
    if (coinBalance >= cost) {
        // Deduct the cost and update the display
        coinBalance -= cost;
        updateDisplay();

        // Perform the selected action
        if (action === "flipBoard") {
            socket.emit("flipBoard", playerColor);
        } else if (action === "reduceOpponentCoins") {
            socket.emit("reduceOpponentCoins", playerColor);
        } else if (action === "russianRoulette") {
            // Find all non-king pieces and remove a random one
            const pieces = [];
            const boardArray = game.board();

            boardArray.forEach((row, rowIndex) => {
                row.forEach((square, colIndex) => {
                    if (square && square.type !== "k") {
                        pieces.push({ position: `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`, type: square.type });
                    }
                });
            });

            if (pieces.length > 0) {
                const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
                socket.emit("verifyAndRemovePiece", randomPiece.position); // Send piece position to server
            }
        } else if (action === "increaseOpponentCost") {
            socket.emit("increaseOpponentCost", playerColor);
        } else if (action === "gambleCoins") {
            coinBalance = Math.random() > 0.5 ? (coinBalance + cost) * 2 : 0;
            updateDisplay();
        }
    } else {
        alert("Not enough coins for this action!");
    }
}

// Button Event Listeners for Actions
document.getElementById("Flip Board").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Flip Board").getAttribute("data-cost"));
    handleAction("Flip Board", "flipBoard", cost);
});

document.getElementById("Im Suckin It").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Im Suckin It").getAttribute("data-cost"));
    handleAction("Im Suckin It", "reduceOpponentCoins", cost);
});

document.getElementById("Inflation").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Inflation").getAttribute("data-cost"));
    handleAction("Inflation", "increaseOpponentCost", cost);
});

document.getElementById("Double or Nothing").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Double or Nothing").getAttribute("data-cost"));
    handleAction("Double or Nothing", "gambleCoins", cost);
});

document.getElementById("Russian Roulette").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Russian Roulette").getAttribute("data-cost"));
    handleAction("Russian Roulette", "russianRoulette", cost);
});

updateDisplay(); // Initialize coin balance display

// Chess Board Configuration and Functions
function onDragStart(source, piece) {
    // Prevent movement if game is over or if it's the opponent's turn
    if (game.game_over() || !gameHasStarted || gameOver) return false;
    if ((playerColor === 'black' && piece.search(/^w/) !== -1) || (playerColor === 'white' && piece.search(/^b/) !== -1)) {
        return false;
    }
    return game.turn() === piece[0].toLowerCase(); // Allow movement only for current turn's color
}

function onDrop(source, target) {
    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback'; // Revert if move is illegal

    // Award points for capturing a piece based on its type
    const piecePoints = { p: 1, r: 5, n: 3, b: 3, q: 9 };
    if (move.captured) {
        coinBalance += piecePoints[move.captured.toLowerCase()] || 0;
        updateDisplay();
    }

    socket.emit('move', move); // Emit move to server
    updateStatus(); // Update game status
}

socket.on('newMove', function(move) {
    game.move(move);
    board.position(game.fen());
    updateStatus();
});

function onSnapEnd() {
    board.position(game.fen()); // Ensure board sync after each move
}

// Game Status Updates
function updateStatus() {
    let status;
    if (game.in_checkmate()) {
        status = `Game over, ${game.turn() === 'w' ? 'Black' : 'White'} is in checkmate.`;
    } else if (game.in_draw()) {
        status = 'Game over, drawn position';
    } else if (gameOver) {
        status = 'Opponent disconnected, you win!';
    } else if (!gameHasStarted) {
        status = 'Waiting for black to join';
    } else {
        status = `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
        if (game.in_check()) status += ', in check';
    }
    $status.html(status);
    $pgn.html(game.pgn());
}

// Configure and Initialize Chessboard
const config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: '/public/img/chesspieces/wikipedia/{piece}.png'
};
board = Chessboard('myBoard', config);
if (playerColor === 'black') board.flip();

updateStatus(); // Initial status display

// Handle Game Join
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('code')) {
    socket.emit('joinGame', { code: urlParams.get('code') });
}

socket.on('startGame', () => {
    gameHasStarted = true;
    updateStatus();
});

socket.on('gameOverDisconnect', () => {
    gameOver = true;
    updateStatus();
});

// Socket Event Listeners for Actions
socket.on('flipBoard', side => {
    if (playerColor !== side) board.flip();
});

socket.on('increaseOpponentCost', side => {
    if (playerColor !== side) {
       costMultiplier *= 1.2; // Increase cost multiplier by 20%
       updateButtonTextWithCost();
    }
});

socket.on('reduceOpponentCoins', side => {
    if (playerColor !== side) {
        coinBalance = Math.floor(coinBalance / 2);
        updateDisplay();
    }
});

socket.on("removeRandomPiece", position => {
    game.remove(position); // Remove the piece from the board
    board.position(game.fen());
    updateStatus();
});
