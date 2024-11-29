import express from 'express';
import { PrismaClient } from '@prisma/client';
import verify from './verifyToken.js';

const prisma = new PrismaClient();
const router = express.Router();

// Récupérer les réservations de l'utilisateur connecté
router.get('/user', verify, async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { userId: req.user.id },
      include: { slot: true }, // Inclure les informations du slot réservé
    });
    res.json(reservations);
  } catch (err) {
    console.error('Erreur lors de la récupération des réservations :', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des réservations.' });
  }
});

// Réserver un créneau
router.post('/reserve', verify, async (req, res) => {
  const { slotId } = req.body;

  try {
    console.log(`Tentative de réservation pour le créneau ID : ${slotId}, utilisateur : ${req.user.id}`);

    const slot = await prisma.slot.findUnique({ where: { id: slotId } });

    if (!slot) {
      return res.status(404).json({ error: 'Le créneau n\'existe pas.' });
    }

    if (slot.reserved) {
      return res.status(400).json({ error: 'Ce créneau est déjà réservé.' });
    }

    // Créer la réservation
    const reservation = await prisma.reservation.create({
      data: {
        date: slot.date,
        heure: slot.heure,
        userId: req.user.id,
        slotId: slot.id,
      },
    });

    // Mettre à jour le créneau pour le marquer comme réservé
    await prisma.slot.update({
      where: { id: slotId },
      data: { reserved: true, userId: req.user.id },
    });

    res.json({ message: 'Réservation réussie', reservation });
  } catch (err) {
    console.error('Erreur lors de la réservation :', err.message);
    res.status(500).json({ error: 'Erreur lors de la réservation.' });
  }
});

// Supprimer une réservation
router.delete('/delete/:id', verify, async (req, res) => {
  const reservationId = parseInt(req.params.id, 10);

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation || reservation.userId !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    await prisma.reservation.delete({ where: { id: reservationId } });

    await prisma.slot.update({
      where: { id: reservation.slotId },
      data: { reserved: false, userId: null },
    });

    res.json({ message: 'Réservation supprimée avec succès.' });
  } catch (err) {
    console.error('Erreur lors de la suppression de la réservation :', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression de la réservation.' });
  }
});

export default router;
