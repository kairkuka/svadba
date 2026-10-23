import type {
  CalendarDay,
  ChatMessage,
  ClientTab,
  Lead,
  PortfolioItem,
  Vendor,
  VendorImageKey,
  VendorReview,
  VendorService,
  VendorTab,
} from '../types';

export const categories = [
  'Ведущие',
  'Банкетные залы',
  'Декор и флористика',
  'Фотографы',
  'Видеографы',
  'Мобилографы',
  'Артисты',
  'Лайв-бэнды',
  'Свадебные образы',
  'Қыз ұзату',
  'Құдалық',
  'Организаторы',
  'Кондитеры',
  'Стилисты',
  'Шоу-программы',
  'Техника и спецэффекты',
];

const vendorPhones: Record<string, string> = {
  v1: '+77015550101',
  v2: '+77015550102',
  v3: '+77015550103',
  v4: '+77015550104',
  v5: '+77015550105',
  v6: '+77015550106',
  v7: '+77015550107',
  v8: '+77015550108',
  v9: '+77015550109',
  v10: '+77015550110',
  v11: '+77015550111',
  v12: '+77015550112',
};

const sampleVideos = {
  decor: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  photo: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  band: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  hall: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  film: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  host: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  cake: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  florist: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  dj: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  car: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
};

const vendorReviews: Record<string, VendorReview[]> = {
  v1: [
    {
      id: 'rv1-1',
      author: 'Алия',
      rating: 5,
      date: '12 июня',
      text: 'Команда быстро поняла стиль мероприятия и собрала зал ровно как на референсах.',
    },
    {
      id: 'rv1-2',
      author: 'Мадина',
      rating: 5,
      date: '28 мая',
      text: 'Очень спокойный монтаж, красивые цветы и аккуратная работа с бюджетом.',
    },
  ],
  v2: [
    {
      id: 'rv2-1',
      author: 'Данияр',
      rating: 5,
      date: '9 июня',
      text: 'Фотографии получили быстро, особенно понравилась серия с гостями.',
    },
    {
      id: 'rv2-2',
      author: 'Айгерим',
      rating: 4.8,
      date: '17 мая',
      text: 'Легко работал с семьей и не затягивал постановочные кадры.',
    },
  ],
  v3: [
    {
      id: 'rv3-1',
      author: 'Сауле',
      rating: 4.7,
      date: '4 июня',
      text: 'Гости танцевали весь вечер, сетлист адаптировали по ходу банкета.',
    },
  ],
  v4: [
    {
      id: 'rv4-1',
      author: 'Ерлан',
      rating: 5,
      date: '1 июля',
      text: 'Зал светлый, кухня сильная, менеджер держал тайминг до конца вечера.',
    },
  ],
  v5: [
    {
      id: 'rv5-1',
      author: 'Лаура',
      rating: 5,
      date: '22 июня',
      text: 'Тизер получился динамичным и очень живым, родители пересматривали весь день.',
    },
  ],
  v6: [
    {
      id: 'rv6-1',
      author: 'Арман',
      rating: 5,
      date: '16 июня',
      text: 'Вел легко, без лишнего давления, хорошо переключался между языками.',
    },
  ],
  v7: [
    {
      id: 'rv7-1',
      author: 'Жанна',
      rating: 4.7,
      date: '2 июня',
      text: 'Торт был красивый, устойчивый и приехал точно к подаче.',
    },
  ],
  v8: [
    {
      id: 'rv8-1',
      author: 'Назым',
      rating: 4.9,
      date: '20 мая',
      text: 'Букет и арка выглядели нежно, цветы простояли весь вечер.',
    },
  ],
  v9: [
    {
      id: 'rv9-1',
      author: 'Руслан',
      rating: 4.6,
      date: '7 июня',
      text: 'Музыка была вовремя, DJ хорошо чувствовал зал и не спорил по плейлисту.',
    },
  ],
  v10: [
    {
      id: 'rv10-1',
      author: 'Камила',
      rating: 4.8,
      date: '25 мая',
      text: 'Машины чистые, водитель помог с маршрутом и подождал после съемки.',
    },
  ],
  v11: [
    {
      id: 'rv11-1',
      author: 'Нурай',
      rating: 4.9,
      date: '3 июля',
      text: 'Очень уверенно вел вечер, быстро подхватывал настроение гостей.',
    },
  ],
  v12: [
    {
      id: 'rv12-1',
      author: 'Асем',
      rating: 4.8,
      date: '19 июня',
      text: 'Спокойная подача, хороший юмор и аккуратная работа с традициями.',
    },
  ],
};

