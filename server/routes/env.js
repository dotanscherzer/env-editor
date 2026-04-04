const express = require('express');
const router = express.Router();
const docker = require('../docker');

router.get('/:id/env', async (req, res) => {
  try {
    const containers = await docker.listContainers();
    const container = containers.find((c) => c.id === req.params.id);
    if (!container || !container.envPath) {
      return res.status(404).json({ error: 'Container or .env not found' });
    }
    const { vars, raw } = await docker.readEnv(req.params.id, container.envPath);
    res.json({ id: container.id, name: container.name, envPath: container.envPath, vars, raw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/env', async (req, res) => {
  try {
    if (!req.body.vars || !Array.isArray(req.body.vars)) {
      return res.status(400).json({ error: 'Body must contain a vars array' });
    }
    const containers = await docker.listContainers();
    const container = containers.find((c) => c.id === req.params.id);
    if (!container || !container.envPath) {
      return res.status(404).json({ error: 'Container or .env not found' });
    }
    const result = await docker.writeEnv(req.params.id, container.envPath, req.body.vars);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/restart', async (req, res) => {
  try {
    const result = await docker.restartContainer(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
