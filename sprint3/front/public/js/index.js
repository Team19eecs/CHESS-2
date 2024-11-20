// Game Initialization
let gameHasStarted = false;
let board = null;
let game = new Chess();
let $status = $('#status');
let $pgn = $('#pgn');
let gameOver = false;
let costMultiplier = 1; // Initial cost multiplier (no increase)
let multiplierActive = false; // Track if multiplier is active
const coinBalances = {};

// Coin and Action Costs Setup
let coinBalance = 2000; // Starting coin balance for the player

// Update the coin balance display and emit balance update to server
function updateDisplay() {
    document.getElementById("coinBalance").innerText = `Coins: ${coinBalance}`;
    socket.emit("updateCoinBalance", coinBalance); // Emit balance update to server
}

// Function to handle action costs and trigger the corresponding socket events
function handleAction(buttonId, action, cost) {
    cost = Math.ceil(cost * costMultiplier); // Adjust cost based on multiplier

    // Check if it's the player's turn
    if ((playerColor === 'white' && game.turn() !== 'w') || (playerColor === 'black' && game.turn() !== 'b')) {
        alert("You can only perform this action on your turn!");
        return; // Exit early if it's not the player's turn
    }
    
    if (coinBalance >= cost) {
        // Deduct the cost and update the display
        coinBalance -= cost;
        updateDisplay();

        if (action === "seeOpponentCoins") {
            socket.emit("seeOpponentCoins", playerColor); // Request opponent’s coin balance
        }

        if (action === "activateMultiplier") {
            multiplierActive = true; // Activate multiplier for next capture
            socket.emit("activateMultiplier", playerColor); // Notify opponent
            alert("Multiplier activated! Your next captured piece will be worth double.");
        }

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
        } else if (action === "Rizzler") {
            const opponentPieces = [];
            const boardArray = game.board();

            // Get all opponent pieces on the board (excluding the king)
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const square = boardArray[row][col];
                    if ((square) && (square.color !== Array.from(playerColor)[0]) && (square.type !== "k")) {
                        opponentPieces.push({
                            position: `${String.fromCharCode(97 + col)}${8 - row}`, // e.g., 'e4'
                            type: square.type, // Piece type (p, r, n, b, q)
                        });
                    }
                }
            }

            // Select a random opponent piece, if any exist
            if (opponentPieces.length > 0) {
                const randomPiece = opponentPieces[Math.floor(Math.random() * opponentPieces.length)];
                socket.emit("rizzler", randomPiece, playerColor); // Send the selected piece's data to the server
            } else {
                alert("No opponent pieces available to convert!");
            }
        } else if (action === "Pray to God") {
            const validMoves = game.moves(); // Get all valid moves
            console.log("Working")
            if (validMoves.length > 0) {
                const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)]; // Select a random move
                const parsedMove = game.move(randomMove); // Apply the move locally
                board.position(game.fen()); // Update the board visually
                updateStatus(); // Update the game status
        
                // Emit the move to the server
                socket.emit("move", parsedMove);
            } else {
                alert("No valid moves available!");
            }
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

document.getElementById("Rizzler").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Rizzler").getAttribute("data-cost"));
    handleAction("Rizzler", "Rizzler", cost); // Deducts coins and emits the event to activate Rizzler
});

document.getElementById("Pray to God").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Pray to God").getAttribute("data-cost"));
    handleAction("Pray to God", "Pray to God", cost);
});

// Button Event Listeners for Actions
document.getElementById("Multiplier").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Multiplier").getAttribute("data-cost"));
    handleAction("Multiplier", "activateMultiplier", cost);
});

// Button Event Listener for "send pics" action
document.getElementById("Lemme See").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Lemme See").getAttribute("data-cost"));
    handleAction("Lemme See", "seeOpponentCoins", cost);
});

// Button Event Listener for "Mystery Box" action
document.getElementById("Mystery Box").addEventListener("click", () => {
    activateMysteryBox();
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
        let points = piecePoints[move.captured.toLowerCase()] || 0;
        if (multiplierActive) {
            points *= 2; // Double points if multiplier is active
            multiplierActive = false; // Reset multiplier after capture
        }
        coinBalance += points;
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
        status = 'Waiting for black to join...';
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

socket.on("updatePieceOwnership", ({ position, type }, side) => {
    game.remove(position); // Remove the piece from the board
    game.put({ type: type, color: Array.from(side)[0] }, position);
    board.position(game.fen());
    updateStatus();
});

// Socket event listener for receiving opponent's coin balance
socket.on("displayOpponentCoins", (opponentCoinBalance) => {
    alert(`Your opponent currently has ${opponentCoinBalance} coins.`);
});




// Define the list of abilities for the Mystery Box
const mysteryBoxAbilities = [
    "flipBoard",
    "reduceOpponentCoins",
    "russianRoulette",
    "activateMultiplier",
    "seeOpponentCoins",
    "Pray to God",
    "Rizzler",
    "gambleCoins",
    "increaseOpponentCost"

];

// Mystery Box function to randomly pick and perform an action with no additional cost
function activateMysteryBox() {

    if ((playerColor === 'white' && game.turn() !== 'w') || (playerColor === 'black' && game.turn() !== 'b')) {
        alert("You can only perform this action on your turn!");
        return; // Exit early if it's not the player's turn
    }
    
    if (coinBalance >= 1) { // Check if player has enough coins for the Mystery Box
        coinBalance -= 1; // Deduct 1 coin for using the Mystery Box
        updateDisplay(); // Update the coin balance display

        // Randomly select an ability from the list
        const randomAbility = mysteryBoxAbilities[Math.floor(Math.random() * mysteryBoxAbilities.length)];

        // Perform the selected action without any additional cost
        handleAction("Mystery Box", randomAbility, 0); // Pass 0 as the cost for free activation of the ability
        alert(`Mystery Box activated! You got the "${randomAbility}" ability.`);
    } else {
        alert("Not enough coins to use the Mystery Box!");
    }
}


