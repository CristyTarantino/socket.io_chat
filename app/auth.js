const session = require("express-session");
const mongoose = require("mongoose");
const passport = require("passport");
const GitHubStrategy = require("passport-github").Strategy;

// define Schema
const Schema = mongoose.Schema;

var UserSchema = new Schema({
  id: String,
  name: String,
  photo: String,
  email: String,
  created_on: Date,
  provider: String,
  last_login: String,
  login_count: Number
});

// compile schema to model
var SocialUser = mongoose.model("SocialUsers", UserSchema);

module.exports = function(app, User, db) {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    SocialUser.findOne({id}, (err, doc) => err ? done(err, null) : done(null, doc));
  });

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL:
          "https://juvenile-liberating-grape.glitch.me/auth/github/callback"
      },
      (accessToken, refreshToken, profile, callback) => {
        SocialUser.findOneAndUpdate(
          { id: profile.id },
          {
            $setOnInsert: {
              id: profile.id,
              name: profile.displayName || "Anonymous",
              photo: profile.photos[0].value || "",
              email: profile.emails[0].value || "No public email",
              created_on: new Date(),
              provider: profile.provider || ""
            },
            $set: {
              last_login: new Date()
            },
            $inc: {
              login_count: 1
            }
          },
          { upsert: true, new: true, useFindAndModify: false }, //Insert object if not found, Return new object after modify
          (err, doc) => (err ? callback(err, null) : callback(null, doc))
        );
      }
    )
  );
};