const vendorBase: Array<Omit<Vendor, 'contactPhone' | 'reviewCount' | 'reviews'>> = [
  {
    id: 'v1',
    name: 'Aigerim Decor Studio',
    category: 'Декор и флористика',
    city: 'Алматы',
    rating: 4.9,
    priceFrom: 280000,
    verified: true,
    featured: {
      enabled: true,
      style: 'rose',
      badgeText: 'Выбор SVADBA.kz',
      priority: 80,
    },
    experience: 6,
    weddings: 184,
    availability: 'Свободна 24 октября',
    portfolioCount: 42,
    imageKey: 'decor',
    portfolioImageKeys: ['decor', 'florist', 'hall'],
    shortVideoUrl: sampleVideos.decor,
    description:
      'Оформление камерных и больших мероприятий: президиум, фотозона, флористика, световые акценты и монтаж под ключ.',
    packages: [
      {
        name: 'Камерный декор',
        price: 280000,
        details: 'Президиум, зона церемонии, базовая флористика.',
      },
      {
        name: 'Полный зал',
        price: 650000,
        details: 'Концепт, зал, фотозона, координация монтажа.',
      },
    ],
  },
  {
    id: 'v2',
    name: 'Timur Photo',
    category: 'Фотографы',
    city: 'Астана',
    rating: 4.8,
    priceFrom: 180000,
    verified: true,
    experience: 8,
    weddings: 236,
    availability: 'Свободен 7 октября',
    portfolioCount: 58,
    imageKey: 'photo',
    portfolioImageKeys: ['photo', 'decor', 'hall'],
    shortVideoUrl: sampleVideos.photo,
    description:
      'Фотосъемка мероприятий полного дня, семейные портреты и быстрая серия фото в течение 72 часов.',
    packages: [
      {
        name: 'До банкета',
        price: 180000,
        details: 'ЗАГС, прогулка, портреты, 250 обработанных фото.',
      },
      {
        name: 'Полный день',
        price: 340000,
        details: 'До 12 часов съемки, 600 фото, онлайн-галерея.',
      },
    ],
  },
  {
    id: 'v3',
    name: 'Miras Show Band',
    category: 'Лайв-бэнды',
    city: 'Шымкент',
    rating: 4.7,
    priceFrom: 420000,
    verified: false,
    experience: 5,
    weddings: 91,
    availability: 'Есть окна в октябре',
    portfolioCount: 19,
    imageKey: 'band',
    portfolioImageKeys: ['band', 'dj', 'host'],
    shortVideoUrl: sampleVideos.band,
    description:
      'Живая музыка, кавер-программа, национальные композиции и интерактив с гостями.',
    packages: [
      {
        name: 'Welcome set',
        price: 420000,
        details: '2 выхода по 35 минут, звук предоставляется отдельно.',
      },
      {
        name: 'Вечерняя программа',
        price: 790000,
        details: '4 выхода, ведущий бэнда, подготовка плейлиста.',
      },
    ],
  },
  {
    id: 'v4',
    name: 'Grand Hall Almaty',
    category: 'Банкетные залы',
    city: 'Алматы',
    rating: 4.9,
    priceFrom: 950000,
    verified: true,
    featured: {
      enabled: true,
      style: 'royal',
      badgeText: 'Premium зал',
      priority: 90,
    },
    experience: 11,
    weddings: 410,
    availability: 'Свободен 31 октября',
    portfolioCount: 37,
    imageKey: 'hall',
    portfolioImageKeys: ['hall', 'decor', 'florist'],
    shortVideoUrl: sampleVideos.hall,
    description:
      'Светлый банкетный зал до 220 гостей, отдельная welcome-зона, сцена, парковка и собственная кухня.',
    packages: [
      {
        name: 'Банкет до 120 гостей',
        price: 950000,
        details: 'Зал, базовая сервировка, экран, сцена и техническая команда.',
      },
      {
        name: 'Большой банкет',
        price: 1650000,
        details: 'Зал до 220 гостей, welcome-зона и расширенный свет.',
      },
    ],
  },
  {
    id: 'v5',
    name: 'Nomad Wedding Films',
    category: 'Видеографы',
    city: 'Астана',
    rating: 4.8,
    priceFrom: 260000,
    verified: true,
    experience: 7,
    weddings: 148,
    availability: 'Свободны 14 октября',
    portfolioCount: 31,
    imageKey: 'film',
    portfolioImageKeys: ['film', 'photo', 'hall'],
    shortVideoUrl: sampleVideos.film,
    description:
      'Фильмы с мероприятий и динамичные highlights с двумя операторами, аэросъемкой и цветокоррекцией.',
    packages: [
      {
        name: 'Highlights',
        price: 260000,
        details: '8 часов съемки, ролик 5 минут, один оператор.',
      },
      {
        name: 'Wedding film',
        price: 480000,
        details: 'Полный день, два оператора, тизер и фильм до 35 минут.',
      },
    ],
  },
  {
    id: 'v6',
    name: 'Arman Event',
    category: 'Ведущие',
    city: 'Алматы',
    rating: 4.9,
    priceFrom: 320000,
    verified: true,
    featured: {
      enabled: true,
      style: 'gold',
      badgeText: 'Выбор владельца',
      priority: 100,
    },
    experience: 9,
    weddings: 265,
    availability: 'Свободен 7 октября',
    portfolioCount: 46,
    imageKey: 'host',
    portfolioImageKeys: ['host', 'dj', 'band'],
    shortVideoUrl: sampleVideos.host,
    shortVideoUrls: [
      sampleVideos.host,
      'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    ],
    description:
      'Современное ведение на русском и казахском языках, авторская программа и работа с семейными традициями.',
    packages: [
      {
        name: 'Ведущий',
        price: 320000,
        details: 'До 6 часов программы, сценарий и работа с гостями.',
      },
      {
        name: 'Ведущий + DJ',
        price: 460000,
        details: 'Ведущий, DJ, музыкальная подготовка и оборудование.',
      },
    ],
  },
  {
    id: 'v7',
    name: 'Tatti Cakes',
    category: 'Кондитеры',
    city: 'Шымкент',
    rating: 4.7,
    priceFrom: 85000,
    verified: true,
    experience: 5,
    weddings: 132,
    availability: 'Принимает заказы на октябрь',
    portfolioCount: 54,
    imageKey: 'cake',
    portfolioImageKeys: ['cake', 'decor', 'florist'],
    shortVideoUrl: sampleVideos.cake,
    description:
      'Многоярусные торты, дегустационные наборы и индивидуальный декор под стилистику мероприятия.',
    packages: [
      {
        name: 'Камерный торт',
        price: 85000,
        details: 'До 40 порций, два вкуса и минималистичный декор.',
      },
      {
        name: 'Торт для банкета',
        price: 190000,
        details: 'До 120 порций, три яруса, доставка и установка.',
      },
    ],
  },
  {
    id: 'v8',
    name: 'Maison Flora',
    category: 'Декор и флористика',
    city: 'Астана',
    rating: 4.8,
    priceFrom: 145000,
    verified: true,
    experience: 6,
    weddings: 174,
    availability: 'Есть окна в октябре',
    portfolioCount: 63,
    imageKey: 'florist',
    portfolioImageKeys: ['florist', 'decor', 'hall'],
    shortVideoUrl: sampleVideos.florist,
    description:
      'Букет невесты, бутоньерки и цветочное оформление церемонии с сезонными цветами.',
    packages: [
      {
        name: 'Букет и детали',
        price: 145000,
        details: 'Букет невесты, бутоньерка и композиции для двух столов.',
      },
      {
        name: 'Церемония',
        price: 390000,
        details: 'Арка, проход, президиум и композиции для гостей.',
      },
    ],
  },
  {
    id: 'v9',
    name: 'DJ Sanzhar',
    category: 'Техника и спецэффекты',
    city: 'Алматы',
    rating: 4.6,
    priceFrom: 170000,
    verified: false,
    experience: 4,
    weddings: 88,
    availability: 'Свободен 24 октября',
    portfolioCount: 22,
    imageKey: 'dj',
    portfolioImageKeys: ['dj', 'band', 'host'],
    shortVideoUrl: sampleVideos.dj,
    description:
      'Музыкальная программа для welcome, банкета и afterparty с подготовкой плейлиста под гостей.',
    packages: [
      {
        name: 'Банкет',
        price: 170000,
        details: 'До 6 часов, подбор музыки и работа с ведущим.',
      },
      {
        name: 'Банкет + afterparty',
        price: 260000,
        details: 'До 9 часов, дополнительный комплект оборудования.',
      },
    ],
  },
  {
    id: 'v10',
    name: 'White Ride',
    category: 'Техника и спецэффекты',
    city: 'Астана',
    rating: 4.5,
    priceFrom: 120000,
    verified: true,
    experience: 8,
    weddings: 305,
    availability: 'Свободны машины на выходные',
    portfolioCount: 29,
    imageKey: 'car',
    portfolioImageKeys: ['car', 'photo', 'decor'],
    shortVideoUrl: sampleVideos.car,
    description:
      'Автомобили бизнес- и премиум-класса для пары и гостей, украшение и почасовая аренда с водителем.',
    packages: [
      {
        name: 'Авто для пары',
        price: 120000,
        details: '4 часа аренды, водитель и базовое украшение.',
      },
      {
        name: 'Кортеж',
        price: 420000,
        details: 'Три автомобиля на 6 часов, координация маршрута.',
      },
    ],
  },
  {
    id: 'v11',
    name: 'Daulet MC',
    category: 'Ведущие',
    city: 'Астана',
    rating: 4.8,
    priceFrom: 290000,
    verified: true,
    featured: {
      enabled: true,
      style: 'neon',
      badgeText: 'Top host',
      priority: 70,
    },
    experience: 7,
    weddings: 198,
    availability: 'Свободен 14 октября',
    portfolioCount: 34,
    imageKey: 'host',
    portfolioImageKeys: ['host', 'band', 'dj'],
    shortVideoUrl:
      'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    shortVideoUrls: [
      'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    ],
    description:
      'Ведущий с легкой подачей, bilingual-программой и динамичными интерактивами без затянутых пауз.',
    packages: [
      {
        name: 'Вечер',
        price: 290000,
        details: 'До 5 часов программы, подготовка сценария и созвон с парой.',
      },
      {
        name: 'Вечер + координация',
        price: 420000,
        details: 'Программа, тайминг, работа с подрядчиками и DJ-блок.',
      },
    ],
  },
  {
    id: 'v12',
    name: 'Ayan Host',
    category: 'Ведущие',
    city: 'Алматы',
    rating: 4.7,
    priceFrom: 260000,
    verified: true,
    experience: 6,
    weddings: 156,
    availability: 'Есть окна в ноябре',
    portfolioCount: 28,
    imageKey: 'host',
    portfolioImageKeys: ['host', 'dj', 'photo'],
    shortVideoUrl: 'https://www.w3schools.com/html/movie.mp4',
    description:
      'Энергичное ведение, семейные блоки, аккуратный юмор и сценарий под формат пары.',
    packages: [
      {
        name: 'Классика',
        price: 260000,
        details: 'До 5 часов ведения, сценарий, интерактивы и встреча гостей.',
      },
      {
        name: 'Full party',
        price: 390000,
        details: 'Ведение, afterparty-блок, подготовка плейлиста и репетиция.',
      },
    ],
  },
];

type CategoryProfilePlan = {
  category: string;
  slug: string;
  names: [string, string];
  cities: [string, string];
  prices: [number, number];
  imageKeys: [VendorImageKey, VendorImageKey];
  portfolioKey: VendorImageKey;
  videoKey: keyof typeof sampleVideos;
  descriptions: [string, string];
  service: string;
};

const categoryProfilePlans: CategoryProfilePlan[] = [
  {
    category: 'Ведущие',
    slug: 'hosts',
    names: ['Aruzhan Toastmaster', 'Sayan Event Voice'],
    cities: ['Алматы', 'Астана'],
    prices: [310000, 280000],
    imageKeys: ['cat-hosts', 'host'],
    portfolioKey: 'band',
    videoKey: 'host',
    descriptions: [
      'Ведущая с мягкой bilingual-подачей, семейными блоками и аккуратным таймингом вечера.',
      'Динамичный ведущий для больших банкетов, выездных церемоний и afterparty без затянутых пауз.',
    ],
    service: 'Ведение мероприятия',
  },
  {
    category: 'Банкетные залы',
    slug: 'halls',
    names: ['Aurora Grand Hall', 'Sulu Palace'],
    cities: ['Алматы', 'Шымкент'],
    prices: [1200000, 900000],
    imageKeys: ['cat-halls', 'hall'],
    portfolioKey: 'decor',
    videoKey: 'hall',
    descriptions: [
      'Зал до 240 гостей с welcome-зоной, сценой, экраном, парковкой и собственной банкетной кухней.',
      'Светлый ресторанный зал для құдалық, ұзату и свадеб с отдельной комнатой для сборов.',
    ],
    service: 'Банкетная площадка',
  },
  {
    category: 'Декор и флористика',
    slug: 'decor',
    names: ['Bloom Atelier KZ', 'Asyl Decor'],
    cities: ['Астана', 'Алматы'],
    prices: [260000, 340000],
    imageKeys: ['cat-decor', 'florist'],
    portfolioKey: 'decor',
    videoKey: 'decor',
    descriptions: [
      'Флористика, президиум, арка и welcome-зона в одном стиле с монтажом под ключ.',
      'Декор больших залов: свет, текстиль, композиции на столы и фотозона для гостей.',
    ],
    service: 'Оформление зала',
  },
  {
    category: 'Фотографы',
    slug: 'photographers',
    names: ['Dias Wedding Photo', 'Amina Frames'],
    cities: ['Алматы', 'Астана'],
    prices: [190000, 220000],
    imageKeys: ['cat-photographers', 'photo'],
    portfolioKey: 'decor',
    videoKey: 'photo',
    descriptions: [
      'Полный свадебный день, репортаж гостей, постановочные кадры и онлайн-галерея за 7 дней.',
      'Нежная цветокоррекция, семейные портреты и быстрая preview-серия утром после события.',
    ],
    service: 'Фотосъемка',
  },
  {
    category: 'Видеографы',
    slug: 'videographers',
    names: ['Nomad Film Crew', 'Qala Wedding Cinema'],
    cities: ['Астана', 'Алматы'],
    prices: [270000, 360000],
    imageKeys: ['cat-videographers', 'film'],
    portfolioKey: 'photo',
    videoKey: 'film',
    descriptions: [
      'Два оператора, тизер, фильм до 35 минут, чистый звук церемонии и аэрокадры.',
      'Кинематографичная съемка банкета, love story и reels-нарезки для соцсетей.',
    ],
    service: 'Видеосъемка',
  },
  {
    category: 'Мобилографы',
    slug: 'mobilographers',
    names: ['Reels Day KZ', 'Aika Mobile Films'],
    cities: ['Алматы', 'Караганда'],
    prices: [90000, 120000],
    imageKeys: ['cat-mobilographers', 'film'],
    portfolioKey: 'photo',
    videoKey: 'film',
    descriptions: [
      'Вертикальные Reels в день мероприятия: сборы, церемония, банкет и эмоции гостей.',
      'Мобилография с монтажом коротких роликов за 24 часа и передачей исходников.',
    ],
    service: 'Мобильная съемка',
  },
  {
    category: 'Артисты',
    slug: 'artists',
    names: ['Samal Live Show', 'Nurai Stage'],
    cities: ['Шымкент', 'Алматы'],
    prices: [180000, 230000],
    imageKeys: ['cat-artists', 'band'],
    portfolioKey: 'dj',
    videoKey: 'band',
    descriptions: [
      'Вокальный номер, интерактив с залом и праздничный выход под сценарий вечера.',
      'Эстрадная программа с костюмами, танцевальным блоком и адаптацией под тайминг банкета.',
    ],
    service: 'Артистическая программа',
  },
  {
    category: 'Лайв-бэнды',
    slug: 'live-bands',
    names: ['Alatau Jazz Band', 'Steppe Soul Live'],
    cities: ['Алматы', 'Астана'],
    prices: [420000, 480000],
    imageKeys: ['cat-live-bands', 'band'],
    portfolioKey: 'dj',
    videoKey: 'band',
    descriptions: [
      'Живая музыка для welcome, первого танца и банкетной программы с саксофоном.',
      'Кавер-бэнд с казахским, русским и зарубежным репертуаром для больших залов.',
    ],
    service: 'Живая музыка',
  },
  {
    category: 'Свадебные образы',
    slug: 'wedding-looks',
    names: ['Bride Look Room', 'Qyz Studio Dress'],
    cities: ['Алматы', 'Астана'],
    prices: [150000, 180000],
    imageKeys: ['cat-wedding-looks', 'photo'],
    portfolioKey: 'florist',
    videoKey: 'photo',
    descriptions: [
      'Подбор образа невесты: платье, аксессуары, примерка и сопровождение в день события.',
      'Свадебные комплекты для невесты и ұзату с аккуратной подгонкой по фигуре.',
    ],
    service: 'Образ невесты',
  },
  {
    category: 'Қыз ұзату',
    slug: 'kyz-uzatu',
    names: ['Aru Uzatu Team', 'Shanyraq Uzatu'],
    cities: ['Шымкент', 'Алматы'],
    prices: [300000, 380000],
    imageKeys: ['cat-kyz-uzatu', 'host'],
    portfolioKey: 'decor',
    videoKey: 'host',
    descriptions: [
      'Ұзату сценарийі, салт-дәстүр, жүргізуші, қыз шығару және отбасылық блоктар.',
      'Қыз ұзату под ключ: тайминг, декор ұсыныстары, музыкалық сүйемелдеу және команда.',
    ],
    service: 'Қыз ұзату бағдарламасы',
  },
  {
    category: 'Құдалық',
    slug: 'kudalyk',
    names: ['Dastur Qudalyq', 'Bereke Ceremony'],
    cities: ['Тараз', 'Астана'],
    prices: [220000, 260000],
    imageKeys: ['cat-kudalyk', 'hall'],
    portfolioKey: 'host',
    videoKey: 'hall',
    descriptions: [
      'Құдалыққа арналған дәстүрлі сценарий, асаба, дастархан таймингі және сыйлық рәсімдері.',
      'Камерный құдалық с уважительной подачей традиций, музыкой и координацией гостей.',
    ],
    service: 'Құдалық ұйымдастыру',
  },
  {
    category: 'Организаторы',
    slug: 'organizers',
    names: ['Toi Project Bureau', 'Alem Wedding Planner'],
    cities: ['Алматы', 'Астана'],
    prices: [450000, 520000],
    imageKeys: ['cat-organizers', 'host'],
    portfolioKey: 'decor',
    videoKey: 'host',
    descriptions: [
      'Полная организация свадьбы: смета, подрядчики, тайминг, логистика и контроль дня.',
      'Планирование мероприятия с нуля, подбор команды, договоры и координация на площадке.',
    ],
    service: 'Организация под ключ',
  },
  {
    category: 'Кондитеры',
    slug: 'confectioners',
    names: ['Tatti Cake House', 'Lumi Dessert'],
    cities: ['Алматы', 'Костанай'],
    prices: [95000, 130000],
    imageKeys: ['cat-confectioners', 'cake'],
    portfolioKey: 'decor',
    videoKey: 'cake',
    descriptions: [
      'Многоярусные торты, дегустация вкусов, доставка и установка перед подачей.',
      'Авторские десерты, кенди-бар и торт в стилистике пары с устойчивой конструкцией.',
    ],
    service: 'Свадебный торт',
  },
  {
    category: 'Стилисты',
    slug: 'stylists',
    names: ['Dana Beauty Bridal', 'Mika Make Up Hair'],
    cities: ['Алматы', 'Астана'],
    prices: [85000, 110000],
    imageKeys: ['cat-stylists', 'photo'],
    portfolioKey: 'florist',
    videoKey: 'photo',
    descriptions: [
      'Макияж и прическа невесты, репетиция образа, выезд утром и фиксация до вечера.',
      'Образы для невесты, мамы и подружек с таймингом сборов и набором для коррекции.',
    ],
    service: 'Свадебный макияж',
  },
  {
    category: 'Шоу-программы',
    slug: 'show-programs',
    names: ['Fire Show Almaty', 'Mirror People KZ'],
    cities: ['Алматы', 'Шымкент'],
    prices: [240000, 190000],
    imageKeys: ['cat-show-programs', 'band'],
    portfolioKey: 'dj',
    videoKey: 'band',
    descriptions: [
      'Яркий шоу-номер для кульминации вечера с безопасной зоной и техническим райдером.',
      'Welcome-перформанс, интерактивные артисты и фотомоменты для гостей.',
    ],
    service: 'Шоу-номер',
  },
  {
    category: 'Техника и спецэффекты',
    slug: 'effects',
    names: ['Light Pro KZ', 'Spark FX Team'],
    cities: ['Алматы', 'Астана'],
    prices: [210000, 260000],
    imageKeys: ['cat-effects', 'dj'],
    portfolioKey: 'hall',
    videoKey: 'dj',
    descriptions: [
      'Свет, звук, дым, холодные фонтаны и технический специалист на весь банкет.',
      'Спецэффекты для первого танца, выхода пары, торта и финала вечера.',
    ],
    service: 'Техническое сопровождение',
  },
];

function createLaunchCategoryVendors() {
  return categoryProfilePlans.flatMap((plan, planIndex) =>
    plan.names.map((name, variantIndex) => {
      const imageKey = plan.imageKeys[variantIndex];
      const secondImageKey = plan.imageKeys[variantIndex === 0 ? 1 : 0];
      const id = `seed-${plan.slug}-${variantIndex + 1}`;
      const priceFrom = plan.prices[variantIndex];

      return {
        id,
        name,
        category: plan.category,
        city: plan.cities[variantIndex],
        rating: Number((4.6 + ((planIndex + variantIndex) % 4) * 0.1).toFixed(1)),
        priceFrom,
        verified: true,
        experience: 3 + ((planIndex + variantIndex) % 8),
        weddings: 48 + planIndex * 14 + variantIndex * 17,
        availability: getSeedAvailability(6 + planIndex + variantIndex * 3),
        portfolioCount: 18 + planIndex * 2 + variantIndex * 5,
        imageKey,
        portfolioImageKeys: [imageKey, secondImageKey, plan.portfolioKey],
        shortVideoUrl: sampleVideos[plan.videoKey],
        description: plan.descriptions[variantIndex],
        packages: [
          {
            name: plan.service,
            price: priceFrom,
            details: 'Консультация, подготовка, бронь даты и работа по утвержденному таймингу.',
          },
          {
            name: `${plan.service} плюс`,
            price: Math.round(priceFrom * 1.55),
            details: 'Расширенный пакет с дополнительным временем и персональной подготовкой.',
          },
        ],
      };
    }),
  );
}

function getSeedAvailability(daysAhead: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Almaty',
    year: 'numeric',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = new Date(Number(values.year), Number(values.month) - 1, Number(values.day));
  const months = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ];
  date.setDate(date.getDate() + daysAhead);
  return `Свободен ${date.getDate()} ${months[date.getMonth()]}`;
}

