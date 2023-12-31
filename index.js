const express = require('express'),
morgan = require('morgan'),
fs = require('fs'),
path = require('path'),
uuid = require('uuid'),
mongoose = require('mongoose'),
bodyParser = require('body-parser'),
Models = require('./models.js'),
Songs = Models.Song,
Users = Models.User
;

const app = express();

mongoose.connect('mongodb://localhost:27017/CFdbHarmonicks', {useNewUrlParser: true, useUnifiedTopology: true});

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'})

app.use(morgan('common'));
app.use(express.static('public'));
app.use(express.json());
app.use(bodyParser.urlencoded ({extended: true}));
app.use(bodyParser.json());
app.use(morgan('combined', {stream: accessLogStream}));
let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

const jsonParse = bodyParser.json() 

//Get all Users
app.get('/users', passport.authenticate('jwt', {session: false}), async (req, res) => {
    await Users.find()
        .then((users) => {
            res.status(200).json(users);
        })
    .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});

//Get USER by Name
app.get('/users/:Username', passport.authenticate('jwt', {session:false}), async (req, res) => {
    await Users.findOne({Username: req.params.Username})
        .then((user) => {
            res.json(user);
        })
    .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});

//Get ALL SONGS
app.get('/songs', passport.authenticate('jwt', {session: false}), async (req, res) => {
    await Songs.find()
        .then((songs) => {
            res.status(200).json(songs);
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('Error: ' + err);
        });
});

//Get SONG by title
app.get('/songs/:Title', passport.authenticate('jwt', {session: false}), async (req, res) => {
    await Songs.findOne({Title: req.params.Title})
        .then((song) => {
            res.status(200).json(song);
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('Error: ' + err);
        });
});

//Get GENRE by title
app.get('/songs/genre/:genreName', passport.authenticate('jwt', {session: false}), async (req, res) => {
    await Songs.findOne({ 'Genre.Name': req.params.genreName})
        .then((song) => {
            res.status(200).json(song.Genre);
        })
        .catch ((err) => {
            console.error(err);
            res.status(500).send('Error: ' + err);
        });
});

//Get ARTIST by Name
app.get('/songs/artist/:artistName', passport.authenticate('jwt', {session: false}), async (req, res) => {
    await Songs.findOne({'Artist.Name': req.params.artistName})
        .then((song) => {
            res.status(200).json(song.Artist);
        })
        .catch ((err) => {
            console.error(err); 
            res.status(500).send('Error: ' + err);
        });
});

//Create New User
app.post('/users', async (req, res) => {
    await Users.findOne({Username: req.body.Username})
        .then((user) => {
            if(user) {
                return res.status(400).send(req.body.Username + ' already exists.');
            } else {
                Users
                    .create({
                            Username: req.body.Username, 
                            Password: req.body.Password, 
                            Email: req.body.Email, 
                            Birthday: req.body.Birthday
                        })
                    .then((user) => {res.status(201).json(user) })
                .catch((error) => {
                    console.error(error);
                    res.status(500).send('Error: ' + error);
                })
            }
        })
        .catch((error) => {
            console.error(error);
            res.status(500).send('Error: ' + error);
        });
});

//Update a User's Info
app.put('/users/:Username', passport.authenticate('jwt', {session: false}), async (req, res) => {
    if(req.user.Username !== req.params.Username){
        return res.status(400).send('Permission Denied.');
    }
    await Users.findOneAndUpdate({Username: req.params.Username}, { 
        $set: 
            {
                Username: req.body.Username,
                Password: req.body.Password,
                Email: req.body.Email,
                Birthday: req.body.Birthday
            }        
    },
    {new: true})
    .then((updatedUser) => {
        res.json(updatedUser);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});

//Add a Song to a User's Favorites
app.post('/users/:Username/songs/:SongID', passport.authenticate('jwt', {session: false}), async (req, res) => {
    if(req.user.Username !== req.params.Username){
        return res.status(400).send('Permission Denied.');
    }
    await Users.findOneAndUpdate({Username: req.params.Username}, {
        $push: {Favorites: req.params.SongID}
    },
    {new: true})
    .then((updatedFavorites) => {
        res.json(updatedFavorites);
    }) 
    .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});

//Remove a Song from a User's Favorites
app.delete('/users/:Username/songs/:SongID', passport.authenticate('jwt', {session: false}), async (req, res) => {
    if(req.user.Username !== req.params.Username){
        return res.status(400).send('Permission Denied.');
    }
    await Users.findOneAndUpdate({Username: req.params.Username}, {
        $pull: {Favorites: req.params.SongID}
    }, 
    {new: true})
    .then((updatedFavorites) => {
        res.json(updatedFavorites);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});

//Remove a User from the Database
app.delete('/users/:Username', passport.authenticate('jwt', {session: false}), async (req, res) => {
    if(req.user.Username !== req.params.Username){
        return res.status(400).send('Permission Denied.');
    }
    await Users.findOneAndDelete({Username: req.params.Username})
        .then ((user) => {
            if(!user){
                res.status(400).send(req.params.Username + ' was not found.');
            } else {
                res.status(200).send(req.params.Username + ' was deleted.');
            }
        })
        .catch ((err) => {
            console.error(err);
            res.status(500).send('Error: ' + err);
        });
});

app.get('/', (req, res) => {
    res.send('Welcome to Harmonicks, where you can keep track of your favorite tunes!');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Oops, something broke!');
});

app.listen(8080, () => {
    console.log('This app is listening on port 8080');
});