// Exporting a function that takes the Express app as an argument
module.exports = app => {

    // Route handler for the home page ('/')
    app.get('/', (req, res) => {
        res.render('index'); // Render the 'index' view
    });

    // Route for starting a game as the 'white' player
    app.get('/white', (req, res) => {
        res.render('game', {
            color: 'white' // Pass the 'white' color to the game view
        });
    });

    // Route for joining a game as the 'black' player
    app.get('/black', (req, res) => {
        // Redirect to the home page if the game code is invalid or missing
        if (!games[req.query.code]) {
            return res.redirect('/?error=invalidCode');
        }

        // Render the game view with the 'black' color
        res.render('game', {
            color: 'black'
        });
    });
};