const fullVendorBase = [...vendorBase, ...createLaunchCategoryVendors()];

export const vendors: Vendor[] = fullVendorBase.map((vendor, index) => {
  const reviews = vendorReviews[vendor.id] ?? [];

  return {
    ...vendor,
    contactPhone: vendorPhones[vendor.id] ?? `+7701556${String(index + 1).padStart(5, '0')}`,
    reviewCount: Math.max(reviews.length, Math.round(vendor.weddings / 7)),
    reviews,
  };
});

export const vendorServices: VendorService[] = [
  {
    id: 'svc1',
    title: 'Камерный декор',
    category: 'Декор и флористика',
    price: '280.000 ₸',
    priceType: 'От',
    packageDetails: 'Президиум, зона церемонии, базовая флористика.',
    conditions: 'Предоплата 30%, монтаж в день мероприятия.',
    moderationStatus: 'Опубликовано',
    updatedAt: 'Сегодня',
  },
  {
    id: 'svc2',
    title: 'Полное оформление зала',
    category: 'Декор и флористика',
    price: '650.000 ₸',
    priceType: 'От',
    packageDetails: 'Концепт, зал, фотозона, координация монтажа.',
    conditions: 'Выезд по Алматы включен, демонтаж после банкета.',
    moderationStatus: 'Отклонено',
    moderationNote:
      'Уточните, входит ли демонтаж в стоимость, и добавьте срок подготовки концепции.',
    updatedAt: 'Вчера',
  },
];

