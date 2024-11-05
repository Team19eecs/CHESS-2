
let gameHasStarted = false;
var board = null
var game = new Chess()
var $status = $('#status')
var $pgn = $('#pgn')
let gameOver = false;
let costMultiplier = 1; // Start with a cost multiplier of 1 (no increase)

// Coin Stuff

let coinBalance = 20; // Initial coin balance for the player

// Function to update the coin balance display
function updateDisplay() {
    document.getElementById("coinBalance").innerText = `Coins: ${coinBalance}`;
}

// Helper function to handle action costs
function handleAction(buttonId, action, cost) {
    console.log(costMultiplier)
    cost = Math.ceil(cost * costMultiplier)
    if (coinBalance >= cost) {
        // Deduct the cost and perform the action
        coinBalance -= cost;
        updateDisplay();

        if (action == "flipBoard") {
            socket.emit("flipBoard", playerColor);
        }

        if (action == "reduceOpponentCoins") {
            socket.emit("reduceOpponentCoins", playerColor);
            console.log("sent")
        }

        if (action === "russianRoulette") {
            // Get all positions of non-king pieces
            const pieces = [];
            const boardArray = game.board();

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const square = boardArray[row][col];
                    if (square && square.type !== "k") { // Exclude kings
                        pieces.push({ position: `${String.fromCharCode(97 + col)}${8 - row}`, type: square.type });
                    }
                }
            }

            // Select a random piece to remove, if available
            if (pieces.length > 0) {
                const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
                socket.emit("verifyAndRemovePiece", randomPiece.position); // Send selected piece position to the server
            }
        }        
        
        if (action == "increaseOpponentCost") {
            socket.emit("increaseOpponentCost", playerColor);
            console.log("sent")
        }

        if (action == "gambleCoins") {
            chance = Math.random()
            if (chance > 0.4999) {
                coinBalance += cost
                coinBalance *= 2
            } else {
                coinBalance = 0
            }
            updateDisplay();
        }

    } else {
        alert("Not enough coins for this action!");
    }
}

// Action for Flip Board
document.getElementById("Flip Board").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Flip Board").getAttribute("data-cost"));
    handleAction("Flip Board", "flipBoard", cost);
});

// Action for I'm Suckin' It (reduce opponent's coins by half)
document.getElementById("Im Suckin It").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Im Suckin It").getAttribute("data-cost"));
    handleAction("Im Suckin It", "reduceOpponentCoins", cost);
});

// Action for Inflation (increase opponent's cost by 25%)
document.getElementById("Inflation").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Inflation").getAttribute("data-cost"));
    handleAction("Inflation", "increaseOpponentCost", cost);
});

// Action for Double or Nothing (gamble to double or halve coins)
document.getElementById("Double or Nothing").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Double or Nothing").getAttribute("data-cost"));
    handleAction("Double or Nothing", "gambleCoins", cost);
});

// Action for Russian Roulette
document.getElementById("Russian Roulette").addEventListener("click", () => {
    const cost = parseInt(document.getElementById("Russian Roulette").getAttribute("data-cost"));
    handleAction("Russian Roulette", "russianRoulette", cost);
});


// Initial display update
updateDisplay();


// End of Coin Stuff


function onDragStart (source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false
    if (!gameHasStarted) return false;
    if (gameOver) return false;

    if ((playerColor === 'black' && piece.search(/^w/) !== -1) || (playerColor === 'white' && piece.search(/^b/) !== -1)) {
        return false;
    }

    // only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false
    }
}

function onDrop (source, target) {
    let theMove = {
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for simplicity
    };
    // see if the move is legal
    var move = game.move(theMove);


    // illegal move
    if (move === null) return 'snapback'

    // Award points if a piece was captured

    // Define point values for different chess pieces
        const piecePoints = {
            p: 1,  // Pawn
            r: 5,  // Rook
            n: 3,  // Knight
            b: 3,  // Bishop
            q: 9,  // Queen
            k: 0   // King (no points awarded for capturing)
        };
    
    if (move.captured) {
        const pieceType = move.captured.toLowerCase(); // Normalize the piece type
        const pieceValue = piecePoints[pieceType]; // Get the piece's point value
        console.log("captured", move.captured, pieceValue)

        // Award points to the capturing player
        coinBalance += pieceValue
        updateDisplay()
    }

    // Emit to server
    socket.emit('move', theMove);

    updateStatus()
}

socket.on('newMove', function(move) {
    game.move(move);
    board.position(game.fen());
    updateStatus();
});

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd () {
    board.position(game.fen())
}

function updateStatus () {
    var status = ''

    var moveColor = 'White'
    if (game.turn() === 'b') {
        moveColor = 'Black'
    }

    // checkmate?
    if (game.in_checkmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.'
    }

    // draw?
    else if (game.in_draw()) {
        status = 'Game over, drawn position'
    }

    else if (gameOver) {
        status = 'Opponent disconnected, you win!'
    }

    else if (!gameHasStarted) {
        status = 'Waiting for black to join'
    }

    // game still on
    else {
        status = moveColor + ' to move'

        // check?
        if (game.in_check()) {
            status += ', ' + moveColor + ' is in check'
        }
        
    }

    $status.html(status)
    $pgn.html(game.pgn())
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: '/public/img/chesspieces/wikipedia/{piece}.png'
}
board = Chessboard('myBoard', config)
if (playerColor == 'black') {
    board.flip();
}

updateStatus()

var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('code')) {
    socket.emit('joinGame', {
        code: urlParams.get('code')
    });
}

socket.on('startGame', function() {
    gameHasStarted = true;
    updateStatus()
});

socket.on('gameOverDisconnect', function() {
    gameOver = true;
    updateStatus()
});


// Listens

socket.on('flipBoard', side => {
    console.log(side)
    if (playerColor !== side) {
        board.flip();
    }
});


socket.on('increaseOpponentCost', side => {
    if (playerColor !== side) {
       costMultiplier *= 1.2; // Increase cost multiplier by 20%
       updateButtonTextWithCost(); // Refresh button text with updated costs
    }
});

socket.on('reduceOpponentCoins', side => {
    if (playerColor !== side) {
        console.log("it works until now")
        console.log(coinBalance, coinBalance / 2)
        coinBalance = Math.floor(coinBalance/2);
        
        console.log(coinBalance)
        updateDisplay()
    }
});

// Listen for the "removeRandomPiece" event from the server
socket.on("removeRandomPiece", (position) => {
    game.remove(position); // Remove the piece from the game logic
    board.position(game.fen()); // Update the board display
    updateStatus(); // Refresh the game status
});
