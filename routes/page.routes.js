const express = require("express");
const path = require("path");
const { isLoggedIn } = require("../middleware/auth");
const router = express.Router();

// Root route
router.get("/", (req, res) => {
  if (req.user) {
    res.redirect("/dashboard");
  } else {
    res.redirect("/login");
  }
});

// These routes are now handled by React
// The React app will handle /login, /dashboard, /profile routes

// Phone verification page (now served by React)
router.get("/phone", (req, res) => {
  if (req.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

// Authentication result routes
router.get("/failed", (req, res) => {
  res.redirect("/login");
});

router.get("/success", isLoggedIn, (req, res) => {
  res.redirect("/dashboard");
});

// Logout route
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Error destroying session:", err);
    }
    res.redirect("/login");
  });
});

// Rental request pages (served by React)
router.get("/my-rental-requests", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

router.get("/my-listing-requests", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

// Other React routes
router.get("/dashboard", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

router.get("/profile", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

router.get("/rentals", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

router.get("/rentals/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

router.get("/create-listing", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

router.get("/my-listings", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

router.get("/messages", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

router.get("/messages/:id", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

router.get("/new-message", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

module.exports = router;