export type ServiceCategory = 'manicura' | 'gel_acrigel' | 'kapping' | 'pedicura' | 'duos' | 'esmaltado';

export interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  description: string;
}

export interface AddonItem {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

export interface Specialist {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface Appointment {
  id: string;
  locator: string;
  serviceIds: string[];
  addonIds: string[];
  specialistId: string; // 'any' or specific specialist id
  date: string; // YYYY-MM-DD
  time: string; // e.g. '10:30'
  totalPrice: number;
  totalDuration: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes?: string;
  status: 'Confirmada' | 'Completada' | 'Cancelada';
  createdAt: string;
}

export interface CustomDesign {
  id: string;
  code: string;
  imageBase64: string;
  clientName: string;
  clientPhone: string;
  notes: string;
  shape: string;
  baseColor: string;
  status: 'Pendiente' | 'Preparado en cabina' | 'Realizado';
  createdAt: string;
}

export interface GiftCard {
  id: string;
  code: string;
  amount: number;
  recipientName: string;
  senderName: string;
  message: string;
  theme: 'emerald' | 'gold' | 'pearl';
  isRedeemed: boolean;
  createdAt: string;
}

export type NailShape = 'almond' | 'coffin' | 'square' | 'oval' | 'stiletto' | 'round';
export type NailLength = 'short' | 'medium' | 'long';
export interface NailCatalogStyle {
  id: string;
  name: string;
  bgGradient: string;
  accent: string;
  badge: string;
  isCustom?: boolean;
}

export type NailStyleId = string;

