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
const messagingRoutes = require("./routes/messaging.routes");
const rentalRoutes = require("./routes/rental.routes");
const imageRoutes = require("./routes/image.routes");
const rentalRequestsRoutes = require("./routes/rental-requests.routes");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory (legacy HTML files)
app.use("/legacy", express.static(path.join(__dirname, "public")));

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve React build files
app.use(express.static(path.join(__dirname, "client/build")));

// Serve React app's static files
app.use(express.static("client/build"));

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
app.use("/", messagingRoutes); // Messaging routes
app.use("/", rentalRoutes); // Rental routes
app.use("/", imageRoutes); // Image upload routes
app.use("/", rentalRequestsRoutes); // Rental requests routes

// Debug endpoint to check environment
app.get("/debug-env", (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT SET",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET",
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN ? "SET" : "NOT SET",
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

// Setup messaging tables endpoint
app.get("/setup-messaging-tables", async (req, res) => {
  try {
    const { createMessagingTables } = require("./setup/messaging-tables");

    // Create messaging tables
    await createMessagingTables();

    res.json({
      success: true,
      message: "Messaging tables created successfully!",
    });
  } catch (error) {
    console.error("Messaging tables setup error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Unknown database error",
      details: error.toString(),
      stack: error.stack,
    });
  }
});

// Setup rental tables endpoint (NEW for deployment)
app.get("/setup-rental-tables", async (req, res) => {
  try {
    const { createRentalTables } = require("./setup/rental-tables-setup");

    // Create rental tables
    const result = await createRentalTables();

    res.json({
      success: true,
      message: "Rental tables created successfully!",
      details: result
    });
  } catch (error) {
    console.error("Rental tables setup error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Unknown database error",
      details: error.toString(),
      stack: error.stack,
    });
  }
});

// Setup rental requests tables endpoint
app.get("/setup-rental-requests", async (req, res) => {
  try {
    const pool = require("./database");
    const fs = require("fs");
    const path = require("path");

    // Read and execute the rental requests schema
    const schemaPath = path.join(__dirname, "setup", "rental-requests-schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Split by semicolon and execute each statement
    const statements = schema.split(";").filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }

    res.json({
      success: true,
      message: "Rental requests schema deployed successfully!",
      details: `Executed ${statements.length} SQL statements`
    });
  } catch (error) {
    console.error("Rental requests setup error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Unknown database error",
      details: error.toString(),
      stack: error.stack,
    });
  }
});

// Debug Google Drive setup
app.get("/debug-google-drive", async (req, res) => {
  try {
    const googleDriveService = require("./services/googleDriveService");
    
    // Check environment variables first
    const envCheck = {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN
    };
    
    const allEnvVarsSet = Object.values(envCheck).every(Boolean);
    
    if (!allEnvVarsSet) {
      return res.json({
        success: false,
        message: "Google Drive configuration incomplete",
        environmentVariables: envCheck,
        missingVars: Object.keys(envCheck).filter(key => !envCheck[key]),
        recommendations: [
          "Set missing environment variables in your deployment platform",
          "Ensure GOOGLE_REFRESH_TOKEN is obtained through OAuth flow",
          "Verify credentials are valid and not expired"
        ]
      });
    }
    
    // Force re-initialization to see current status
    await googleDriveService.initializeDrive();
    
    // Test basic connectivity
    let driveContents = [];
    let connectionError = null;
    try {
      const filesResponse = await googleDriveService.drive.files.list({
        q: "trashed=false",
        fields: 'files(id, name, mimeType, createdTime)',
        pageSize: 20
      });
      driveContents = filesResponse.data.files;
    } catch (listError) {
      console.error('Error listing drive contents:', listError);
      connectionError = listError.message;
    }
    
    res.json({
      success: !!googleDriveService.drive && !!googleDriveService.parentFolderId,
      message: "Google Drive configuration status",
      environmentVariables: envCheck,
      parentFolderId: googleDriveService.parentFolderId,
      driveInitialized: !!googleDriveService.drive,
      connectionError: connectionError,
      driveContents: driveContents,
      status: {
        setup: "OAuth-based Google Drive integration",
        visibility: "Images stored in Google Drive cloud storage",
        functionality: connectionError ? "Connection failed - check credentials" : "Ready for image uploads",
        storage: "Uses Google Drive API with OAuth authentication"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
});

// Test Google Drive configuration
app.get("/test-google-drive", async (req, res) => {
  try {
    const googleDriveService = require("./services/googleDriveService");
    const result = await googleDriveService.verifyConfiguration();
    
    if (result.success) {
      res.json({
        success: true,
        message: "Google Drive is ready for image uploads",
        configuration: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Google Drive configuration issues detected",
        error: result
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to test Google Drive configuration",
      error: error.message
    });
  }
});

// Define specific routes for React app
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.get("/messages", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.get("/messages/new", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

// Handle conversation detail routes with a regex pattern
app.get(/^\/messages\/[a-zA-Z0-9]+$/, (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

// Handle rental routes
app.get("/rentals", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.get(/^\/rentals\/[a-zA-Z0-9\s]+$/, (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.get(/^\/rental\/[0-9]+$/, (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.get("/create-listing", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.get("/edit-listing/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.get("/my-listings", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

const port = process.env.PORT || 8085;

app.listen(port, () => {
  console.log("RentSphere is running on port : " + port);
});
