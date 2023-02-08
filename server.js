"use strict";
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const ObjectID = require("mongodb").ObjectID;
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const app = express();
const MongoStore = require("connect-mongo")(session);
const URI = process.env.MONGO_URI;
const bcrypt = require("bcrypt");

fccTesting(app); // For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "pug");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const routes = require("./routes.js");
const auth = require("./auth.js");

myDB(async (client) => {
  const myDataBase = await client.db("database").collection("users");
  routes(app, myDataBase);
  auth(app, myDataBase);
  
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });

    function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/");
  }

  app.route("/register").post(
    (req, res, next) => {
      const hash = bcrypt.hashSync(req.body.password, 12);

      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect("/");
        } else {
          myDataBase.insertOne(
            {
              username: hash,
              password: req.body.password,
            },
            (err, doc) => {
              if (err) {
                res.redirect("/");
              } else {
                // The inserted document is held within
                // the ops property of the doc
                next(null, doc.ops[0]);
              }
            }
          );
        }
      });
    },
    passport.authenticate("local", { failureRedirect: "/" }),
    (req, res, next) => {
      res.redirect("/profile");
    }
  );

  app.route("/logout").get((req, res) => {
    req.logout();
    res.redirect("/");
  });

  app.use((req, res, next) => {
    res.status(404).type("text").send("Not Found");
  });

  passport.use(
    new LocalStrategy((username, password, done) => {
      myDataBase.findOne({ username: username }, (err, user) => {
        console.log(`User ${username} attempted to log in.`);
        if (err) return done(err);
        if (!user) return done(null, false);
        if (!bcrypt.compareSync(password, user.password))
          return done(null, false);
        return done(null, user);
      });
    })
  );
}).catch((e) => {
  app.route("/").get((req, res) => {
    res.render("pug", { title: e, message: "Unable to login" });
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Listening on port " + process.env.PORT);
});
