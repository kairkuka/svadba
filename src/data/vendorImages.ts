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
  'cat-hosts': require('../../assets/categories/hosts.png'),
  'cat-halls': require('../../assets/categories/halls.png'),
  'cat-decor': require('../../assets/categories/decor-floristics.png'),
  'cat-photographers': require('../../assets/categories/photographers.png'),
  'cat-videographers': require('../../assets/categories/videographers.png'),
  'cat-mobilographers': require('../../assets/categories/mobilographers.png'),
  'cat-artists': require('../../assets/categories/artists.png'),
  'cat-live-bands': require('../../assets/categories/live-bands.png'),
  'cat-wedding-looks': require('../../assets/categories/wedding-looks.png'),
  'cat-kyz-uzatu': require('../../assets/categories/kyz-uzatu.png'),
  'cat-kudalyk': require('../../assets/categories/kudalyk.png'),
  'cat-organizers': require('../../assets/categories/organizers.png'),
  'cat-confectioners': require('../../assets/categories/confectioners.png'),
  'cat-stylists': require('../../assets/categories/stylists.png'),
  'cat-show-programs': require('../../assets/categories/show-programs.png'),
  'cat-effects': require('../../assets/categories/effects.png'),
};

const categoryImageSources: Record<string, ImageSourcePropType> = {
  Ведущие: vendorImageSources['cat-hosts'],
  'Банкетные залы': vendorImageSources['cat-halls'],
  'Декор и флористика': vendorImageSources['cat-decor'],
  Фотографы: vendorImageSources['cat-photographers'],
  Видеографы: vendorImageSources['cat-videographers'],
  Мобилографы: vendorImageSources['cat-mobilographers'],
  Артисты: vendorImageSources['cat-artists'],
  'Лайв-бэнды': vendorImageSources['cat-live-bands'],
  'Свадебные образы': vendorImageSources['cat-wedding-looks'],
  'Қыз ұзату': vendorImageSources['cat-kyz-uzatu'],
  Құдалық: vendorImageSources['cat-kudalyk'],
  Организаторы: vendorImageSources['cat-organizers'],
  Кондитеры: vendorImageSources['cat-confectioners'],
  Стилисты: vendorImageSources['cat-stylists'],
  'Шоу-программы': vendorImageSources['cat-show-programs'],
  'Техника и спецэффекты': vendorImageSources['cat-effects'],
};

const categoryImageKeys: Record<string, VendorImageKey> = {
  'Декор и флористика': 'cat-decor',
  Фотографы: 'cat-photographers',
  Видеографы: 'cat-videographers',
  Мобилографы: 'cat-mobilographers',
  Артисты: 'cat-artists',
  'Лайв-бэнды': 'cat-live-bands',
  'Банкетные залы': 'cat-halls',
  Ведущие: 'cat-hosts',
  'Свадебные образы': 'cat-wedding-looks',
  'Қыз ұзату': 'cat-kyz-uzatu',
  Құдалық: 'cat-kudalyk',
  Организаторы: 'cat-organizers',
  Кондитеры: 'cat-confectioners',
  Стилисты: 'cat-stylists',
  'Шоу-программы': 'cat-show-programs',
  'Техника и спецэффекты': 'cat-effects',
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
  'cat-hosts': ['cat-hosts', 'host', 'band'],
  'cat-halls': ['cat-halls', 'hall', 'decor'],
  'cat-decor': ['cat-decor', 'decor', 'florist'],
  'cat-photographers': ['cat-photographers', 'photo', 'decor'],
  'cat-videographers': ['cat-videographers', 'film', 'photo'],
  'cat-mobilographers': ['cat-mobilographers', 'film', 'photo'],
  'cat-artists': ['cat-artists', 'band', 'dj'],
  'cat-live-bands': ['cat-live-bands', 'band', 'dj'],
  'cat-wedding-looks': ['cat-wedding-looks', 'photo', 'florist'],
  'cat-kyz-uzatu': ['cat-kyz-uzatu', 'host', 'decor'],
  'cat-kudalyk': ['cat-kudalyk', 'hall', 'host'],
  'cat-organizers': ['cat-organizers', 'host', 'decor'],
  'cat-confectioners': ['cat-confectioners', 'cake', 'decor'],
  'cat-stylists': ['cat-stylists', 'photo', 'florist'],
  'cat-show-programs': ['cat-show-programs', 'band', 'dj'],
  'cat-effects': ['cat-effects', 'dj', 'hall'],
};

export function getVendorImageKey(vendor: Pick<Vendor, 'category' | 'imageKey'>) {
  return vendor.imageKey ?? categoryImageKeys[vendor.category] ?? 'decor';
}

export function getVendorImageSource(vendor: Pick<Vendor, 'category' | 'imageKey'>) {
  return vendorImageSources[getVendorImageKey(vendor)];
}

export function getCategoryImageSource(category: string) {
  return categoryImageSources[category] ?? getVendorImageSource({ category });
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
