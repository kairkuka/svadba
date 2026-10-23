import type { ImageSourcePropType } from 'react-native';

import type { Vendor, VendorImageKey } from '../types';

export const vendorImageSources: Record<VendorImageKey, ImageSourcePropType> = {
  decor: require('../../assets/vendors/decor.jpg'),
  photo: require('../../assets/vendors/photo.jpg'),
  band: require('../../assets/vendors/band.jpg'),
  hall: require('../../assets/vendors/hall.jpg'),
  film: require('../../assets/vendors/film.jpg'),
  host: require('../../assets/vendors/host.jpg'),
  cake: require('../../assets/vendors/cake.jpg'),
  florist: require('../../assets/vendors/florist.jpg'),
  dj: require('../../assets/vendors/dj.jpg'),
  car: require('../../assets/vendors/car.jpg'),
};

const categoryImageKeys: Record<string, VendorImageKey> = {
  Декор: 'decor',
  Фото: 'photo',
  Артисты: 'band',
  'Банкетные залы': 'hall',
  Видео: 'film',
  Ведущие: 'host',
  Торты: 'cake',
  Флористика: 'florist',
  DJ: 'dj',
  Авто: 'car',
};

const defaultPortfolioKeys: Record<VendorImageKey, VendorImageKey[]> = {
  decor: ['decor', 'florist', 'hall'],
  photo: ['photo', 'decor', 'hall'],
  band: ['band', 'dj', 'host'],
  hall: ['hall', 'decor', 'florist'],
  film: ['film', 'photo', 'hall'],
  host: ['host', 'dj', 'band'],
  cake: ['cake', 'decor', 'florist'],
  florist: ['florist', 'decor', 'hall'],
  dj: ['dj', 'band', 'host'],
  car: ['car', 'photo', 'decor'],
};

export function getVendorImageKey(vendor: Pick<Vendor, 'category' | 'imageKey'>) {
  return vendor.imageKey ?? categoryImageKeys[vendor.category] ?? 'decor';
}

export function getVendorImageSource(vendor: Pick<Vendor, 'category' | 'imageKey'>) {
  return vendorImageSources[getVendorImageKey(vendor)];
}

export function getVendorPortfolioSources(
  vendor: Pick<Vendor, 'category' | 'imageKey' | 'portfolioImageKeys'>,
) {
  const keys =
    vendor.portfolioImageKeys ??
    defaultPortfolioKeys[getVendorImageKey(vendor)] ??
    defaultPortfolioKeys.decor;

  return keys.slice(0, 3).map((key) => vendorImageSources[key]);
}
