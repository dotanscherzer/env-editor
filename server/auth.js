module.exports = (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token !== process.env.EDITOR_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
