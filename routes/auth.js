import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Inscription
router.post('/register', async (req, res) => {
  const { nom, email, motDePasse } = req.body;

  if (!nom || !email || !motDePasse) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    // Vérifie si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet utilisateur existe déjà' });
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(motDePasse, 10);

    // Détermine le rôle : premier utilisateur devient ADMIN
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? Role.ADMIN : Role.USER;

    // Crée l'utilisateur dans la base de données
    const user = await prisma.user.create({
      data: {
        nom,
        email,
        motDePasse: hashedPassword,
        role,
      },
    });

    // Génère un token JWT
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(201).json({
      token,
      message: 'Utilisateur enregistré avec succès',
    });
  } catch (err) {
    console.error('Erreur lors de l\'inscription:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    // Recherche l'utilisateur dans la base de données
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifie le mot de passe
    const validPassword = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!validPassword) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Génère un token JWT
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).json({
      token,
      message: 'Connexion réussie',
    });
  } catch (err) {
    console.error('Erreur lors de la connexion:', err.message);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

export default router;
