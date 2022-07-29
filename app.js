//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
	email: String,
	password: String,
	googleId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {
// 	secret: process.env.SECRET,
// 	encryptedFields: ["password"],
// });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
	done(null, user.id);
});

passport.deserializeUser(function (id, done) {
	User.findById(id, function (err, user) {
		done(err, user);
	});
});

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.CLIENT_ID,
			clientSecret: process.env.CLIENT_SECRET,
			callbackURL: "http://localhost:3000/auth/google/secrets",
			passReqToCallback: true,
            // userProfileUrl: "https://www.googleapis/oauth2/v3/userinfo"
		},
		function (request, accessToken, refreshToken, profile, done) {
			User.findOrCreate({ googleId: profile.id }, function (err, user) {
				return done(err, user);
			});
		}
	)
);


app.get("/", (req, res) => {
    res.render("home")
});

app.get(
	"/auth/google",
	passport.authenticate("google", { scope: ["profile"] })
);

app.get(
	"/auth/google/secrets",
	passport.authenticate("google", {
		successRedirect: "/secrets",
		failureRedirect: "/login",
	})
);


app.get("/login", (req, res) => {
	res.render("login");
});

app.get("/register", (req, res) => {
	res.render("register");
});

app.get("/secrets", (req, res) => {
    if(req.isAuthenticated){
        res.render("secrets");
    }else{
        res.redirect("/login");
    }
});

app.get("/logout", (req, res) => {
	req.logout((err) =>  {
		if (err) {
			console.log(err);
		}
		res.redirect("/");
	});
});

app.post("/register", (req, res) => {

    User.register({username: req.body.username}, req.body.password, (err, user) => {
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });

    // bcrypt.hash(req.body.password, saltRounds, (err, hash) => {

    //     const newUser = User({
    //         email: req.body.username,
    //         password: hash,
    //     });

    //     newUser.save((err) => {
    //         if (err) {
    //             console.log(err);
    //         } else {
    //             res.render("secrets");
    //         }
    //     });
        
	// });

});


app.post("/login", (req, res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err) => {
        if (err) {
			console.log(err);
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });

    // const username = req.body.username
    // const password = req.body.password

    // User.findOne({email: username}, (err, foundUser) => {
    //     if(err){
    //         console.log(err);
    //     }else{
    //         if(foundUser){
    //             bcrypt.compare(password,foundUser.password, (err, result) => {
    //                 if(result == true){
    //                     res.render("secrets");
    //                 }else{
    //                     res.send("You entered an incorrect password");
    //                 }
	// 			});
    //         }else{
    //             res.send("User doesn't exist");
    //         }
    //     }
    // });
});


app.listen(3000, () => {
    console.log("Server started on port 3000");
});