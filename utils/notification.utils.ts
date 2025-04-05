import prismaClient from '../src/lib/prismaClient';
import { NotificationType as PrismaNotificationType } from '@prisma/client';
import { NotificationType } from '../types/enums';

// Mapping function to convert custom enum to Prisma enum
const mapNotificationType = (type: NotificationType): PrismaNotificationType => {
  switch (type) {
    case NotificationType.NEW_MESSAGE:
      return 'NEW_MESSAGE';
    case NotificationType.LISTING_INTEREST:
      return 'LISTING_INTEREST';
    case NotificationType.PRICE_UPDATE:
      return 'PRICE_UPDATE';
    case NotificationType.LISTING_SOLD:
      return 'LISTING_SOLD';
    case NotificationType.LISTING_CREATED:
      return 'LISTING_CREATED';
    case NotificationType.SYSTEM_NOTICE:
      return 'SYSTEM_NOTICE';
    default:
      return 'SYSTEM_NOTICE';
  }
};

export const createNotification = async ({
  userId,
  type,
  message,
  relatedListingId,
}: {
  userId: string;
  type: NotificationType;
  message: string;
  relatedListingId?: string;
}) => {
  if (!userId || !type || !message) {
    throw new Error('Invalid notification data');
  }

  return prismaClient.notification.create({
    data: {
      userId,
      type: mapNotificationType(type),
      content: message,
      relatedId: relatedListingId,
    },
  });
};