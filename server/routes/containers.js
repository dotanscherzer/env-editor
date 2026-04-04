const express = require('express');
const router = express.Router();
const docker = require('../docker');

router.get('/', async (req, res) => {
  try {
    const containers = await docker.listContainers();
    res.json(containers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
