import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import session from 'express-session';
import { PrismaClient } from '@prisma/client';

import authRoute from './routes/auth.js';
import reservationRoute from './routes/reservation.js';
import contactRoute from './routes/contact.js';
import userRoute from './routes/user.js';
import slotsRoute from './routes/slots.js';
import adminRoute from './routes/admin.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware de CORS
const allowedOrigins = [
  'http://localhost:3000',
  'https://nikoguitar-848d8.web.app',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS Error: Origin ${origin} not allowed.`);
      callback(new Error('CORS Error: Origin not allowed.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Compression des réponses
app.use(compression());

// Middleware pour JSON
app.use(express.json());

// Middleware pour sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Connexion à la base de données Prisma
prisma.$connect()
  .then(() => console.log('Base de données connectée'))
  .catch((err) => console.error('Erreur de connexion à la base de données:', err));

// Routes
app.use('/api/auth', authRoute);
app.use('/api/user', userRoute);
app.use('/api/reservation', reservationRoute);
app.use('/api/contact', contactRoute);
app.use('/api/slots', slotsRoute);
app.use('/api/admin', adminRoute);

// Vérification de la santé du serveur
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// Middleware global de gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur :', err.message);
  res.status(500).json({ error: 'Une erreur est survenue sur le serveur.' });
});

// Gestion de la déconnexion Prisma lors de l'arrêt du serveur
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Déconnexion de Prisma réussie');
  process.exit(0);
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
