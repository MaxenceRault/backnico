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
      include: { slot: true },
    });
    res.json(reservations);
  } catch (err) {
    console.error('Erreur lors de la récupération des réservations :', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des réservations.' });
  }
});

// Réserver un créneau
router.post('/reserve', verify, async (req, res) => {
  const { slotId, course } = req.body;

  if (!course) {
    return res.status(400).json({ error: 'Le type de cours est requis.' });
  }

  try {
    const slot = await prisma.slot.findUnique({ where: { id: slotId } });

    if (!slot) {
      return res.status(404).json({ error: 'Le créneau n\'existe pas.' });
    }

    if (slot.reserved) {
      return res.status(400).json({ error: 'Ce créneau est déjà réservé.' });
    }

    const reservation = await prisma.reservation.create({
      data: {
        date: slot.date,
        heure: slot.heure,
        userId: req.user.id,
        slotId: slot.id,
        course,
      },
    });

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
      include: { user: true }, // Inclure les détails de l'utilisateur pour la notification
    });

    if (!reservation || reservation.userId !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    // Supprimer la réservation
    await prisma.reservation.delete({ where: { id: reservationId } });

    // Réinitialiser le créneau
    await prisma.slot.update({
      where: { id: reservation.slotId },
      data: { reserved: false, userId: null },
    });

    // Ajouter une notification pour tous les administrateurs
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    const adminNotifications = admins.map((admin) => ({
      userId: admin.id,
      message: `La réservation du ${new Date(reservation.date).toLocaleDateString()} à ${reservation.heure} par ${reservation.user.nom} (${reservation.user.email}) a été annulée.`,
    }));

    if (adminNotifications.length > 0) {
      await prisma.notification.createMany({ data: adminNotifications });
    }

    res.json({ message: 'Réservation supprimée avec succès.' });
  } catch (err) {
    console.error('Erreur lors de la suppression de la réservation :', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression de la réservation.' });
  }
});
// Annuler toutes les réservations d'une journée (ADMIN)
// Annuler toutes les réservations d'une journée (ADMIN)
router.delete('/cancel-day/:date', verify, async (req, res) => {
  const { date } = req.params;

  // Vérification du rôle d'administrateur
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès refusé. Fonction réservée aux administrateurs.' });
  }

  try {
    // Convertir la chaîne de caractères en objet Date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ error: 'La date fournie est invalide.' });
    }

    // Rechercher toutes les réservations pour la date spécifiée
    const reservations = await prisma.reservation.findMany({
      where: { date: parsedDate },
      include: { user: true },
    });

    // Supprimer les réservations
    const reservationIds = reservations.map((r) => r.id);
    if (reservationIds.length > 0) {
      await prisma.reservation.deleteMany({
        where: { id: { in: reservationIds } },
      });
    }

    // Rechercher et supprimer les créneaux (slots) pour la date spécifiée
    const slotsToDelete = await prisma.slot.findMany({
      where: { date: parsedDate },
    });

    if (slotsToDelete.length > 0) {
      const slotIds = slotsToDelete.map((slot) => slot.id);
      await prisma.slot.deleteMany({
        where: { id: { in: slotIds } },
      });
    }

    // Ajouter des notifications pour les utilisateurs concernés, si des réservations existaient
    if (reservations.length > 0) {
      const notifications = reservations.map((reservation) => ({
        userId: reservation.userId,
        message: `Votre cours de ${reservation.course} prévu le ${reservation.date.toLocaleDateString()} à ${reservation.heure} a été annulé.`,
      }));

      await prisma.notification.createMany({ data: notifications });
    }

    res.json({
      message: `Annulation de la journée ${date} effectuée. ${reservations.length} réservations supprimées et ${slotsToDelete.length} créneaux supprimés.`,
    });
  } catch (err) {
    console.error('Erreur lors de l\'annulation des créneaux, réservations et notifications :', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'annulation des créneaux, réservations et notifications.' });
  }
});


export default router;
