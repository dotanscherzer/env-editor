require('dotenv').config();
const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('client'));

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
