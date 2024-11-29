import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const addSlots = async () => {
  const startDate = new Date('2024-11-18');
  const endDate = new Date('2025-12-31');
  const timeSlots = ['10:00', '14:00', '16:00'];

  let currentDate = startDate;
  const slots = [];

  while (currentDate <= endDate) {
    for (const time of timeSlots) {
      slots.push({
        date: new Date(currentDate),
        heure: time,
        reserved: false,
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`Préparation de ${slots.length} créneaux.`);

  try {
    // Diviser en lots de 1000 pour éviter les limites
    const chunkArray = (array, chunkSize) => {
      const chunks = [];
      for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
      }
      return chunks;
    };

    const slotChunks = chunkArray(slots, 1000);
    for (const chunk of slotChunks) {
      await prisma.slot.createMany({ data: chunk });
      console.log(`${chunk.length} créneaux ajoutés.`);
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout des créneaux :', error);
  } finally {
    await prisma.$disconnect();
  }
};

addSlots();
