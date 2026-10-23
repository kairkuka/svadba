export type Role = 'client' | 'vendor';

export type ClientTab = 'home' | 'catalog' | 'saved' | 'requests' | 'profile';

export type VendorTab = 'home' | 'requests' | 'calendar' | 'messages' | 'profile';

export type BadgeTone = 'teal' | 'green' | 'gold' | 'coral' | 'muted';

export type MetricTone = 'teal' | 'coral' | 'gold';

export type VendorImageKey =
  | 'decor'
  | 'photo'
  | 'band'
  | 'hall'
  | 'film'
  | 'host'
  | 'cake'
  | 'florist'
  | 'dj'
  | 'car';

export type UserSession = {
  role: Role;
  city: string;
  name: string;
  phone: string;
  accessToken?: string;
};

export type VendorPackage = {
  name: string;
  price: number;
  details: string;
};

export type VendorReview = {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
};

export type VendorService = {
  id: string;
  title: string;
  category: string;
  price: string;
  priceType: 'Фиксированная' | 'От' | 'По запросу';
  packageDetails: string;
  conditions: string;
  moderationStatus: 'Черновик' | 'На модерации' | 'Опубликовано' | 'Отклонено';
  moderationNote?: string;
  updatedAt: string;
};

export type CreateVendorServicePayload = {
  title: string;
  category: string;
  price: string;
  priceType: VendorService['priceType'];
  packageDetails: string;
  conditions: string;
};

export type PortfolioItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  mediaCount: number;
  media?: PortfolioMedia[];
  coverLabel: string;
  moderationStatus: 'Черновик' | 'На модерации' | 'Опубликовано' | 'Отклонено';
  moderationNote?: string;
  updatedAt: string;
};

export type PortfolioMedia = {
  id: string;
  uri: string;
  type: 'image' | 'video';
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize?: number;
  duration?: number;
  optimized?: boolean;
};

export type CreatePortfolioItemPayload = {
  title: string;
  category: string;
  description: string;
  media: PortfolioMedia[];
};

export type Vendor = {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number;
  priceFrom: number;
  verified: boolean;
  experience: number;
  weddings: number;
  availability: string;
  portfolioCount: number;
  contactPhone: string;
  reviewCount: number;
  shortVideoUrl?: string;
  shortVideoUrls?: string[];
  imageKey?: VendorImageKey;
  portfolioImageKeys?: VendorImageKey[];
  description: string;
  packages: VendorPackage[];
  reviews: VendorReview[];
};

export type Lead = {
  id: string;
  title: string;
  vendor: string;
  client: string;
  date: string;
  guests: number;
  budget: string;
  status: LeadStatus;
  lastUpdate: string;
};

export type LeadStatus =
  | 'Новая'
  | 'Ожидает ответа'
  | 'В работе'
  | 'Ожидает подтверждения'
  | 'Подтверждена'
  | 'Отклонена'
  | 'Закрыта';

export type CreateLeadPayload = {
  vendorId: string;
  vendorName: string;
  date: string;
  guests: string;
  budget: string;
  comment: string;
  contactName: string;
  contactPhone: string;
};

export type ChatMessage = {
  id: string;
  leadId: string;
  authorRole: Role;
  authorName: string;
  text: string;
  createdAt: string;
  status: 'Отправлено' | 'Прочитано';
};

export type CalendarDay = {
  date: string;
  month: string;
  status: 'Свободно' | 'Ожидает' | 'Занято';
};
