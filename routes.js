const passport = require("passport");
const bcrypt = require("bcrypt");

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.redirect("/");
};

module.exports = function (app, myDataBase) {
  app.route("/").get((req, res) => {
    res.render("index", {
      title: "Connected to Database",
      message: "Please log in",
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true,
    });
  });

  app
    .route("/login")
    .post(
      passport.authenticate("local", { failureRedirect: "/" }),
      (req, res) => {
        return res.redirect("/profile");
      }
    );

  app.route("/profile").get(ensureAuthenticated, (req, res) => {
    return res.render("profile", { username: req.user.username });
  });

  app.route("/logout").get((req, res) => {
    req.logout();
    return res.redirect("/");
  });

  app.route("/register").post(
    (req, res, next) => {
      myDataBase.findOne({ username: req.body.username }, (err, foundUser) => {
        if (err) next(err);
        if (foundUser) return res.redirect("/");

        const hash = bcrypt.hashSync(req.body.password, 12);

        myDataBase.insertOne(
          {
            username: req.body.username,
            // password: req.body.password,
            password: hash,
          },
          (err, doc) => {
            if (err) return res.redirect("/");
            // the inserted document is held within the ops property of the doc
            next(null, doc.ops[0]);
          }
        );
      });
    },
    passport.authenticate("local", { failureRedirect: "/" }),
    (req, res) => {
      return res.redirect("/profile");
    }
  );

  app.route("/chat").get(ensureAuthenticated, (req, res) => {
    return res.render("chat", { user: req.user });
  });

  app.route("/auth/github").get(passport.authenticate("github"));

  app
    .route("/auth/github/callback")
    .get(
      passport.authenticate("github", { failureRedirect: "/" }),
      (req, res) => {
        req.session.user_id = req.user.id;
        return res.redirect("/chat");
      }
    );

  app.use((req, res, next) => {
    res.status(404).type("text").send("Not Found");
  });
};
