import express from 'express';
import { PrismaClient } from '@prisma/client';
import verify from './verifyToken.js';
import bcrypt from 'bcrypt';
import Joi from 'joi';

const router = express.Router();
const prisma = new PrismaClient();

// Schéma de validation des mises à jour de profil
const updateSchema = Joi.object({
  nom: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  motDePasse: Joi.string().min(6).optional(),
});

// Route combinée pour le tableau de bord utilisateur
router.get('/dashboard', verify, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

    const reservations = await prisma.reservation.findMany({
      where: { userId: req.user.id },
      include: { slot: true },
    });

    let adminData = {};
    if (user.role === 'ADMIN') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          nom: true,
          email: true,
          role: true,
        },
      });

      const allReservations = await prisma.reservation.findMany({
        include: {
          user: { select: { nom: true, email: true } },
          slot: true,
        },
      });

      adminData = { users, allReservations };
    }

    res.json({ user, reservations, adminData });
  } catch (err) {
    console.error('Erreur lors de la récupération du tableau de bord :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Obtenir le profil utilisateur
router.get('/profile', verify, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

    res.json(user);
  } catch (err) {
    console.error('Erreur lors de la récupération du profil :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil.' });
  }
});

// Mettre à jour le profil utilisateur
router.put('/profile', verify, async (req, res) => {
  const { nom, email, motDePasse } = req.body;

  // Validation des données
  const { error } = updateSchema.validate({ nom, email, motDePasse });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const data = {};
    if (nom) data.nom = nom;
    if (email) data.email = email;

    if (motDePasse) {
      const salt = await bcrypt.genSalt(10);
      data.motDePasse = await bcrypt.hash(motDePasse, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    res.json({
      message: 'Profil mis à jour avec succès.',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du profil :', err);
    res.status(400).json({ error: 'Erreur lors de la mise à jour du profil.' });
  }
});

// Récupérer les notifications utilisateur
router.get('/notifications', verify, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(notifications);
  } catch (err) {
    console.error('Erreur lors de la récupération des notifications :', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications.' });
  }
});

// Marquer les notifications comme lues
router.put('/notifications/read', verify, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id },
      data: { read: true },
    });

    res.json({ message: 'Toutes les notifications ont été marquées comme lues.' });
  } catch (err) {
    console.error('Erreur lors de la mise à jour des notifications :', err.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des notifications.' });
  }
});

export default router;