export const vendorPortfolio: PortfolioItem[] = [
  {
    id: 'pf1',
    title: 'Камерное событие в саду',
    category: 'Декор и флористика',
    description:
      'Легкая флористика, зона церемонии, теплый свет и минималистичный президиум.',
    mediaCount: 18,
    coverLabel: 'Сад',
    moderationStatus: 'Опубликовано',
    updatedAt: 'Сегодня',
  },
  {
    id: 'pf2',
    title: 'Большой банкет на 180 гостей',
    category: 'Декор и флористика',
    description:
      'Полное оформление зала: президиум, гостевые столы, welcome-зона и фотозона.',
    mediaCount: 24,
    coverLabel: 'Зал',
    moderationStatus: 'Отклонено',
    moderationNote:
      'Добавьте крупные планы декора и замените первое фото на более светлое.',
    updatedAt: 'Вчера',
  },
  {
    id: 'pf3',
    title: 'Национальная церемония',
    category: 'Декор и флористика',
    description:
      'Сочетание национальных элементов, живых цветов и мягкого сценического света.',
    mediaCount: 12,
    coverLabel: 'Кейс',
    moderationStatus: 'Опубликовано',
    updatedAt: '3 дня назад',
  },
];

export const clientLeads: Lead[] = [
  {
    id: 'l1',
    title: 'Декор на 24 октября',
    vendor: 'Aigerim Decor Studio',
    client: 'Вы',
    date: '24 октября',
    guests: 120,
    budget: 'до 700.000 ₸',
    status: 'Ожидает ответа',
    lastUpdate: '10 минут назад',
  },
  {
    id: 'l2',
    title: 'Фото полного дня',
    vendor: 'Timur Photo',
    client: 'Вы',
    date: '7 октября',
    guests: 80,
    budget: 'до 350.000 ₸',
    status: 'В работе',
    lastUpdate: 'Сегодня',
  },
];

