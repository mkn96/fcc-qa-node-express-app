module.exports = function (app, myDataBase) {
 app.route("/").get((req, res) => {
    res.render("pug", {routes(app, myDataBase)
      message: "Please login",
      showLogin: true,
      showRegistration: true,
    });
  });
  
  app
    .route("/login")
    .post(
      passport.authenticate("local", { failureRedirect: "/" }),
      (req, res) => {
        res.redirect("/profile");
      }
    );

  app.route("/profile").get(ensureAuthenticated, (req, res) => {
    res.render(process.cwd() + "/views/pug/profile", {
      username: req.user.username,
    });
  });
  
};
