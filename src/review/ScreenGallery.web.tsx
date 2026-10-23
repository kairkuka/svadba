/*
THESIS: One truthful screen atlas, not scattered screenshots or rebuilt mockups.
OWN-WORLD: SVADBA.kz dark surfaces, restrained coral selection, dense audit controls.
STORY: Find every current state, inspect it live at real device sizes, open it alone.
FIRST VIEWPORT: Inventory at left, selected live phone centered, audit metadata above.
FORM: Focus workspace with optional contact sheet; code-led internal extension.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
*/

import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import {
  getReviewJourney,
  reviewJourneys,
  reviewScreenGroups,
  reviewScreens,
  type ReviewScreen,
  type ReviewScreenGroup,
} from './screenReview';

const reviewerNames = ['Жан', 'Арман', 'Нурислам', 'Админ'] as const;

type ReviewerName = (typeof reviewerNames)[number];

type ReviewSession = {
  reviewer: ReviewerName;
  token: string;
};

type ReviewComment = {
  id: string;
  screenId: string;
  author: ReviewerName;
  text: string;
  createdAt: string;
};

type Device = {
  id: string;
  label: string;
  detail: string;
  width: number;
  height: number;
};

const devices: Device[] = [
  {
    id: 'iphone-390',
    label: 'iPhone 14 / 16e / 17e',
    detail: '390 × 844',
    width: 390,
    height: 844,
  },
  {
    id: 'iphone-393',
    label: 'iPhone 14 Pro / 15 / 15 Pro / 16',
    detail: '393 × 852',
    width: 393,
    height: 852,
  },
  {
    id: 'iphone-402',
    label: 'iPhone 16 Pro / 17 / 17 Pro / 18 Pro',
    detail: '402 × 874',
    width: 402,
    height: 874,
  },
  { id: 'iphone-air', label: 'iPhone Air', detail: '420 × 912', width: 420, height: 912 },
  { id: 'iphone-428', label: 'iPhone 14 Plus', detail: '428 × 926', width: 428, height: 926 },
  {
    id: 'iphone-430',
    label: 'iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus',
    detail: '430 × 932',
    width: 430,
    height: 932,
  },
  {
    id: 'iphone-440',
    label: 'iPhone 16 Pro Max / 17 Pro Max / 18 Pro Max',
    detail: '440 × 956',
    width: 440,
    height: 956,
  },
  { id: 'android', label: 'Android', detail: '412 × 915', width: 412, height: 915 },
  { id: 'compact', label: 'Compact', detail: '360 × 800', width: 360, height: 800 },
];

const stateColors: Record<ReviewScreen['state'], string> = {
  Primary: '#4A5DF9',
  Alternative: '#A8A8A8',
  Populated: '#7080FF',
  Empty: '#e8b45f',
  Overlay: '#d98dff',
};

