import jwt from 'jsonwebtoken';

const verify = (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Aucun token fourni.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Utilisateur vérifié :', verified); // Vérification des données utilisateur
    req.user = verified;
    next();
  } catch (err) {
    console.error('Erreur de vérification du token :', err.message);
    res.status(400).json({ error: 'Token invalide' });
  }
};

export default verify;
