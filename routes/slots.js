import express from 'express';
import { PrismaClient } from '@prisma/client';
import verify from './verifyToken.js';

const prisma = new PrismaClient();
const router = express.Router();

// Récupérer tous les créneaux
router.get('/all', verify, async (req, res) => {
  try {
    const slots = await prisma.slot.findMany({
      orderBy: { date: 'asc' },
    });
    res.json(slots);
  } catch (err) {
    console.error('Erreur lors de la récupération des créneaux :', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des créneaux.' });
  }
});

// Récupérer les créneaux disponibles
router.get('/available', verify, async (req, res) => {
  try {
    const availableSlots = await prisma.slot.findMany({
      where: { reserved: false },
      orderBy: { date: 'asc' },
    });
    res.json(availableSlots);
  } catch (err) {
    console.error('Erreur lors de la récupération des créneaux disponibles :', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des créneaux disponibles.' });
  }
});

// Ajouter un créneau
router.post('/add', verify, async (req, res) => {
  const { date, heure } = req.body;

  try {
    const newSlot = await prisma.slot.create({
      data: {
        date: new Date(date),
        heure,
        reserved: false,
      },
    });
    res.json(newSlot);
  } catch (err) {
    console.error('Erreur lors de l\'ajout d\'un créneau :', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'ajout d\'un créneau.' });
  }
});

export default router;