export function ScreenGallery() {
  const [reviewSession, setReviewSession] = useState<ReviewSession | null>(() =>
    getStoredReviewSession(),
  );
  const [sessionReady, setSessionReady] = useState(false);
  const initialId = getInitialSelectedId();
  const [selectedId, setSelectedId] = useState(initialId);
  const [group, setGroup] = useState<ReviewScreenGroup | 'All'>('All');
  const [query, setQuery] = useState('');
  const [deviceId, setDeviceId] = useState('iphone-390');
  const [mode, setMode] = useState<'journey' | 'atlas' | 'map'>('journey');
  const [journeyId, setJourneyId] = useState<'client' | 'vendor'>(() =>
    getInitialJourneyId(),
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const storedSession = getStoredReviewSession();
    if (!storedSession) {
      setSessionReady(true);
      return () => {
        active = false;
      };
    }

    const verifySession = async () => {
      try {
        const response = await fetch(`${getReviewApiBaseUrl()}/review/session`, {
          headers: { Authorization: `Bearer ${storedSession.token}` },
        });
        if (!response.ok) throw new Error('Session expired');
        const payload = await response.json();
        if (!active) return;
        const reviewer = payload.reviewer as ReviewerName;
        if (!reviewerNames.includes(reviewer)) throw new Error('Invalid reviewer');
        const verifiedSession = { reviewer, token: storedSession.token };
        setReviewSession(verifiedSession);
        storeReviewSession(verifiedSession);
      } catch {
        if (!active) return;
        clearStoredReviewSession();
        setReviewSession(null);
      } finally {
        if (active) setSessionReady(true);
      }
    };

    void verifySession();
    return () => {
      active = false;
    };
  }, []);

  const selected = reviewScreens.find((screen) => screen.id === selectedId) ?? reviewScreens[0];
  const device = devices.find((item) => item.id === deviceId) ?? devices[0];
  const journey = getReviewJourney(journeyId);
  const filteredScreens = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return reviewScreens.filter((screen) => {
      const inJourney = mode !== 'journey' || journey.screenIds.includes(screen.id);
      const inGroup = mode === 'journey' || group === 'All' || screen.group === group;
      const searchable = `${screen.title} ${screen.group} ${screen.description}`.toLocaleLowerCase();
      return inJourney && inGroup && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [group, journey.screenIds, mode, query]);

  const journeyScreens = journey.screenIds
    .map((id) => reviewScreens.find((screen) => screen.id === id))
    .filter((screen): screen is ReviewScreen => Boolean(screen));

  const selectScreen = (screen: ReviewScreen) => {
    const nextJourney = journey.screenIds.includes(screen.id)
      ? journey
      : reviewJourneys.find((item) => item.screenIds.includes(screen.id)) ?? journey;
    setSelectedId(screen.id);
    setJourneyId(nextJourney.id);
    setMode('journey');
    setLeftPanelOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set('gallery', '1');
    url.searchParams.set('selected', screen.id);
    url.searchParams.set('journey', nextJourney.id);
    window.history.replaceState({}, '', url);
  };

  const selectJourney = (nextJourneyId: 'client' | 'vendor') => {
    const nextJourney = getReviewJourney(nextJourneyId);
    const nextScreen = reviewScreens.find((screen) => screen.id === nextJourney.screenIds[0]);
    setJourneyId(nextJourneyId);
    setGroup('All');
    setQuery('');
    setMode('journey');
    if (nextScreen) {
      setSelectedId(nextScreen.id);
      const url = new URL(window.location.href);
      url.searchParams.set('gallery', '1');
      url.searchParams.set('selected', nextScreen.id);
      url.searchParams.set('journey', nextJourneyId);
      window.history.replaceState({}, '', url);
    }
  };

  const handleLogin = (session: ReviewSession) => {
    storeReviewSession(session);
    setReviewSession(session);
  };

  const handleLogout = async () => {
    if (reviewSession) {
      try {
        await fetch(`${getReviewApiBaseUrl()}/review/session`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${reviewSession.token}` },
        });
      } catch {
        // Local logout must still work if the network is temporarily unavailable.
      }
    }
    clearStoredReviewSession();
    setReviewSession(null);
  };

  if (!sessionReady) {
    return <ReviewLoginLoading />;
  }

  if (!reviewSession) {
    return <ReviewLogin onLogin={handleLogin} />;
  }

  return (
    <div style={styles.root}>
      <style>{globalStyles}</style>
      <header className="screen-atlas-header" style={styles.header}>
        <button
          aria-expanded={leftPanelOpen}
          className="screen-atlas-mobile-toggle"
          onClick={() => setLeftPanelOpen((open) => !open)}
          style={styles.mobileToggle}
          type="button"
        >
          Экраны
        </button>
        <div style={styles.brandBlock}>
          <strong style={styles.brand}>SVADBA.kz</strong>
          <span style={styles.productLabel}>UX Control</span>
        </div>
        <div className="screen-atlas-header-meta" style={styles.headerMeta}>
          <span>{reviewScreens.length} экранов</span>
          <span>{reviewJourneys.length} полных пути</span>
          <span>Живой интерфейс</span>
        </div>
        <div className="screen-atlas-view-switch" style={styles.viewSwitch} aria-label="Gallery view">
          <button
            aria-pressed={mode === 'journey'}
            onClick={() => setMode('journey')}
            style={{ ...styles.switchButton, ...(mode === 'journey' ? styles.switchButtonActive : {}) }}
            type="button"
          >
            Маршрут
          </button>
          <button
            aria-pressed={mode === 'atlas'}
            onClick={() => setMode('atlas')}
            style={{ ...styles.switchButton, ...(mode === 'atlas' ? styles.switchButtonActive : {}) }}
            type="button"
          >
            Все экраны
          </button>
          <button
            aria-pressed={mode === 'map'}
            onClick={() => setMode('map')}
            style={{ ...styles.switchButton, ...(mode === 'map' ? styles.switchButtonActive : {}) }}
            type="button"
          >
            Карта
          </button>
        </div>
        <div style={styles.activeReviewer}>
          <span aria-hidden="true" style={styles.activeReviewerAvatar}>
            {reviewSession.reviewer.slice(0, 1)}
          </span>
          <strong style={styles.activeReviewerName}>{reviewSession.reviewer}</strong>
          <button onClick={() => void handleLogout()} style={styles.logoutButton} type="button">
            Выйти
          </button>
        </div>
        <button
          aria-expanded={rightPanelOpen}
          className="screen-atlas-mobile-toggle"
          onClick={() => setRightPanelOpen((open) => !open)}
          style={styles.mobileToggle}
          type="button"
        >
          Комментарии
        </button>
      </header>

      <div className="screen-atlas-workspace" style={styles.workspace}>
        <aside
          className={`screen-atlas-sidebar ${leftPanelOpen ? 'is-open' : ''}`}
          style={styles.sidebar}
        >
          <button
            className="screen-atlas-drawer-close"
            onClick={() => setLeftPanelOpen(false)}
            style={styles.drawerClose}
            type="button"
          >
            Закрыть
          </button>
          <div style={styles.journeyPicker}>
            <span style={styles.sectionLabel}>Пользовательский путь</span>
            {reviewJourneys.map((item) => (
              <button
                key={item.id}
                aria-pressed={journeyId === item.id}
                onClick={() => selectJourney(item.id)}
                style={{
                  ...styles.journeyButton,
                  ...(journeyId === item.id ? styles.journeyButtonActive : {}),
                }}
                type="button"
              >
                <span>{item.label}</span>
                <span style={styles.count}>{item.screenIds.length}</span>
              </button>
            ))}
          </div>
          <label style={styles.searchLabel} htmlFor="screen-search">
            Найти экран или состояние
          </label>
          <input
            id="screen-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по всем экранам"
            style={styles.searchInput}
            type="search"
            value={query}
          />

          {mode !== 'journey' ? <nav className="screen-atlas-group-list" aria-label="Фильтры экранов" style={styles.groupList}>
            <button
              aria-pressed={group === 'All'}
              onClick={() => setGroup('All')}
              style={{ ...styles.groupButton, ...(group === 'All' ? styles.groupButtonActive : {}) }}
              type="button"
            >
              <span>Все разделы</span>
              <span style={styles.count}>{reviewScreens.length}</span>
            </button>
            {reviewScreenGroups.map((item) => {
              const count = reviewScreens.filter((screen) => screen.group === item).length;
              return (
                <button
                  key={item}
                  aria-pressed={group === item}
                  onClick={() => setGroup(item)}
                  style={{ ...styles.groupButton, ...(group === item ? styles.groupButtonActive : {}) }}
                  type="button"
                >
                  <span>{item}</span>
                  <span style={styles.count}>{count}</span>
                </button>
              );
            })}
          </nav> : <div style={styles.journeySummary}>{journey.description}</div>}

          <div className="screen-atlas-screen-list" style={styles.screenList}>
            {filteredScreens.map((screen, index) => {
              const previousScreen = filteredScreens[index - 1];
              const showStage = !previousScreen || previousScreen.group !== screen.group;
              const journeyIndex = journey.screenIds.indexOf(screen.id);
              return (
                <div key={screen.id} style={styles.screenListItem}>
                  {showStage && screen.group !== 'Entry & access' ? (
                    <div style={styles.stageHeading}>{screen.group}</div>
                  ) : null}
                  <button
                    aria-current={screen.id === selected.id ? 'page' : undefined}
                    onClick={() => selectScreen(screen)}
                    style={{
                      ...styles.screenButton,
                      ...(screen.id === selected.id ? styles.screenButtonActive : {}),
                    }}
                    type="button"
                  >
                    <span style={styles.screenStepNumber}>
                      {mode === 'journey' && journeyIndex >= 0 ? journeyIndex + 1 : index + 1}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{ ...styles.stateDot, backgroundColor: stateColors[screen.state] }}
                    />
                    <span style={styles.screenButtonCopy}>
                      <strong style={styles.screenTitle}>{screen.title}</strong>
                      <span style={styles.screenGroup}>{screen.state}</span>
                    </span>
                  </button>
                </div>
              );
            })}
            {filteredScreens.length === 0 ? (
              <div style={styles.noResults}>
                  <strong>Ничего не найдено</strong>
                  <span>Очистите поиск или выберите другой путь.</span>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="screen-atlas-main" style={styles.main}>
          {mode === 'journey' ? (
            <FocusView
              device={device}
              journeyScreens={journeyScreens}
              refreshKey={refreshKey}
              screen={selected}
              onDeviceChange={setDeviceId}
              onRefresh={() => setRefreshKey((current) => current + 1)}
              onSelect={selectScreen}
            />
          ) : mode === 'atlas' ? (
            <ContactSheet screens={filteredScreens} onSelect={selectScreen} />
          ) : (
            <JourneyMap onSelect={selectScreen} />
          )}
        </main>
        <aside
          className={`screen-atlas-details ${rightPanelOpen ? 'is-open' : ''}`}
          style={styles.detailsPanel}
        >
          <button
            className="screen-atlas-drawer-close"
            onClick={() => setRightPanelOpen(false)}
            style={styles.drawerClose}
            type="button"
          >
            Закрыть
          </button>
          <ReviewComments screen={selected} session={reviewSession} />
        </aside>
      </div>
    </div>
  );
}

function ReviewLoginLoading() {
  return (
    <div style={styles.loginPage}>
      <style>{globalStyles}</style>
      <div style={styles.loginLoading}>Проверяем вход...</div>
    </div>
  );
}

function ReviewLogin({ onLogin }: { onLogin: (session: ReviewSession) => void }) {
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submitLogin = async () => {
    const value = username.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${getReviewApiBaseUrl()}/review/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: value }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не удалось войти');
      const reviewer = payload.reviewer as ReviewerName;
      if (!reviewerNames.includes(reviewer) || !payload.token) {
        throw new Error('Сервер вернул неверную сессию');
      }
      onLogin({ reviewer, token: String(payload.token) });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Ошибка входа');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.loginPage}>
      <style>{globalStyles}</style>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitLogin();
        }}
        style={styles.loginCard}
      >
        <div style={styles.loginBrandRow}>
          <strong style={styles.loginBrand}>SVADBA.kz</strong>
          <span style={styles.loginProduct}>UX Control</span>
        </div>
        <div style={styles.loginCopy}>
          <h1 style={styles.loginTitle}>Вход для команды</h1>
          <p style={styles.loginDescription}>Введите своё имя. Пароль не нужен.</p>
        </div>
        <label htmlFor="review-login" style={styles.commentLabel}>
          Логин
        </label>
        <input
          autoCapitalize="words"
          autoComplete="username"
          autoFocus
          id="review-login"
          list="review-logins"
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Жан, Арман, Нурислам или Админ"
          style={styles.loginInput}
          value={username}
        />
        <datalist id="review-logins">
          {reviewerNames.map((name) => <option key={name} value={name} />)}
        </datalist>
        {error ? <div role="alert" style={styles.commentError}>{error}</div> : null}
        <button
          disabled={!username.trim() || submitting}
          style={{
            ...styles.primaryButton,
            ...styles.loginButton,
            ...(!username.trim() || submitting ? styles.buttonDisabled : {}),
          }}
          type="submit"
        >
          {submitting ? 'Входим...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}

function FocusView({
  device,
  journeyScreens,
  onDeviceChange,
  onRefresh,
  onSelect,
  refreshKey,
  screen,
}: {
  device: Device;
  journeyScreens: ReviewScreen[];
  onDeviceChange: (deviceId: string) => void;
  onRefresh: () => void;
  onSelect: (screen: ReviewScreen) => void;
  refreshKey: number;
  screen: ReviewScreen;
}) {
  const frameUrl = getScreenUrl(screen.id);
  const currentIndex = Math.max(
    0,
    journeyScreens.findIndex((item) => item.id === screen.id),
  );
  const previousScreen = journeyScreens[currentIndex - 1];
  const nextScreen = journeyScreens[currentIndex + 1];

  return (
    <div style={styles.focusView}>
      <section className="screen-atlas-inspector" style={styles.inspectorBar}>
        <div style={styles.inspectorCopy}>
          <div style={styles.titleLine}>
            <h1 style={styles.heading}>{screen.title}</h1>
            <span style={styles.stateBadge}>
              <span
                aria-hidden="true"
                style={{ ...styles.stateDot, backgroundColor: stateColors[screen.state] }}
              />
              {screen.state}
            </span>
          </div>
          <p style={styles.description}>{screen.description}</p>
          <span style={styles.routeText}>
            Шаг {currentIndex + 1} из {journeyScreens.length} · ?review={screen.id}
          </span>
        </div>

        <div className="screen-atlas-inspector-actions" style={styles.inspectorActions}>
          <label style={styles.devicePicker}>
            <span style={styles.devicePickerLabel}>Устройство</span>
            <select
              aria-label="Preview device"
              onChange={(event) => onDeviceChange(event.target.value)}
              style={styles.deviceSelect}
              value={device.id}
            >
              {devices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · {item.detail}
                </option>
              ))}
            </select>
          </label>
          <button onClick={onRefresh} style={styles.secondaryButton} type="button">
            Обновить
          </button>
          <button
            onClick={() => window.open(frameUrl, '_blank', 'noopener,noreferrer')}
            style={styles.primaryButton}
            type="button"
          >
            Открыть отдельно
          </button>
        </div>
      </section>

      <section className="screen-atlas-preview" style={styles.previewStage} aria-label={`${screen.title} preview`}>
        <div style={styles.journeyNav}>
          <button
            disabled={!previousScreen}
            onClick={() => previousScreen && onSelect(previousScreen)}
            style={{ ...styles.journeyNavButton, ...(!previousScreen ? styles.buttonDisabled : {}) }}
            type="button"
          >
            ← Назад
          </button>
          <button
            onClick={() => journeyScreens[0] && onSelect(journeyScreens[0])}
            style={styles.journeyHomeButton}
            type="button"
          >
            К началу
          </button>
          <button
            disabled={!nextScreen}
            onClick={() => nextScreen && onSelect(nextScreen)}
            style={{ ...styles.journeyNavButton, ...(!nextScreen ? styles.buttonDisabled : {}) }}
            type="button"
          >
            Дальше →
          </button>
        </div>
        <div style={styles.deviceLabel}>
          <span>{device.label}</span>
          <span>{device.detail} CSS px</span>
        </div>
        <div className="screen-atlas-phone" style={{ ...styles.phoneFrame, width: device.width + 20 }}>
          <iframe
            key={`${screen.id}-${device.id}-${refreshKey}`}
            src={frameUrl}
            style={{ ...styles.previewFrame, width: device.width, height: device.height }}
            title={`${screen.title} at ${device.detail}`}
          />
        </div>
      </section>
    </div>
  );
}

function ContactSheet({
  onSelect,
  screens,
}: {
  onSelect: (screen: ReviewScreen) => void;
  screens: ReviewScreen[];
}) {
  return (
    <section style={styles.sheetWrap}>
      <div style={styles.sheetHeader}>
        <div>
          <h1 style={styles.heading}>Все экраны</h1>
          <p style={styles.description}>
            {screens.length} живых состояний. Нажмите на экран для подробной проверки.
          </p>
        </div>
        <span style={styles.sheetHint}>Экраны загружаются по мере прокрутки</span>
      </div>
      <div style={styles.sheetGrid}>
        {screens.map((screen) => (
          <button
            key={screen.id}
            aria-label={`Inspect ${screen.title}`}
            onClick={() => onSelect(screen)}
            style={styles.sheetCard}
            type="button"
          >
            <div style={styles.sheetFrameWindow}>
              <iframe
                loading="lazy"
                src={getScreenUrl(screen.id)}
                style={styles.sheetFrame}
                tabIndex={-1}
                title={`${screen.title} thumbnail`}
              />
            </div>
            <span style={styles.sheetCardCopy}>
              <strong style={styles.sheetCardTitle}>{screen.title}</strong>
              <span style={styles.sheetCardMeta}>
                <span
                  aria-hidden="true"
                  style={{ ...styles.stateDot, backgroundColor: stateColors[screen.state] }}
                />
                {screen.group} · {screen.state}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function JourneyMap({ onSelect }: { onSelect: (screen: ReviewScreen) => void }) {
  return (
    <section style={styles.mapWrap}>
      <div style={styles.sheetHeader}>
        <div>
          <h1 style={styles.heading}>Карта переходов</h1>
          <p style={styles.description}>
            Последовательность экранов двух ролей. Каждая точка открывает живой интерфейс.
          </p>
        </div>
        <span style={styles.sheetHint}>{reviewScreens.length} состояний</span>
      </div>
      <div style={styles.mapJourneys}>
        {reviewJourneys.map((journey) => {
          const screens = journey.screenIds
            .map((id) => reviewScreens.find((screen) => screen.id === id))
            .filter((screen): screen is ReviewScreen => Boolean(screen));
          return (
            <section key={journey.id} style={styles.mapJourney}>
              <div style={styles.mapJourneyHeader}>
                <strong style={styles.mapJourneyTitle}>{journey.label}</strong>
                <span style={styles.mapJourneyDescription}>{journey.description}</span>
              </div>
              <div style={styles.mapTrack}>
                {screens.map((screen, index) => (
                  <div key={screen.id} style={styles.mapStepWrap}>
                    <button
                      onClick={() => onSelect(screen)}
                      style={styles.mapStep}
                      type="button"
                    >
                      <span style={styles.mapStepNumber}>{index + 1}</span>
                      <span style={styles.mapStepCopy}>
                        <strong>{screen.title}</strong>
                        <span>{screen.group}</span>
                      </span>
                    </button>
                    {index < screens.length - 1 ? (
                      <span aria-hidden="true" style={styles.mapArrow}>→</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function ReviewComments({ screen, session }: { screen: ReviewScreen; session: ReviewSession }) {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadComments = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const response = await fetch(
          `${getReviewApiBaseUrl()}/review/comments?screenId=${encodeURIComponent(screen.id)}`,
          { headers: { Authorization: `Bearer ${session.token}` } },
        );
        if (!response.ok) throw new Error('Не удалось загрузить комментарии');
        const payload = await response.json();
        if (!active) return;
        setComments(Array.isArray(payload.comments) ? payload.comments : []);
        setError('');
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Ошибка загрузки');
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };

    setComments([]);
    void loadComments(true);
    const intervalId = window.setInterval(() => void loadComments(false), 10_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [screen.id, session.token]);

  const submitComment = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch(`${getReviewApiBaseUrl()}/review/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ screenId: screen.id, text }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не удалось отправить комментарий');
      setComments(Array.isArray(payload.comments) ? payload.comments : []);
      setDraft('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.commentsContent}>
      <div style={styles.commentsHeader}>
        <span style={styles.commentsEyebrow}>Комментарии к экрану</span>
        <h2 style={styles.commentsTitle}>{screen.title}</h2>
        <span style={styles.commentsCount}>{comments.length} комментариев</span>
      </div>

      <div style={styles.commentAuthor}>
        <span aria-hidden="true" style={styles.commentAuthorAvatar}>
          {session.reviewer.slice(0, 1)}
        </span>
        <span style={styles.commentAuthorCopy}>
          <small>Комментарий от</small>
          <strong>{session.reviewer}</strong>
        </span>
      </div>

      <div style={styles.commentComposer}>
        <label htmlFor="review-comment" style={styles.commentLabel}>
          Ваш комментарий
        </label>
        <textarea
          id="review-comment"
          maxLength={1000}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void submitComment();
            }
          }}
          placeholder="Что изменить на этом экране?"
          rows={4}
          style={styles.commentInput}
          value={draft}
        />
        <button
          disabled={!draft.trim() || sending}
          onClick={() => void submitComment()}
          style={{
            ...styles.primaryButton,
            ...(!draft.trim() || sending ? styles.buttonDisabled : {}),
          }}
          type="button"
        >
          {sending ? 'Отправка...' : 'Отправить'}
        </button>
        {error ? <div role="alert" style={styles.commentError}>{error}</div> : null}
      </div>

      <div aria-live="polite" style={styles.commentList}>
        {loading ? <div style={styles.commentEmpty}>Загрузка комментариев...</div> : null}
        {!loading && comments.length === 0 ? (
          <div style={styles.commentEmpty}>Комментариев пока нет.</div>
        ) : null}
        {comments.map((comment) => (
          <article key={comment.id} style={styles.commentCard}>
            <div style={styles.commentAvatar} aria-hidden="true">
              {comment.author.slice(0, 1)}
            </div>
            <div style={styles.commentBody}>
              <div style={styles.commentMeta}>
                <strong>{comment.author}</strong>
                <time dateTime={comment.createdAt}>{formatRelativeTime(comment.createdAt)}</time>
              </div>
              <p style={styles.commentText}>{comment.text}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function getStoredReviewSession(): ReviewSession | null {
  try {
    const stored = JSON.parse(window.localStorage.getItem('svadba-review-session') || 'null');
    if (!stored?.token || !reviewerNames.includes(stored.reviewer as ReviewerName)) return null;
    return { reviewer: stored.reviewer as ReviewerName, token: String(stored.token) };
  } catch {
    return null;
  }
}

function storeReviewSession(session: ReviewSession) {
  window.localStorage.setItem('svadba-review-session', JSON.stringify(session));
  window.localStorage.removeItem('svadba-reviewer-name');
}

function clearStoredReviewSession() {
  window.localStorage.removeItem('svadba-review-session');
  window.localStorage.removeItem('svadba-reviewer-name');
}

function getReviewApiBaseUrl() {
  if (
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port === '8081'
  ) {
    return 'http://localhost:4000/api';
  }
  return '/api';
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'только что';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

function getInitialSelectedId() {
  const selected = new URL(window.location.href).searchParams.get('selected');
  return reviewScreens.some((screen) => screen.id === selected)
    ? (selected as string)
    : reviewScreens[0].id;
}

function getInitialJourneyId(): 'client' | 'vendor' {
  const journey = new URL(window.location.href).searchParams.get('journey');
  return journey === 'vendor' ? 'vendor' : 'client';
}

function getScreenUrl(id: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('review', id);
  return url.toString();
}

const globalStyles = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body, #root { min-height: 100%; margin: 0; background: #0C1014; }
  body { overflow: hidden; }
  button, input, textarea { font: inherit; }
  button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid rgba(74, 93, 249, .72); outline-offset: 2px; }
  ::selection { background: #4A5DF9; color: #fff; }
  * { scrollbar-color: #555555 #0C1014; scrollbar-width: thin; }
  *::-webkit-scrollbar { width: 10px; height: 10px; }
  *::-webkit-scrollbar-track { background: #0C1014; }
  *::-webkit-scrollbar-thumb { background: #555555; border: 2px solid #0C1014; border-radius: 8px; }
  @media (max-width: 1080px) {
    .screen-atlas-header { min-height: 110px !important; justify-content: space-between; flex-wrap: wrap; gap: 8px !important; padding: 10px !important; }
    .screen-atlas-header-meta { display: none !important; }
    .screen-atlas-view-switch { order: 4; width: 100%; justify-content: center; }
    .screen-atlas-workspace { height: calc(100vh - 110px) !important; grid-template-columns: 1fr !important; overflow: hidden !important; }
    .screen-atlas-sidebar,
    .screen-atlas-details {
      position: fixed !important;
      top: 0;
      bottom: 0;
      z-index: 30;
      width: min(88vw, 340px) !important;
      max-height: none !important;
      overflow-y: auto !important;
      transition: transform .2s ease;
      box-shadow: 0 0 0 1px #30343A, 0 16px 48px rgba(0, 0, 0, .48);
    }
    .screen-atlas-sidebar { left: 0; transform: translateX(-105%); }
    .screen-atlas-details { right: 0; transform: translateX(105%); }
    .screen-atlas-sidebar.is-open,
    .screen-atlas-details.is-open { transform: translateX(0); }
    .screen-atlas-mobile-toggle,
    .screen-atlas-drawer-close { display: inline-flex !important; }
    .screen-atlas-main { overflow: auto !important; }
    .screen-atlas-inspector { align-items: flex-start !important; flex-direction: column; gap: 16px !important; }
    .screen-atlas-inspector-actions { width: 100%; justify-content: flex-start !important; }
  }
  @media (max-width: 520px) {
    .screen-atlas-header > div:nth-of-type(1) { min-width: auto !important; }
    .screen-atlas-view-switch button { padding-inline: 10px !important; }
    .screen-atlas-preview { padding-inline: 0 !important; overflow-x: hidden !important; }
    .screen-atlas-preview > div:first-child { padding-inline: 12px; }
    .screen-atlas-phone { width: auto !important; padding-inline: 0 !important; border-left: 0 !important; border-right: 0 !important; border-radius: 0 !important; }
  }
`;

const styles: Record<string, CSSProperties> = {
  root: {
    width: '100%',
    minWidth: 0,
    minHeight: '100vh',
    flex: '1 1 auto',
    background: '#0C1014',
    color: '#F5F5F5',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    minHeight: 68,
    display: 'flex',
    alignItems: 'center',
    gap: 28,
    padding: '12px 20px',
    borderBottom: '1px solid #262626',
    background: '#0C1014',
  },
  brandBlock: { display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 230 },
  brand: { fontSize: 18, letterSpacing: '-0.02em' },
  productLabel: { color: '#A8A8A8', fontSize: 14 },
  activeReviewer: { display: 'flex', alignItems: 'center', gap: 8 },
  activeReviewerAvatar: {
    width: 30,
    height: 30,
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    background: '#734E33',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
  },
  activeReviewerName: { color: '#F5F5F5', fontSize: 12 },
  logoutButton: {
    minHeight: 34,
    padding: '0 10px',
    border: '1px solid #3C4147',
    borderRadius: 8,
    background: '#181C20',
    color: '#A8A8A8',
    cursor: 'pointer',
    fontSize: 11,
  },
  headerMeta: {
    display: 'flex',
    flex: 1,
    gap: 18,
    color: '#A8A8A8',
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
  },
  viewSwitch: {
    display: 'flex',
    padding: 3,
    background: '#212328',
    borderRadius: 10,
  },
  switchButton: {
    minHeight: 36,
    padding: '0 14px',
    border: 0,
    borderRadius: 8,
    background: 'transparent',
    color: '#A8A8A8',
    cursor: 'pointer',
  },
  switchButtonActive: { background: '#25292E', color: '#fff' },
  workspace: {
    height: 'calc(100vh - 68px)',
    display: 'grid',
    gridTemplateColumns: '292px minmax(0, 1fr) 340px',
    overflow: 'hidden',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    padding: 16,
    borderRight: '1px solid #262626',
    background: '#0C1014',
  },
  mobileToggle: {
    minHeight: 40,
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 12px',
    border: '1px solid #555555',
    borderRadius: 8,
    background: '#212328',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  },
  drawerClose: {
    minHeight: 40,
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    padding: '0 12px',
    border: '1px solid #555555',
    borderRadius: 8,
    background: '#212328',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
  },
  journeyPicker: { display: 'grid', gap: 5, marginBottom: 16 },
  sectionLabel: { marginBottom: 3, color: '#c9d0d5', fontSize: 12, fontWeight: 650 },
  journeyButton: {
    minHeight: 42,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 11px',
    border: '1px solid #363A3F',
    borderRadius: 8,
    background: '#161A1E',
    color: '#A8A8A8',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 12,
  },
  journeyButtonActive: { borderColor: '#C4935F', background: '#292119', color: '#fff' },
  journeySummary: {
    margin: '14px 0',
    padding: '11px',
    border: '1px solid #30343A',
    borderRadius: 8,
    color: '#A8A8A8',
    fontSize: 11,
    lineHeight: 1.45,
  },
  searchLabel: { marginBottom: 7, color: '#c9d0d5', fontSize: 12, fontWeight: 650 },
  searchInput: {
    width: '100%',
    minHeight: 42,
    padding: '0 12px',
    border: '1px solid #555555',
    borderRadius: 10,
    background: '#212328',
    color: '#fff',
  },
  groupList: { display: 'grid', gap: 2, margin: '14px 0', paddingBottom: 14, borderBottom: '1px solid #262626' },
  groupButton: {
    minHeight: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 9px',
    border: 0,
    borderRadius: 8,
    background: 'transparent',
    color: '#A8A8A8',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 12,
  },
  groupButtonActive: { background: '#212328', color: '#fff' },
  count: { color: '#A8A8A8', fontVariantNumeric: 'tabular-nums' },
  screenList: { minHeight: 0, overflowY: 'auto', display: 'grid', alignContent: 'start', gap: 3, paddingRight: 4 },
  screenListItem: { display: 'grid', gap: 3 },
  stageHeading: {
    padding: '12px 9px 4px',
    color: '#8E969E',
    fontSize: 10,
    fontWeight: 750,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  screenButton: {
    width: '100%',
    minHeight: 54,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 9px',
    border: '1px solid transparent',
    borderRadius: 10,
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
  },
  screenButtonActive: { background: '#212328', borderColor: '#555555' },
  screenStepNumber: {
    width: 24,
    height: 24,
    display: 'grid',
    placeItems: 'center',
    flex: '0 0 auto',
    borderRadius: 6,
    background: '#292119',
    color: '#E9C29B',
    fontSize: 10,
    fontWeight: 750,
    fontVariantNumeric: 'tabular-nums',
  },
  stateDot: { width: 7, height: 7, flex: '0 0 auto', borderRadius: '50%' },
  screenButtonCopy: { minWidth: 0, display: 'grid', gap: 3 },
  screenTitle: { overflow: 'hidden', color: '#F5F5F5', fontSize: 13, textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  screenGroup: { overflow: 'hidden', color: '#A8A8A8', fontSize: 11, textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  noResults: { display: 'grid', gap: 5, padding: 14, color: '#A8A8A8', fontSize: 12 },
  main: { minWidth: 0, overflow: 'auto', background: '#0C1014' },
  detailsPanel: {
    minWidth: 0,
    overflowY: 'auto',
    padding: 16,
    borderLeft: '1px solid #262626',
    background: '#111519',
  },
  commentsContent: { minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 16 },
  commentsHeader: { display: 'grid', gap: 6, paddingBottom: 14, borderBottom: '1px solid #30343A' },
  commentsEyebrow: { color: '#C4935F', fontSize: 11, fontWeight: 750 },
  commentsTitle: { margin: 0, color: '#fff', fontSize: 18, lineHeight: 1.25 },
  commentsCount: { color: '#A8A8A8', fontSize: 11 },
  commentAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: 10,
    border: '1px solid #3C4147',
    borderRadius: 8,
    background: '#181C20',
  },
  commentAuthorAvatar: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    flex: '0 0 auto',
    borderRadius: '50%',
    background: '#734E33',
    color: '#fff',
    fontSize: 12,
    fontWeight: 800,
  },
  commentAuthorCopy: { display: 'grid', gap: 2, color: '#fff', fontSize: 12 },
  commentComposer: { display: 'grid', gap: 8 },
  commentLabel: { color: '#D8DDE1', fontSize: 12, fontWeight: 700 },
  commentInput: {
    width: '100%',
    minHeight: 92,
    resize: 'vertical',
    padding: 10,
    border: '1px solid #555555',
    borderRadius: 9,
    background: '#0C1014',
    color: '#fff',
    lineHeight: 1.45,
  },
  commentError: { color: '#FF8D8D', fontSize: 11, lineHeight: 1.4 },
  commentList: { minHeight: 0, display: 'grid', alignContent: 'start', gap: 9, paddingBottom: 16 },
  commentEmpty: {
    padding: 14,
    border: '1px dashed #3C4147',
    borderRadius: 8,
    color: '#8E969E',
    fontSize: 12,
    textAlign: 'center',
  },
  commentCard: {
    display: 'grid',
    gridTemplateColumns: '32px minmax(0, 1fr)',
    gap: 9,
    padding: 10,
    border: '1px solid #30343A',
    borderRadius: 9,
    background: '#181C20',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    background: '#734E33',
    color: '#fff',
    fontSize: 12,
    fontWeight: 800,
  },
  loginPage: {
    width: '100%',
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 20,
    background: '#0C1014',
    color: '#F5F5F5',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loginCard: {
    width: 'min(100%, 420px)',
    display: 'grid',
    gap: 14,
    padding: 28,
    border: '1px solid #3C4147',
    borderRadius: 12,
    background: '#111519',
    boxShadow: '0 24px 80px rgba(0, 0, 0, .36)',
  },
  loginBrandRow: { display: 'flex', alignItems: 'baseline', gap: 9 },
  loginBrand: { color: '#fff', fontSize: 17 },
  loginProduct: { color: '#A8A8A8', fontSize: 12 },
  loginCopy: { display: 'grid', gap: 7, margin: '12px 0 4px' },
  loginTitle: { margin: 0, color: '#fff', fontSize: 26, lineHeight: 1.15 },
  loginDescription: { margin: 0, color: '#A8A8A8', fontSize: 13, lineHeight: 1.45 },
  loginInput: {
    width: '100%',
    minHeight: 48,
    padding: '0 13px',
    border: '1px solid #555555',
    borderRadius: 9,
    background: '#0C1014',
    color: '#fff',
    fontSize: 15,
  },
  loginButton: { width: '100%', marginTop: 4 },
  loginLoading: { color: '#A8A8A8', fontSize: 13 },
  commentBody: { minWidth: 0, display: 'grid', gap: 6 },
  commentMeta: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    color: '#F5F5F5',
    fontSize: 11,
  },
  commentText: { margin: 0, color: '#D4D8DC', fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  focusView: { minHeight: '100%', display: 'grid', gridTemplateRows: 'auto 1fr' },
  inspectorBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 28,
    padding: '20px 24px',
    borderBottom: '1px solid #262626',
    background: '#0C1014',
  },
  inspectorCopy: { minWidth: 0, display: 'grid', gap: 7 },
  titleLine: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  heading: { margin: 0, color: '#fff', fontSize: 24, lineHeight: 1.15, letterSpacing: '-0.025em' },
  description: { margin: 0, maxWidth: '70ch', color: '#A8A8A8', fontSize: 13, lineHeight: 1.45 },
  routeText: { color: '#A8A8A8', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: 11 },
  stateBadge: {
    minHeight: 26,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '0 9px',
    border: '1px solid #555555',
    borderRadius: 999,
    color: '#c9d0d5',
    fontSize: 11,
  },
  inspectorActions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
  devicePicker: { minWidth: 240, display: 'grid', gap: 4 },
  devicePickerLabel: { color: '#A8A8A8', fontSize: 10 },
  deviceSelect: {
    width: '100%',
    minHeight: 40,
    padding: '0 34px 0 11px',
    border: '1px solid #555555',
    borderRadius: 10,
    background: '#212328',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 11,
  },
  secondaryButton: {
    minHeight: 40,
    padding: '0 13px',
    border: '1px solid #555555',
    borderRadius: 10,
    background: '#212328',
    color: '#d8dde1',
    cursor: 'pointer',
    fontSize: 12,
  },
  primaryButton: {
    minHeight: 40,
    padding: '0 14px',
    border: '1px solid #4A5DF9',
    borderRadius: 10,
    background: '#4A5DF9',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  },
  previewStage: { minHeight: 0, display: 'grid', placeItems: 'start center', padding: '24px 24px 64px', overflow: 'auto' },
  journeyNav: {
    width: 'min(100%, 540px)',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: 8,
    marginBottom: 12,
  },
  journeyNavButton: {
    minHeight: 40,
    padding: '0 13px',
    border: '1px solid #555555',
    borderRadius: 8,
    background: '#212328',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
  },
  journeyHomeButton: {
    minHeight: 40,
    padding: '0 13px',
    border: '1px solid #6D513B',
    borderRadius: 8,
    background: '#292119',
    color: '#E9C29B',
    cursor: 'pointer',
    fontSize: 12,
  },
  buttonDisabled: { opacity: 0.35, cursor: 'not-allowed' },
  deviceLabel: {
    width: 'min(100%, 540px)',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 10,
    color: '#A8A8A8',
    fontSize: 11,
    fontVariantNumeric: 'tabular-nums',
  },
  phoneFrame: {
    padding: 9,
    border: '1px solid #555555',
    borderRadius: 16,
    background: '#212328',
    boxShadow: 'none',
  },
  previewFrame: { display: 'block', border: 0, borderRadius: 10, background: '#0C1014' },
  sheetWrap: { minHeight: '100%', padding: '24px' },
  sheetHeader: { display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 24, marginBottom: 22 },
  sheetHint: { color: '#A8A8A8', fontSize: 11 },
  sheetGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))', gap: 14 },
  sheetCard: {
    minWidth: 0,
    padding: 9,
    border: '1px solid #262626',
    borderRadius: 12,
    background: '#212328',
    color: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
  },
  sheetFrameWindow: { width: 140, height: 304, margin: '0 auto', overflow: 'hidden', borderRadius: 9, background: '#0C1014' },
  sheetFrame: {
    width: 390,
    height: 844,
    border: 0,
    transform: 'scale(.36)',
    transformOrigin: 'top left',
    pointerEvents: 'none',
  },
  sheetCardCopy: { display: 'grid', gap: 6, padding: '10px 2px 2px' },
  sheetCardTitle: { overflow: 'hidden', fontSize: 13, textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sheetCardMeta: { display: 'flex', alignItems: 'center', gap: 6, color: '#A8A8A8', fontSize: 10 },
  mapWrap: { minHeight: '100%', padding: '24px' },
  mapJourneys: { display: 'grid', gap: 18 },
  mapJourney: {
    padding: 18,
    border: '1px solid #30343A',
    borderRadius: 10,
    background: '#15191D',
  },
  mapJourneyHeader: { display: 'grid', gap: 5, marginBottom: 16 },
  mapJourneyTitle: { color: '#fff', fontSize: 17 },
  mapJourneyDescription: { color: '#A8A8A8', fontSize: 12 },
  mapTrack: { display: 'flex', alignItems: 'stretch', flexWrap: 'wrap', gap: 8 },
  mapStepWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  mapStep: {
    width: 198,
    minHeight: 62,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 10px',
    border: '1px solid #3C4147',
    borderRadius: 8,
    background: '#212328',
    color: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
  },
  mapStepNumber: {
    width: 24,
    height: 24,
    display: 'grid',
    placeItems: 'center',
    flex: '0 0 auto',
    borderRadius: '50%',
    background: '#734E33',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
  },
  mapStepCopy: { minWidth: 0, display: 'grid', gap: 4, fontSize: 12 },
  mapArrow: { color: '#6D737A', fontSize: 18 },
};
