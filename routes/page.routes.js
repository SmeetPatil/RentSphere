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

// Phone verification page
router.get("/phone", (req, res) => {
  if (req.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "..", "public", "phone.html"));
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

module.exports = router;