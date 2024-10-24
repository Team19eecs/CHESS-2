## CHESS-2

# Installation:

1. After downloading the folder, open your terminal and navigate to the `chess-2` directory.
2. Run the following commands in the terminal:

   npm install
   node server/server.js

3. Open a web browser and navigate to `http://localhost:3037` on two different tabs or computers.

# How to Play:

1. Player 1:
   - Enter a code in the "Game Code" input box.
   - Click "Create Game" to start the game.

2. Player 2:
   - Enter the same code as Player 1.
   - Click "Join Game" to enter the room.

3. Both players will be placed in a shared game room, where they can play Chess-2 against each other.

# Game Features

- Point System: 
  - Players start with 0 points and earn points by capturing their opponent's pieces (Pawns = 1 point, Knights = 3 points, etc.).
  - **NOTE**: Players currently start with 20 points for testing purposes. As soon as they capture a piece, their points go to 0 + however many points the piece they captured was worth.
  
- In-Game Shop: 
  - Players can spend points in the shop to buy new pieces or abilities during the game.
  - Cards are available for purchase (e.g., "Extra Pawn," "Extra Knight") and can be added to the board when enough points are accumulated.

- Real-Time Updates:
  - Moves are updated in real-time for both players in the game room.
  - The chessboard updates and switches turns seamlessly.