export const vendorLeads: Lead[] = [
  {
    id: 'vl1',
    title: 'Оформление банкетного зала',
    vendor: 'Ваш профиль',
    client: 'Алия',
    date: '24 октября',
    guests: 120,
    budget: '650.000 ₸',
    status: 'Новая',
    lastUpdate: '5 минут назад',
  },
  {
    id: 'vl2',
    title: 'Камерное событие',
    vendor: 'Ваш профиль',
    client: 'Данияр',
    date: '2 октября',
    guests: 45,
    budget: '320.000 ₸',
    status: 'Ожидает подтверждения',
    lastUpdate: '1 час назад',
  },
];

export const chatMessages: ChatMessage[] = [
  {
    id: 'm1',
    leadId: 'l1',
    authorRole: 'client',
    authorName: 'Алия',
    text: 'Здравствуйте! Хотим оформить банкетный зал 24 октября.',
    createdAt: '10:20',
    status: 'Прочитано',
  },
  {
    id: 'm2',
    leadId: 'l1',
    authorRole: 'vendor',
    authorName: 'Aigerim Decor Studio',
    text: 'Добрый день! Дата пока свободна. Пришлю два пакета под ваш формат.',
    createdAt: '10:24',
    status: 'Прочитано',
  },
  {
    id: 'm3',
    leadId: 'l2',
    authorRole: 'vendor',
    authorName: 'Timur Photo',
    text: 'Здравствуйте, на 7 октября свободен полный день.',
    createdAt: 'Сегодня',
    status: 'Отправлено',
  },
  {
    id: 'm4',
    leadId: 'vl1',
    authorRole: 'client',
    authorName: 'Алия',
    text: 'Добрый день, свободна ли дата 24 октября?',
    createdAt: '5 мин',
    status: 'Прочитано',
  },
];

export const calendarDays: CalendarDay[] = [
  { date: '24', month: 'Авг', status: 'Ожидает' },
  { date: '25', month: 'Авг', status: 'Свободно' },
  { date: '31', month: 'Авг', status: 'Занято' },
  { date: '02', month: 'Сен', status: 'Ожидает' },
  { date: '07', month: 'Сен', status: 'Свободно' },
  { date: '14', month: 'Сен', status: 'Занято' },
];

export const clientTabs: Array<{ key: ClientTab; label: string }> = [
  { key: 'home', label: 'Главная' },
  { key: 'catalog', label: 'Каталог' },
  { key: 'saved', label: 'Избранное' },
  { key: 'requests', label: 'Заявки' },
  { key: 'profile', label: 'Профиль' },
];

export const vendorTabs: Array<{ key: VendorTab; label: string }> = [
  { key: 'home', label: 'Главная' },
  { key: 'requests', label: 'Заявки' },
  { key: 'calendar', label: 'Календарь' },
  { key: 'messages', label: 'Сообщения' },
  { key: 'profile', label: 'Профиль' },
];
