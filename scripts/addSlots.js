import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const addSlots = async () => {
  const startDate = new Date('2024-11-30');
  const endDate = new Date('2025-07-07');

  // Horaires spécifiques par jour de la semaine
  const timeSlotsByDay = {
    Monday: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
    Tuesday: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
    Wednesday: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'],
    Thursday: ['09:00', '10:00', '12:00', '13:00'],
    Friday: ['09:00', '10:00', '11:00', '12:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
    Saturday: ['13:00', '14:00', '15:00', '16:00', '17:00'],
  };

  let currentDate = startDate;
  const slots = [];

  while (currentDate <= endDate) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Vérifie si des horaires sont définis pour ce jour
    if (timeSlotsByDay[dayName]) {
      for (const time of timeSlotsByDay[dayName]) {
        slots.push({
          date: new Date(currentDate),
          heure: time,
          reserved: false,
        });
      }
    }

    // Passe au jour suivant
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
