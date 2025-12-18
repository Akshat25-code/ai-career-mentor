const router = require('express').Router();
const passport = require('passport');
const db = require('../db');

// Auth with Google
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Callback route for Google to redirect to
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      // Determine redirect based on whether onboarding exists
      const { rows } = await db.query('SELECT 1 FROM onboarding_data WHERE user_id = $1', [req.user.id]);
      const hasOnboarding = rows.length > 0;
      const dest = hasOnboarding ? 'http://localhost:5173/dashboard' : 'http://localhost:5173/onboarding';
      res.redirect(dest);
    } catch (e) {
      // Fallback to dashboard on error
      res.redirect('http://localhost:5173/dashboard');
    }
  }
);

// Logout user
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('http://localhost:5173/');
  });
});

// Get current user
router.get('/current_user', (req, res) => {
  res.send(req.user);
});

module.exports = router;
