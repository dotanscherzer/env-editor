require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { execSync } = require('child_process');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('client'));

// GitHub webhook for auto-deploy (no auth middleware — verified by HMAC)
app.post('/webhook/deploy', (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'WEBHOOK_SECRET not configured' });

  const sig = req.headers['x-hub-signature-256'] || '';
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const output = execSync('git pull origin master && npm install --production && pm2 restart env-editor', {
      cwd: process.cwd(),
      timeout: 30000,
    }).toString();
    console.log('[deploy]', output);
    res.json({ success: true, output });
  } catch (err) {
    console.error('[deploy error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Auth middleware on /api routes
app.use('/api', require('./auth'));

// Route mounts
app.use('/api/containers', require('./routes/containers'));
app.use('/api/containers', require('./routes/env'));

// Listen
const port = process.env.PORT || 4200;
app.listen(port, () => {
  console.log(`EnvEditor listening on port ${port}`);
});
