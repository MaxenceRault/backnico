import express from 'express';
import { PrismaClient } from '@prisma/client';
import transporter from '../mailer.js';
import verify from './verifyToken.js';

const router = express.Router();
const prisma = new PrismaClient();

// Envoyer une réponse à un contact
router.post('/respond/:contactId', verify, async (req, res) => {
  const { contactId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Le message de réponse est requis.' });
  }

  try {
    // Récupérer les informations du contact
    const contact = await prisma.contact.findUnique({
      where: { id: parseInt(contactId, 10) },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact introuvable.' });
    }

    // Créer une réponse dans la base de données
    const response = await prisma.response.create({
      data: {
        message,
        contactId: contact.id,
      },
    });

    // Envoyer un email au contact
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: contact.email,
      subject: `Réponse à votre message : ${contact.message}`,
      text: `Bonjour ${contact.nom},\n\n${message}\n\nCordialement,\nL'équipe Support`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Erreur lors de l\'envoi de l\'email :', err);
        return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email.' });
      }

      console.log('Email envoyé :', info.response);
      res.status(200).json({
        message: 'Réponse envoyée avec succès.',
        response,
      });
    });
  } catch (err) {
    console.error('Erreur lors de la réponse au contact :', err);
    res.status(500).json({ error: 'Erreur lors de la réponse au contact.' });
  }
});

// Récupérer tous les messages avec leurs réponses
router.get('/all', verify, async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        responses: true, // Inclure les réponses associées
      },
      orderBy: {
        createdAt: 'desc', // Trier par date de création (plus récents en premier)
      },
    });

    res.status(200).json(contacts);
  } catch (err) {
    console.error('Erreur lors de la récupération des contacts :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des contacts.' });
  }
});


export default router;
