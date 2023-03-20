// Import required modules
const express = require('express');
const User = require('./models/user');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const InstagramStrategy = require('passport-instagram').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Express app setup
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Facebook OAuth
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'email']
  },
  (accessToken, refreshToken, profile, done) => {
    console.log('Facebook accessToken:', accessToken);
    console.log('Facebook profile:', profile);
    return done(null, profile);
  }
));

// Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // Save user information to MongoDB and return the user
    console.log('Google accessToken:', accessToken);
    return done(null, profile);
  }
));
/*
// Instagram OAuth
passport.use(new InstagramStrategy({
    clientID: INSTAGRAM_CLIENT_ID,
    clientSecret: INSTAGRAM_CLIENT_SECRET,
    callbackURL: "/auth/instagram/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ instagramId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));
*/

// GitHub OAuth
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback',
    scope: ['user:email'] // Add this line to request the user's email
  },
  async (accessToken, refreshToken, profile, done) => {
    console.log('GitHub accessToken:', accessToken);
    console.log('GitHub profile:', profile);

    try {
      const existingUser = await User.findOne({ provider: 'github', providerId: profile.id });

      if (existingUser) {
        return done(null, existingUser);
      }

      const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : '';

      const newUser = new User({
        provider: 'github',
        providerId: profile.id,
        displayName: profile.displayName,
        email: email,
        accessToken: accessToken
      });

      await newUser.save();
      return done(null, newUser);
    } catch (error) {
      console.error('Error saving user:', error);
      return done(error, null);
    }
  }
));



// Routes

app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback', (req, res, next) => {
    passport.authenticate('facebook', (err, user, info) => {
      console.log('Callback invoked');
      if (err) {
        console.error('Error in passport.authenticate:', err);
        return res.redirect('/login');
      }
  
      if (!user) {
        console.error('No user returned from passport.authenticate');
        return res.redirect('/login');
      }
  
      req.logIn(user, (err) => {
        if (err) {
          console.error('Error in req.logIn:', err);
          return res.redirect('/login');
        }
  
        res.redirect('/profile');
      });
    })(req, res, next);
  });

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/');
});

app.get('/auth/instagram', passport.authenticate('instagram'));
app.get('/auth/instagram/callback', passport.authenticate('instagram', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/');
});

app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/');
});

app.get('/login', (req, res) => {
  res.send('<h1>Login</h1><a href="/auth/facebook">Login with Facebook</a><br><a href="/auth/google">Login with Google</a><br><a href="/auth/instagram">Login with instagram</a><br><a href="/auth/github">Login with GitHub</a>');
});

app.get('/', (req, res) => {
  res.send('<h1>Home</h1><a href="/login">Login</a>');
});

app.get('/profile', (req, res) => {
    if (!req.user) {
      res.redirect('/login');
      return;
    }
  
    res.send(`<h1>Profile</h1><pre>${JSON.stringify(req.user, null, 2)}</pre><br><a href="/logout">Logout</a>`);
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});
  

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
