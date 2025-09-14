const express = require("express");
const passport = require("passport");
const session = require("express-session");
const path = require("path");
require("dotenv").config();
require("./auth/passport");

// Import route modules
const pageRoutes = require("./routes/page.routes");
const apiRoutes = require("./routes/api.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory (legacy HTML files)
app.use('/legacy', express.static(path.join(__dirname, "public")));

// Serve React build files
app.use(express.static(path.join(__dirname, "client/build")));

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
app.use("/", pageRoutes); // Page routes
app.use("/", apiRoutes); // API routes
app.use("/", authRoutes); // Authentication routes

// Debug endpoint to check environment
app.get("/debug-env", (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT SET",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET",
    callbackURL:
      process.env.NODE_ENV === "production"
        ? "https://rentsphere-hzo2.onrender.com/google/callback"
        : "http://localhost:8085/google/callback",
  });
});

// Temporary database setup endpoint (remove after first run)
app.get("/setup-database", async (req, res) => {
  try {
    const pool = require("./database");

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        profile_picture VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create phone_users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS phone_users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(25) NOT NULL,
        name VARCHAR(255) NOT NULL,
        profile_picture VARCHAR(500) DEFAULT 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create profile_info table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profile_info (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        phone VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)"
    );
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_profile_info_email ON profile_info(email)"
    );
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_profile_info_phone ON profile_info(phone)"
    );

    res.json({
      success: true,
      message:
        "Database tables created successfully! You can now remove this endpoint.",
    });
  } catch (error) {
    console.error("Database setup error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Unknown database error",
      details: error.toString(),
      stack: error.stack,
    });
  }
});

// Serve React app for specific routes (safer than catch-all)
app.get(['/', '/login', '/dashboard', '/profile'], (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const port = process.env.PORT || 8085;

app.listen(port, () => {
  console.log("RentSphere is running on port : " + port);
});
