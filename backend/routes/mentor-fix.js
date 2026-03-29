const express = require('express');
const router = express.Router();

// Logic deprecated
router.post('/assign-missing-mentors', (req, res) => res.json({ success: true, message: "Deprecated" }));
router.get('/status', (req, res) => res.json({ success: true, data: {} }));

module.exports = router;
