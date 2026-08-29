import {
  createNavigationContainerRef,
  NavigationContainer,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import type { LucideIcon } from 'lucide-react-native';
import {
  CalendarDays,
  ClipboardList,
  Heart,
  Home,
  LayoutDashboard,
  MessageCircle,
  Search,
  UserRound,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { getCategories, getVendors } from './src/api/catalog';
import {
  getLeads,
  updateLeadStatus as updateLeadStatusRequest,
} from './src/api/leads';
import { Header } from './src/components/Header';
import {
  categories as mockCategories,
  clientLeads,
  vendorLeads,
  vendorPortfolio,
  vendors as mockVendors,
  vendorServices,
} from './src/data/mock';
import { ChatScreen } from './src/screens/ChatScreen';
import { LeadDetailScreen } from './src/screens/LeadDetailScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import {
  CatalogScreen,
  type CatalogSort,
} from './src/screens/client/CatalogScreen';
import { ClientHomeScreen } from './src/screens/client/ClientHomeScreen';
import { ClientProfileScreen } from './src/screens/client/ClientProfileScreen';
import { ClientRequestsScreen } from './src/screens/client/ClientRequestsScreen';
import { SavedScreen } from './src/screens/client/SavedScreen';
import { CalendarScreen } from './src/screens/vendor/CalendarScreen';
import { MessagesScreen } from './src/screens/vendor/MessagesScreen';
import { VendorHomeScreen } from './src/screens/vendor/VendorHomeScreen';
import { VendorPortfolioScreen } from './src/screens/vendor/VendorPortfolioScreen';
import { VendorProfileScreen } from './src/screens/vendor/VendorProfileScreen';
import { VendorRequestsScreen } from './src/screens/vendor/VendorRequestsScreen';
import { VendorServiceFormScreen } from './src/screens/vendor/VendorServiceFormScreen';
import { VendorDetailScreen } from './src/screens/VendorDetailScreen';
import {
  getInitialNotificationTarget,
  subscribeToNotificationTargets,
  type NotificationTarget,
} from './src/notifications/pushNotifications';
import {
  clearSession,
  loadSession,
  saveSession,
} from './src/storage/sessionStorage';
import { clearAllDrafts } from './src/storage/draftStorage';
import {
  cleanupPortfolioMedia,
  clearAllMedia,
} from './src/storage/mediaStorage';
import { colors, styles } from './src/theme/styles';
import type {
  ClientTab,
  Lead,
  PortfolioItem,
  Role,
  UserSession,
  Vendor,
  VendorService,
} from './src/types';

const brandLogo = require('./assets/temp-logo.png');

type ClientTabParamList = {
  Главная: undefined;
  Каталог: undefined;
  Избранное: undefined;
  Заявки: undefined;
  Профиль: undefined;
};

type VendorTabParamList = {
  Главная: undefined;
  Заявки: undefined;
  Календарь: undefined;
  Сообщения: undefined;
  Профиль: undefined;
};

type RootStackParamList = {
  Onboarding: undefined;
  ClientTabs: NavigatorScreenParams<ClientTabParamList> | undefined;
  VendorTabs: NavigatorScreenParams<VendorTabParamList> | undefined;
  VendorDetail: { vendorId: string };
  LeadDetail: { leadId: string; role: Role };
  Chat: { leadId: string; role: Role };
  VendorServiceForm: { serviceId?: string } | undefined;
  VendorPortfolio: undefined;
};

type StackProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

const RootStack = createNativeStackNavigator<RootStackParamList>();
const ClientTabs = createBottomTabNavigator<ClientTabParamList>();
const VendorTabs = createBottomTabNavigator<VendorTabParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const clientPersistentTabs: Array<{
  label: keyof ClientTabParamList;
  icon: LucideIcon;
}> = [
  { label: 'Главная', icon: Home },
  { label: 'Каталог', icon: Search },
  { label: 'Избранное', icon: Heart },
  { label: 'Заявки', icon: ClipboardList },
  { label: 'Профиль', icon: UserRound },
];

const vendorPersistentTabs: Array<{
  label: keyof VendorTabParamList;
  icon: LucideIcon;
}> = [
  { label: 'Главная', icon: LayoutDashboard },
  { label: 'Заявки', icon: ClipboardList },
  { label: 'Календарь', icon: CalendarDays },
  { label: 'Сообщения', icon: MessageCircle },
  { label: 'Профиль', icon: UserRound },
];

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [pendingNotificationTarget, setPendingNotificationTarget] =
    useState<NotificationTarget | null>(null);
  const [role, setRole] = useState<Role>('client');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [selectedCity, setSelectedCity] = useState('Все города');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [catalogSort, setCatalogSort] =
    useState<CatalogSort>('recommended');
  const [catalogShortsFullscreen, setCatalogShortsFullscreen] = useState(false);
  const [savedVendorIds, setSavedVendorIds] = useState<string[]>(['v1']);
  const [catalogCategories, setCatalogCategories] =
    useState<string[]>(mockCategories);
  const [catalogVendors, setCatalogVendors] = useState<Vendor[]>(mockVendors);
  const [leads, setLeads] = useState<Lead[]>(clientLeads);
  const [vendorLeadItems, setVendorLeadItems] = useState<Lead[]>(vendorLeads);
  const [dataStatus, setDataStatus] =
    useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [dataError, setDataError] = useState('');
  const [services, setServices] = useState<VendorService[]>(vendorServices);
  const [portfolioItems, setPortfolioItems] =
    useState<PortfolioItem[]>(vendorPortfolio);

  useEffect(() => {
    let isMounted = true;
    const subscription = subscribeToNotificationTargets((target) => {
      setPendingNotificationTarget(target);
    });

    void getInitialNotificationTarget().then((target) => {
      if (isMounted && target) {
        setPendingNotificationTarget(target);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    void cleanupPortfolioMedia(vendorPortfolio.map((item) => item.id)).catch(
      () => undefined,
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadSession().then((storedSession) => {
      if (!isMounted) {
        return;
      }

      if (storedSession) {
        setSession(storedSession);
        setRole(storedSession.role);
      }

      setIsBootstrapping(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const loadMarketplaceData = async () => {
    if (!session) {
      return;
    }

    setDataStatus('loading');
    setDataError('');

    try {
      const [nextCategories, nextVendors, nextClientLeads, nextVendorLeads] =
        await Promise.all([
          getCategories(),
          getVendors(),
          getLeads('client', session.accessToken),
          getLeads('vendor', session.accessToken),
        ]);

      setCatalogCategories(nextCategories);
      setCatalogVendors(nextVendors);
      setLeads(nextClientLeads);
      setVendorLeadItems(nextVendorLeads);
      setDataStatus('ready');
    } catch (error) {
      setDataStatus('error');
      setDataError(
        error instanceof Error
          ? `${error.message} Показываем доступные данные.`
          : 'Не удалось обновить данные. Показываем доступные данные.',
      );
    }
  };

  useEffect(() => {
    if (session) {
      void loadMarketplaceData();
    }
  }, [session?.accessToken]);

  const handleCompleteOnboarding = (nextSession: UserSession) => {
    setIsNavigationReady(false);
    setSession(nextSession);
    setRole(nextSession.role);
    void saveSession(nextSession).catch(() => undefined);
  };

  const handleLogout = () => {
    setIsNavigationReady(false);
    setPendingNotificationTarget(null);
    setSession(null);
    setRole('client');
    setDataStatus('idle');
    setDataError('');
    void (async () => {
      await clearSession();
      await clearAllDrafts();
      await clearAllMedia();
    })().catch(() => undefined);
  };

  const handleRoleChange = (nextRole: Role) => {
    if (!session) {
      return;
    }

    const nextSession = { ...session, role: nextRole };
    setRole(nextRole);
    setSession(nextSession);
    void saveSession(nextSession).catch(() => undefined);
  };

  useEffect(() => {
    if (
      !session ||
      !pendingNotificationTarget ||
      !isNavigationReady ||
      !navigationRef.isReady() ||
      dataStatus === 'idle' ||
      dataStatus === 'loading'
    ) {
      return;
    }

    const target = pendingNotificationTarget;

    if (target.role !== role) {
      handleRoleChange(target.role);
    }

    if (target.screen === 'requests') {
      if (target.role === 'client') {
        navigationRef.navigate('ClientTabs', { screen: 'Заявки' });
      } else {
        navigationRef.navigate('VendorTabs', { screen: 'Заявки' });
      }
    } else if (target.screen === 'lead') {
      navigationRef.navigate('LeadDetail', {
        leadId: target.leadId,
        role: target.role,
      });
    } else {
      navigationRef.navigate('Chat', {
        leadId: target.leadId,
        role: target.role,
      });
    }

    setPendingNotificationTarget(null);
  }, [
    dataStatus,
    isNavigationReady,
    pendingNotificationTarget,
    role,
    session,
  ]);

  const filteredVendors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const result = catalogVendors.filter((vendor) => {
      const categoryMatch =
        selectedCategory === 'Все' || vendor.category === selectedCategory;
      const cityMatch =
        selectedCity === 'Все города' || vendor.city === selectedCity;
      const priceMatch = maxPrice === null || vendor.priceFrom <= maxPrice;
      const ratingMatch = vendor.rating >= minRating;
      const queryMatch =
        query.length === 0 ||
        vendor.name.toLowerCase().includes(query) ||
        vendor.category.toLowerCase().includes(query) ||
        vendor.city.toLowerCase().includes(query) ||
        vendor.description.toLowerCase().includes(query);

      return categoryMatch && cityMatch && priceMatch && ratingMatch && queryMatch;
    });

    if (catalogSort === 'rating') {
      return [...result].sort((a, b) => b.rating - a.rating);
    }

    if (catalogSort === 'price') {
      return [...result].sort((a, b) => a.priceFrom - b.priceFrom);
    }

    return result;
  }, [
    catalogSort,
    catalogVendors,
    maxPrice,
    minRating,
    searchQuery,
    selectedCategory,
    selectedCity,
  ]);

  const catalogCities = useMemo(
    () => Array.from(new Set(catalogVendors.map((vendor) => vendor.city))),
    [catalogVendors],
  );

  const savedVendors = catalogVendors.filter((vendor) =>
    savedVendorIds.includes(vendor.id),
  );

  const toggleSaved = (vendorId: string) => {
    setSavedVendorIds((current) =>
      current.includes(vendorId)
        ? current.filter((id) => id !== vendorId)
        : [...current, vendorId],
    );
  };

  const updateLeadStatus = async (leadId: string, status: Lead['status']) => {
    const previousClientLeads = leads;
    const previousVendorLeads = vendorLeadItems;
    const update = (current: Lead[]) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, status, lastUpdate: 'Только что' } : lead,
      );

    setLeads(update);
    setVendorLeadItems(update);

    try {
      await updateLeadStatusRequest(leadId, status, session?.accessToken);
    } catch (error) {
      setLeads(previousClientLeads);
      setVendorLeadItems(previousVendorLeads);
      setDataStatus('error');
      setDataError(
        error instanceof Error
          ? error.message
          : 'Не удалось изменить статус заявки.',
      );
    }
  };

  const findLead = (leadId: string) =>
    [...leads, ...vendorLeadItems].find((lead) => lead.id === leadId) ?? null;

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.bootstrapping}>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="Логотип"
            source={brandLogo}
            style={styles.bootLogo}
          />
          <Text style={styles.bootstrappingText}>Открываем приложение</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <NavigationContainer
        key="guest"
        ref={navigationRef}
        onReady={() => setIsNavigationReady(true)}
      >
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Onboarding">
            {() => (
              <SafeAreaView style={styles.safeArea}>
                <StatusBar style="dark" />
                <OnboardingScreen onComplete={handleCompleteOnboarding} />
              </SafeAreaView>
            )}
          </RootStack.Screen>
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer
      key="authenticated"
      ref={navigationRef}
      onReady={() => setIsNavigationReady(true)}
    >
      <RootStack.Navigator
        initialRouteName="ClientTabs"
        screenOptions={{ headerShown: false }}
      >
        <RootStack.Screen name="ClientTabs">
          {(props) => (
            <AuthenticatedShell
              session={session}
              role={role}
              isImmersive={catalogShortsFullscreen}
              showHeader={false}
              showPersistentNavigation={false}
              onRoleChange={(nextRole) => {
                handleRoleChange(nextRole);
                props.navigation.reset({
                  index: 0,
                  routes: [
                    { name: nextRole === 'client' ? 'ClientTabs' : 'VendorTabs' },
                  ],
                });
              }}
              onLogout={handleLogout}
            >
              <ClientTabNavigator
                rootNavigation={props.navigation}
                accessToken={session.accessToken}
                categories={catalogCategories}
                vendors={catalogVendors}
                filteredVendors={filteredVendors}
                savedVendors={savedVendors}
                savedVendorIds={savedVendorIds}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                selectedCity={selectedCity}
                maxPrice={maxPrice}
                minRating={minRating}
                catalogSort={catalogSort}
                cities={catalogCities}
                leads={leads}
                isDataLoading={dataStatus === 'loading'}
                dataError={dataError}
                onReloadData={loadMarketplaceData}
                onSearchChange={setSearchQuery}
                onCategoryChange={setSelectedCategory}
                onCityChange={setSelectedCity}
                onMaxPriceChange={setMaxPrice}
                onMinRatingChange={setMinRating}
                onSortChange={setCatalogSort}
                onToggleSaved={toggleSaved}
                isCatalogShortsFullscreen={catalogShortsFullscreen}
                onCatalogShortsFullscreenChange={setCatalogShortsFullscreen}
              />
            </AuthenticatedShell>
          )}
        </RootStack.Screen>

        <RootStack.Screen name="VendorTabs">
          {(props) => (
            <AuthenticatedShell
              session={session}
              role={role}
              showHeader={false}
              showPersistentNavigation={false}
              onRoleChange={(nextRole) => {
                handleRoleChange(nextRole);
                props.navigation.reset({
                  index: 0,
                  routes: [
                    { name: nextRole === 'client' ? 'ClientTabs' : 'VendorTabs' },
                  ],
                });
              }}
              onLogout={handleLogout}
            >
              <VendorTabNavigator
                rootNavigation={props.navigation}
                accessToken={session.accessToken}
                leads={vendorLeadItems}
                services={services}
                portfolioItems={portfolioItems}
                onDeleteService={(serviceId) =>
                  setServices((current) =>
                    current.filter((service) => service.id !== serviceId),
                  )
                }
                isDataLoading={dataStatus === 'loading'}
                dataError={dataError}
                onReloadData={loadMarketplaceData}
              />
            </AuthenticatedShell>
          )}
        </RootStack.Screen>

        <RootStack.Screen name="VendorDetail">
          {(props) => (
            <AuthenticatedShell
              session={session}
              role={role}
              activeTab="Каталог"
              isImmersive
              showHeader={false}
              showPersistentNavigation={false}
              onRoleChange={(nextRole) => {
                handleRoleChange(nextRole);
                props.navigation.reset({
                  index: 0,
                  routes: [
                    { name: nextRole === 'client' ? 'ClientTabs' : 'VendorTabs' },
                  ],
                });
              }}
              onLogout={handleLogout}
            >
              <VendorDetailRoute
                {...props}
                vendors={catalogVendors}
                session={session}
                savedVendorIds={savedVendorIds}
                onToggleSaved={toggleSaved}
                onLeadCreated={(lead) => {
                  setLeads((current) => [lead, ...current]);
                  setVendorLeadItems((current) => [lead, ...current]);
                }}
                onOpenChat={(leadId) =>
                  props.navigation.navigate('Chat', {
                    leadId,
                    role: 'client',
                  })
                }
              />
            </AuthenticatedShell>
          )}
        </RootStack.Screen>

        <RootStack.Screen name="LeadDetail">
          {(props) => (
            <AuthenticatedShell
              session={session}
              role={role}
              activeTab="Заявки"
              onRoleChange={(nextRole) => {
                handleRoleChange(nextRole);
                props.navigation.reset({
                  index: 0,
                  routes: [
                    { name: nextRole === 'client' ? 'ClientTabs' : 'VendorTabs' },
                  ],
                });
              }}
              onLogout={handleLogout}
            >
              <LeadDetailRoute
                {...props}
                lead={findLead(props.route.params.leadId)}
                onUpdateStatus={updateLeadStatus}
              />
            </AuthenticatedShell>
          )}
        </RootStack.Screen>

        <RootStack.Screen name="Chat">
          {(props) => (
            <AuthenticatedShell
              session={session}
              role={role}
              activeTab={role === 'client' ? 'Заявки' : 'Сообщения'}
              onRoleChange={(nextRole) => {
                handleRoleChange(nextRole);
                props.navigation.reset({
                  index: 0,
                  routes: [
                    { name: nextRole === 'client' ? 'ClientTabs' : 'VendorTabs' },
                  ],
                });
              }}
              onLogout={handleLogout}
            >
              <ChatRoute
                {...props}
                session={session}
                lead={findLead(props.route.params.leadId)}
              />
            </AuthenticatedShell>
          )}
        </RootStack.Screen>

        <RootStack.Screen name="VendorServiceForm">
          {(props) => (
            <AuthenticatedShell
              session={session}
              role={role}
              activeTab="Профиль"
              onRoleChange={(nextRole) => {
                handleRoleChange(nextRole);
                props.navigation.reset({
                  index: 0,
                  routes: [
                    { name: nextRole === 'client' ? 'ClientTabs' : 'VendorTabs' },
                  ],
                });
              }}
              onLogout={handleLogout}
            >
              <ScrollView contentContainerStyle={styles.content}>
                <VendorServiceFormScreen
                  service={services.find(
                    (service) => service.id === props.route.params?.serviceId,
                  )}
                  accessToken={session.accessToken}
                  onBack={() => props.navigation.goBack()}
                  onSaved={(service) => {
                    setServices((current) =>
                      current.some((item) => item.id === service.id)
                        ? current.map((item) =>
                            item.id === service.id ? service : item,
                          )
                        : [service, ...current],
                    );
                    props.navigation.goBack();
                  }}
                />
              </ScrollView>
            </AuthenticatedShell>
          )}
        </RootStack.Screen>

        <RootStack.Screen name="VendorPortfolio">
          {(props) => (
            <AuthenticatedShell
              session={session}
              role={role}
              activeTab="Профиль"
              onRoleChange={(nextRole) => {
                handleRoleChange(nextRole);
                props.navigation.reset({
                  index: 0,
                  routes: [
                    { name: nextRole === 'client' ? 'ClientTabs' : 'VendorTabs' },
                  ],
                });
              }}
              onLogout={handleLogout}
            >
              <ScrollView contentContainerStyle={styles.content}>
                <VendorPortfolioScreen
                  items={portfolioItems}
                  accessToken={session.accessToken}
                  onBack={() => props.navigation.goBack()}
                  onCreated={(item) => {
                    setPortfolioItems((current) => [item, ...current]);
                  }}
                  onDeleted={(itemId) => {
                    setPortfolioItems((current) =>
                      current.filter((item) => item.id !== itemId),
                    );
                  }}
                  onUpdated={(item) => {
                    setPortfolioItems((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id ? item : currentItem,
                      ),
                    );
                  }}
                />
              </ScrollView>
            </AuthenticatedShell>
          )}
        </RootStack.Screen>
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function AuthenticatedShell({
  session,
  role,
  activeTab,
  isImmersive = false,
  showHeader = true,
  showPersistentNavigation = true,
  onRoleChange,
  onLogout,
  children,
}: {
  session: UserSession;
  role: Role;
  activeTab?: string;
  isImmersive?: boolean;
  showHeader?: boolean;
  showPersistentNavigation?: boolean;
  onRoleChange: (role: Role) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={[styles.safeArea, isImmersive && styles.safeAreaDark]}>
      <StatusBar style={isImmersive ? 'light' : 'dark'} />
      <View style={[styles.appShell, isImmersive && styles.appShellDark]}>
        {showHeader ? (
          <Header
            role={role}
            city={session.city}
            name={session.name}
            onRoleChange={onRoleChange}
            onLogout={onLogout}
          />
        ) : null}
        <View style={[styles.navigatorBody, isImmersive && styles.navigatorBodyDark]}>
          {children}
        </View>
        {showPersistentNavigation ? (
          <PersistentBottomNavigation role={role} activeTab={activeTab} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function PersistentBottomNavigation({
  role,
  activeTab,
}: {
  role: Role;
  activeTab?: string;
}) {
  const items = role === 'client' ? clientPersistentTabs : vendorPersistentTabs;

  const navigateToTab = (label: string) => {
    if (role === 'client') {
      navigationRef.navigate('ClientTabs', {
        screen: label as keyof ClientTabParamList,
      });
      return;
    }

    navigationRef.navigate('VendorTabs', {
      screen: label as keyof VendorTabParamList,
    });
  };

  return (
    <View accessibilityRole="tablist" style={styles.persistentTabBar}>
      {items.map(({ label, icon: Icon }) => {
        const active = label === activeTab;

        return (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => navigateToTab(label)}
            style={({ pressed }) => [
              styles.persistentTabItem,
              pressed && styles.pressed,
            ]}
          >
            <Icon
              color={active ? colors.coral : colors.muted}
              size={22}
              strokeWidth={2.4}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.persistentTabLabel,
                active && styles.persistentTabLabelActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ClientTabNavigator({
  rootNavigation,
  accessToken,
  categories,
  vendors,
  filteredVendors,
  savedVendors,
  savedVendorIds,
  searchQuery,
  selectedCategory,
  selectedCity,
  maxPrice,
  minRating,
  catalogSort,
  cities,
  leads,
  isDataLoading,
  dataError,
  onReloadData,
  onSearchChange,
  onCategoryChange,
  onCityChange,
  onMaxPriceChange,
  onMinRatingChange,
  onSortChange,
  onToggleSaved,
  isCatalogShortsFullscreen,
  onCatalogShortsFullscreenChange,
}: {
  rootNavigation: StackProps<'ClientTabs'>['navigation'];
  accessToken?: string;
  categories: string[];
  vendors: Vendor[];
  filteredVendors: Vendor[];
  savedVendors: Vendor[];
  savedVendorIds: string[];
  searchQuery: string;
  selectedCategory: string;
  selectedCity: string;
  maxPrice: number | null;
  minRating: number;
  catalogSort: CatalogSort;
  cities: string[];
  leads: Lead[];
  isDataLoading: boolean;
  dataError: string;
  onReloadData: () => void;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onCityChange: (city: string) => void;
  onMaxPriceChange: (price: number | null) => void;
  onMinRatingChange: (rating: number) => void;
  onSortChange: (sort: CatalogSort) => void;
  onToggleSaved: (vendorId: string) => void;
  isCatalogShortsFullscreen: boolean;
  onCatalogShortsFullscreenChange: (isFullscreen: boolean) => void;
}) {
  return (
    <ClientTabs.Navigator
      initialRouteName="Каталог"
      screenOptions={{ ...tabScreenOptions, tabBarStyle: { display: 'none' as const } }}
    >
      <ClientTabs.Screen
        name="Главная"
        options={{ tabBarIcon: createTabIcon(Home) }}
      >
        {({ navigation }) => (
          <ScreenScroll>
            <ClientHomeScreen
              savedCount={savedVendorIds.length}
              leadCount={leads.length}
              savedVendorIds={savedVendorIds}
              categories={categories}
              vendors={vendors}
              onCategoryPick={(category) => {
                onCategoryChange(category);
                navigation.navigate('Каталог');
              }}
              onOpenCatalog={() => navigation.navigate('Каталог')}
              onOpenRequests={() => navigation.navigate('Заявки')}
              onOpenVendor={(vendor) =>
                rootNavigation.navigate('VendorDetail', { vendorId: vendor.id })
              }
              onToggleSaved={onToggleSaved}
            />
          </ScreenScroll>
        )}
      </ClientTabs.Screen>

      <ClientTabs.Screen
        name="Каталог"
        options={{ tabBarIcon: createTabIcon(Search) }}
      >
        {() => (
          <CatalogScreen
            vendors={filteredVendors}
            categories={categories}
            cities={cities}
            savedVendorIds={savedVendorIds}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            selectedCity={selectedCity}
            maxPrice={maxPrice}
            minRating={minRating}
            sort={catalogSort}
            isLoading={isDataLoading}
            error={dataError}
            onRetry={onReloadData}
            onSearchChange={onSearchChange}
            onCategoryChange={onCategoryChange}
            onCityChange={onCityChange}
            onMaxPriceChange={onMaxPriceChange}
            onMinRatingChange={onMinRatingChange}
            onSortChange={onSortChange}
            onOpenVendor={(vendor) => {
              onCatalogShortsFullscreenChange(false);
              rootNavigation.navigate('VendorDetail', { vendorId: vendor.id });
            }}
            onToggleSaved={onToggleSaved}
            onShortsFullscreenChange={onCatalogShortsFullscreenChange}
            minimalMode
          />
        )}
      </ClientTabs.Screen>

      <ClientTabs.Screen
        name="Избранное"
        options={{ tabBarIcon: createTabIcon(Heart) }}
      >
        {() => (
          <ScreenScroll>
            <SavedScreen
              vendors={savedVendors}
              savedVendorIds={savedVendorIds}
              onOpenVendor={(vendor) =>
                rootNavigation.navigate('VendorDetail', { vendorId: vendor.id })
              }
              onToggleSaved={onToggleSaved}
            />
          </ScreenScroll>
        )}
      </ClientTabs.Screen>

      <ClientTabs.Screen
        name="Заявки"
        options={{ tabBarIcon: createTabIcon(ClipboardList) }}
      >
        {() => (
          <ScreenScroll>
            <ClientRequestsScreen
              leads={leads}
              isLoading={isDataLoading}
              error={dataError}
              onRetry={onReloadData}
              onOpenLead={(lead) =>
                rootNavigation.navigate('LeadDetail', {
                  leadId: lead.id,
                  role: 'client',
                })
              }
            />
          </ScreenScroll>
        )}
      </ClientTabs.Screen>

      <ClientTabs.Screen
        name="Профиль"
        options={{ tabBarIcon: createTabIcon(UserRound) }}
      >
        {() => (
          <ScreenScroll>
            <ClientProfileScreen accessToken={accessToken} />
          </ScreenScroll>
        )}
      </ClientTabs.Screen>
    </ClientTabs.Navigator>
  );
}

function VendorTabNavigator({
  rootNavigation,
  accessToken,
  leads,
  services,
  portfolioItems,
  onDeleteService,
  isDataLoading,
  dataError,
  onReloadData,
}: {
  rootNavigation: StackProps<'VendorTabs'>['navigation'];
  accessToken?: string;
  leads: Lead[];
  services: VendorService[];
  portfolioItems: PortfolioItem[];
  onDeleteService: (serviceId: string) => void;
  isDataLoading: boolean;
  dataError: string;
  onReloadData: () => void;
}) {
  return (
    <VendorTabs.Navigator screenOptions={tabScreenOptions}>
      <VendorTabs.Screen
        name="Главная"
        options={{ tabBarIcon: createTabIcon(LayoutDashboard) }}
      >
        {() => (
          <ScreenScroll>
            <VendorHomeScreen
              leads={leads}
              isLoading={isDataLoading}
              error={dataError}
              onRetry={onReloadData}
              onOpenLead={(lead) =>
                rootNavigation.navigate('LeadDetail', {
                  leadId: lead.id,
                  role: 'vendor',
                })
              }
            />
          </ScreenScroll>
        )}
      </VendorTabs.Screen>

      <VendorTabs.Screen
        name="Заявки"
        options={{ tabBarIcon: createTabIcon(ClipboardList) }}
      >
        {() => (
          <ScreenScroll>
            <VendorRequestsScreen
              leads={leads}
              isLoading={isDataLoading}
              error={dataError}
              onRetry={onReloadData}
              onOpenLead={(lead) =>
                rootNavigation.navigate('LeadDetail', {
                  leadId: lead.id,
                  role: 'vendor',
                })
              }
            />
          </ScreenScroll>
        )}
      </VendorTabs.Screen>

      <VendorTabs.Screen
        name="Календарь"
        options={{ tabBarIcon: createTabIcon(CalendarDays) }}
      >
        {() => (
          <ScreenScroll>
            <CalendarScreen />
          </ScreenScroll>
        )}
      </VendorTabs.Screen>

      <VendorTabs.Screen
        name="Сообщения"
        options={{ tabBarIcon: createTabIcon(MessageCircle) }}
      >
        {() => (
          <ScreenScroll>
            <MessagesScreen />
          </ScreenScroll>
        )}
      </VendorTabs.Screen>

      <VendorTabs.Screen
        name="Профиль"
        options={{ tabBarIcon: createTabIcon(UserRound) }}
      >
        {() => (
          <ScreenScroll>
            <VendorProfileScreen
              services={services}
              portfolioItems={portfolioItems}
              accessToken={accessToken}
              onAddService={() => rootNavigation.navigate('VendorServiceForm')}
              onEditService={(service) =>
                rootNavigation.navigate('VendorServiceForm', {
                  serviceId: service.id,
                })
              }
              onDeletedService={onDeleteService}
              onOpenPortfolio={() => rootNavigation.navigate('VendorPortfolio')}
            />
          </ScreenScroll>
        )}
      </VendorTabs.Screen>
    </VendorTabs.Navigator>
  );
}

function VendorDetailRoute({
  route,
  navigation,
  vendors,
  session,
  savedVendorIds,
  onToggleSaved,
  onLeadCreated,
  onOpenChat,
}: StackProps<'VendorDetail'> & {
  vendors: Vendor[];
  session: UserSession;
  savedVendorIds: string[];
  onToggleSaved: (vendorId: string) => void;
  onLeadCreated: (lead: Lead) => void;
  onOpenChat: (leadId: string) => void;
}) {
  const vendor = vendors.find((item) => item.id === route.params.vendorId);

  if (!vendor) {
    return <MissingEntity onBack={() => navigation.goBack()} title="Подрядчик не найден" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.vendorDetailContent}>
      <VendorDetailScreen
        vendor={vendor}
        isSaved={savedVendorIds.includes(vendor.id)}
        onBack={() => navigation.goBack()}
        onToggleSaved={() => onToggleSaved(vendor.id)}
        onLeadCreated={onLeadCreated}
        accessToken={session.accessToken}
        initialContactName={session.name}
        initialContactPhone={session.phone}
        onOpenChat={onOpenChat}
      />
    </ScrollView>
  );
}

function LeadDetailRoute({
  route,
  navigation,
  lead,
  onUpdateStatus,
}: StackProps<'LeadDetail'> & {
  lead: Lead | null;
  onUpdateStatus: (leadId: string, status: Lead['status']) => void;
}) {
  if (!lead) {
    return <MissingEntity onBack={() => navigation.goBack()} title="Заявка не найдена" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <LeadDetailScreen
        lead={lead}
        role={route.params.role}
        onBack={() => navigation.goBack()}
        onOpenChat={() =>
          navigation.navigate('Chat', {
            leadId: lead.id,
            role: route.params.role,
          })
        }
        onConfirm={() => onUpdateStatus(lead.id, 'Подтверждена')}
        onDecline={() => onUpdateStatus(lead.id, 'Отклонена')}
      />
    </ScrollView>
  );
}

function ChatRoute({
  route,
  navigation,
  session,
  lead,
}: StackProps<'Chat'> & {
  session: UserSession;
  lead: Lead | null;
}) {
  if (!lead) {
    return <MissingEntity onBack={() => navigation.goBack()} title="Чат не найден" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ChatScreen
        lead={lead}
        role={route.params.role}
        session={session}
        onBack={() => navigation.goBack()}
      />
    </ScrollView>
  );
}

function ScreenScroll({ children }: { children: React.ReactNode }) {
  return <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>;
}

function MissingEntity({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <LeadDetailScreen
        lead={{
          id: 'missing',
          title,
          vendor: 'Не найдено',
          client: 'Не найдено',
          date: 'Не указано',
          guests: 0,
          budget: 'Не указан',
          status: 'Отклонена',
          lastUpdate: 'Сейчас',
        }}
        role="client"
        onBack={onBack}
        onOpenChat={onBack}
        onConfirm={onBack}
        onDecline={onBack}
      />
    </ScrollView>
  );
}

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.coral,
  tabBarInactiveTintColor: colors.muted,
  tabBarHideOnKeyboard: true,
  tabBarLabelPosition: 'below-icon' as const,
  tabBarStyle: {
    position: 'absolute' as const,
    left: 12,
    right: 12,
    bottom: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    borderColor: 'rgba(255, 255, 255, 0.58)',
    borderTopColor: 'rgba(255, 255, 255, 0.62)',
    borderRadius: 26,
    borderWidth: 1,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 76 : 68,
    paddingBottom: Platform.OS === 'ios' ? 14 : 8,
    paddingTop: 8,
    overflow: 'hidden' as const,
    shadowColor: colors.ink,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(22px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
        } as object)
      : {}),
  },
  tabBarItemStyle: {
    minHeight: 56,
    paddingVertical: 3,
  },
  tabBarIconStyle: {
    marginTop: 1,
  },
  tabBarLabelStyle: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600' as const,
    marginBottom: 1,
  },
};

function createTabIcon(Icon: LucideIcon) {
  return ({ color, size }: { color: string; size: number }) => (
    <Icon color={color} size={Math.min(size, 23)} strokeWidth={2.4} />
  );
}
