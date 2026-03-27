const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

// Signup
router.post('/signup', async (req, res) => {
  const { name, email, password, role, company, carrierName } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, company, carrierName }
    });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'gocomet_secret', { expiresIn: '7d' });
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'gocomet_secret', { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
