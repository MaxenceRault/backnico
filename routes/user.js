import express from 'express';
import { PrismaClient } from '@prisma/client';
import verify from './verifyToken.js';
import multer from 'multer';
import bcrypt from 'bcrypt';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer(); // Pas besoin de stockage sur disque, on travaille avec des données en mémoire

// Obtenir le profil utilisateur
router.get('/profile', verify, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Convertir la photo en Base64 si elle existe
    const photoBase64 = user.photo
      ? `data:image/png;base64,${user.photo.toString('base64')}`
      : null;

    // Envoyer les informations utilisateur, y compris la photo
    res.json({
      id: user.id,
      nom: user.nom,
      email: user.email,
      role: user.role,
      photo: photoBase64,
    });
  } catch (err) {
    console.error('Erreur lors de la récupération du profil :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

// Mettre à jour le profil utilisateur
router.put('/profile', verify, upload.single('photo'), async (req, res) => {
  const { nom, email, motDePasse } = req.body;
  const photo = req.file ? req.file.buffer : undefined; // Lecture des données en binaire

  try {
    // Construire l'objet `data` avec les champs fournis
    const data = {};
    if (nom) data.nom = nom;
    if (email) data.email = email;
    if (photo) data.photo = photo;

    if (motDePasse) {
      // Hash le mot de passe si un nouveau mot de passe est fourni
      const salt = await bcrypt.genSalt(10);
      data.motDePasse = await bcrypt.hash(motDePasse, salt);
    }

    // Mettre à jour l'utilisateur dans la base de données
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    // Retourner les informations mises à jour
    res.json({
      id: updatedUser.id,
      nom: updatedUser.nom,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du profil :', err);
    res.status(400).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

export default router;
