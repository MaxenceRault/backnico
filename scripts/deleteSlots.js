import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const deleteAllSlots = async () => {
  try {
    console.log('Suppression de tous les créneaux dans la table slot...');

    // Supprimer tous les enregistrements de la table `slot`
    const result = await prisma.slot.deleteMany();
    console.log(`${result.count} créneaux supprimés.`);
  } catch (error) {
    console.error('Erreur lors de la suppression des créneaux :', error);
  } finally {
    // Fermer la connexion Prisma
    await prisma.$disconnect();
  }
};

// Exécuter le script
deleteAllSlots();
