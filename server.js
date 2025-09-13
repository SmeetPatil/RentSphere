const express = require("express");
const passport = require("passport");
const session = require("express-session");
const path = require("path");
require("dotenv").config();
require("./auth/passport");

// Import route modules
const pageRoutes = require('./routes/page.routes');
const apiRoutes = require('./routes/api.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Create session
app.use(
  session({
    resave: false,
    secret: ["key1", "key2"],
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Use route modules
app.use("/", pageRoutes);    // Page routes
app.use("/", apiRoutes);     // API routes  
app.use("/", authRoutes);    // Authentication routes

const port = process.env.PORT;



app.listen(8085, () => {
  console.log(
    "RentSphere is running on port : " + port + " at ==> http://localhost:8085/"
  );
});
