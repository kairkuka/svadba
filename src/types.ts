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
  | 'car'
  | 'cat-hosts'
  | 'cat-halls'
  | 'cat-decor'
  | 'cat-photographers'
  | 'cat-videographers'
  | 'cat-mobilographers'
  | 'cat-artists'
  | 'cat-live-bands'
  | 'cat-wedding-looks'
  | 'cat-kyz-uzatu'
  | 'cat-kudalyk'
  | 'cat-organizers'
  | 'cat-confectioners'
  | 'cat-stylists'
  | 'cat-show-programs'
  | 'cat-effects';

export type FeaturedVendorStyle = 'gold' | 'neon' | 'royal' | 'rose';

export type VendorFeatured = {
  enabled: boolean;
  style: FeaturedVendorStyle;
  badgeText: string;
  priority: number;
  expiresAt?: string;
};

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

export type MediaComment = {
  id: string;
  authorId?: string;
  author: string;
  authorAvatarUri?: string;
  text: string;
  createdAt: string;
};

export type MediaLikeUser = {
  id: string;
  name: string;
  avatarUri?: string;
};

export type VendorMediaStats = {
  likeCount: number;
  likedByPreview?: MediaLikeUser[];
  saveCount?: number;
  commentCount: number;
  comments: MediaComment[];
};

export type VendorMediaItem = {
  id: string;
  uri: string;
  type: 'image' | 'video';
  fileName?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  caption?: string;
  role?: 'main' | 'cover' | 'reels' | 'profile' | 'story';
  publicationId?: string;
  publicationKind?: 'photo' | 'video' | 'story';
  publicationIndex?: number;
  publicationCount?: number;
  createdAt?: string;
  expiresAt?: string;
  likeCount?: number;
  likedByPreview?: MediaLikeUser[];
  saveCount?: number;
  commentCount?: number;
  comments?: MediaComment[];
};

export type StoryCollection = {
  id: string;
  name: string;
  coverStoryId?: string;
  storyIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type StoryHighlightCollection = StoryCollection & {
  stories: VendorMediaItem[];
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
  featured?: VendorFeatured;
  experience: number;
  weddings: number;
  availability: string;
  portfolioCount: number;
  contactPhone: string;
  likeCount?: number;
  reviewCount: number;
  shortVideoUrl?: string;
  shortVideoUrls?: string[];
  media?: VendorMediaItem[];
  storyHighlights?: StoryHighlightCollection[];
  mediaStats?: Record<string, VendorMediaStats>;
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
