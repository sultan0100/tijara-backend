import prismaClient from '../lib/prismaClient';
import { NotificationType } from '../types/enums';

export const createNotification = async ({
  userId,
  type,
  message,
}: {
  userId: string;
  type: NotificationType;
  message: string;
}) => {
  if (!userId || !type || !message) {
    throw new Error('Invalid notification data');
  }

  return prismaClient.notification.create({
    data: {
      userId,
      type,
      message,
    },
  });
};