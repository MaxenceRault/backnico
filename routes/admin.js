import express from 'express';
import { PrismaClient } from '@prisma/client';
import verify from './verifyToken.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware pour vérifier si l'utilisateur est admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès refusé : vous devez être administrateur.' });
    }

    next();
  } catch (err) {
    console.error('Erreur lors de la vérification du rôle admin :', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Récupérer tous les utilisateurs
router.get('/users', verify, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        reservations: {
          select: {
            id: true,
            date: true,
            heure: true,
          },
        },
      },
    });

    res.json(users);
  } catch (err) {
    console.error('Erreur lors de la récupération des utilisateurs :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Récupérer toutes les réservations
router.get('/reservations', verify, isAdmin, async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            email: true,
          },
        },
        slot: true, // Inclure les informations des créneaux si nécessaire
      },
    });

    res.json(reservations);
  } catch (err) {
    console.error('Erreur lors de la récupération des réservations :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des réservations' });
  }
});

export default router;
