// Track whether the game has started
let gameHasStarted = false;

// Initialize the board and game objects
var board = null;
var game = new Chess(); // Use the Chess.js library for game logic

// DOM elements for displaying status and PGN (Portable Game Notation)
var $status = $('#status');
var $pgn = $('#pgn');
let gameOver = false; // Track if the game has ended due to disconnection

// Track points for each player
let whitePoints = 0;
let blackPoints = 0;

// Define point values for different chess pieces
const piecePoints = {
  p: 1,  // Pawn
  r: 5,  // Rook
  n: 3,  // Knight
  b: 3,  // Bishop
  q: 9,  // Queen
  k: 0   // King (no points awarded for capturing)
};

// Function to handle the start of a piece drag
function onDragStart(source, piece, position, orientation) {
  // Prevent moves if the game is over or hasn't started
  if (game.game_over() || !gameHasStarted || gameOver) return false;

  // Prevent dragging opponent's pieces
  if ((playerColor === 'black' && piece.startsWith('w')) ||
      (playerColor === 'white' && piece.startsWith('b'))) {
    return false;
  }

  // Only allow moves if it is the player's turn
  if ((game.turn() === 'w' && piece.startsWith('b')) || 
      (game.turn() === 'b' && piece.startsWith('w'))) {
    return false;
  }
}

// Function to handle a piece drop event
function onDrop(source, target) {
  // Define the move object, always promoting pawns to queens for simplicity
  let theMove = {
    from: source,
    to: target,
    promotion: 'q' // Promote to a queen by default
  };

  // Make the move and check if it is legal
  var move = game.move(theMove);

  // If the move is illegal, revert the piece to its original position
  if (move === null) return 'snapback';

  // Award points if a piece was captured
  if (move.captured) {
    const pieceType = move.captured.toLowerCase(); // Normalize the piece type
    const pieceValue = piecePoints[pieceType]; // Get the piece's point value

    // Award points to the capturing player
    if (game.turn() === 'b') {
      whitePoints += pieceValue;
      $('#whitePoints').text(`White Points: ${whitePoints}`);
    } else {
      blackPoints += pieceValue;
      $('#blackPoints').text(`Black Points: ${blackPoints}`);
    }
  }

  // Emit the move to the server for synchronization
  socket.emit('move', theMove);
  updateStatus(); // Update the game status
}

// Listen for new moves from the server
socket.on('newMove', function(move) {
  game.move(move); // Apply the move
  board.position(game.fen()); // Update the board's position
  updateStatus(); // Refresh the status
});

// Handle the end of a piece drag to update the board
function onSnapEnd() {
  board.position(game.fen()); // Update the board position
}

// Update the game status displayed to the players
function updateStatus() {
  var status = '';
  var moveColor = game.turn() === 'w' ? 'White' : 'Black'; // Determine whose turn it is

  // Check for game-ending conditions
  if (game.in_checkmate()) {
    status = `Game over, ${moveColor} is in checkmate.`;
  } else if (game.in_draw()) {
    status = 'Game over, drawn position';
  } else if (gameOver) {
    status = 'Opponent disconnected, you win!';
  } else if (!gameHasStarted) {
    status = 'Waiting for black to join';
  } else {
    // Normal game state
    status = `${moveColor} to move`;
    if (game.in_check()) {
      status += `, ${moveColor} is in check`;
    }
  }

  $status.html(status); // Display the status
  $pgn.html(game.pgn()); // Display the PGN notation
}

// Configuration object for the chessboard
var config = {
  draggable: true, // Allow pieces to be dragged
  position: 'start', // Start with the standard chess position
  onDragStart: onDragStart, // Set the drag start handler
  onDrop: onDrop, // Set the drop handler
  onSnapEnd: onSnapEnd, // Set the snap end handler
  pieceTheme: '/public/img/chesspieces/wikipedia/{piece}.png' // Piece images
};

// Initialize the chessboard
board = Chessboard('myBoard', config);

// Flip the board if the player is black
if (playerColor == 'black') {
  board.flip();
}

// Update the game status on load
updateStatus();

// Check for game code in the URL and join the game if present
var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('code')) {
  socket.emit('joinGame', {
    code: urlParams.get('code')
  });
}

// Listen for the start of the game from the server
socket.on('startGame', function() {
  gameHasStarted = true;
  updateStatus(); // Update the status once the game starts
});

// Listen for game disconnection events from the server
socket.on('gameOverDisconnect', function() {
  gameOver = true; // Mark the game as over due to disconnection
  updateStatus(); // Update the status
});
