import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import ProfileMoodFace from './ProfileMoodFace';
import HeaderControls from './HeaderControls';
import EditNameModal from '../ui/EditNameModal';
import HelpTip from '../ui/HelpTip';
import ThemedBrandImage from '../brand/ThemedBrandImage';
import { HELP } from '../../content/helpContent';
import { getTimeGreeting } from '../../utils/greeting';
import { getSuggestedName, normalizeDisplayName } from '../../utils/displayName';
import {
  House,
  Calendar,
  Target,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ArrowLeftRight,
  ScanLine,
  Users,
  ArrowLeft,
} from 'lucide-react';


const NAV_ITEMS = [
  { path: '/dashboard', labelKey: 'nav.home', icon: House },
  { path: '/transactions', label: 'Movimientos', icon: ArrowLeftRight },
  { path: '/scan', labelKey: 'nav.scan', icon: ScanLine },
  { path: '/groups', label: 'Grupos', icon: Users },
  { path: '/calendar', labelKey: 'nav.calendar', icon: Calendar },
  { path: '/goals', labelKey: 'nav.goals', icon: Target },
  { path: '/recommendations', labelKey: 'nav.ai', icon: Sparkles },
];

const MOBILE_NAV_ITEMS = (() => {
  const home = NAV_ITEMS.find((item) => item.path === '/dashboard');
  const rest = NAV_ITEMS.filter((item) => item.path !== '/dashboard');
  const middle = Math.ceil(rest.length / 2);
  return [...rest.slice(0, middle), home, ...rest.slice(middle)].filter(Boolean);
})();

const PAGE_TITLE_KEYS = {
  '/dashboard': 'nav.home',
  '/transactions': 'nav.transactions',
  '/transactions/income': 'nav.income',
  '/transactions/expense': 'nav.expense',
  '/calendar': 'nav.calendar',
  '/goals': 'nav.goals',
  '/recommendations': 'nav.recommendations',
  '/groups': 'nav.groups',
  '/scan': 'nav.scan',
};


const STORAGE_KEY = 'sidebar_expanded';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateProfile, refreshUser } = useAuth();
  const { theme, currency, language, fx, refreshFxRate, toggleTheme, toggleCurrency, toggleLanguage, t } = usePreferences();


  const [expanded, setExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const [mounted, setMounted] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage no disponible
      }
      return next;
    });
  };

  const isActive = (path) => location.pathname === path;

  const handleNav = (path) => {
    navigate(path);
  };

  const getInitials = () => {
    const source = user?.name || user?.email || 'TL';
    if (source.includes('@')) {
      return source.slice(0, 2).toUpperCase();
    }

    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((piece) => piece[0])
      .join('')
      .toUpperCase();
  };

  const suggestedName = getSuggestedName(user);
  const displayName = normalizeDisplayName(user?.name) || suggestedName;

  const openNameEdit = () => {
    setNameDraft(displayName || suggestedName);
    setNameError('');
    setShowNameEdit(true);
  };

  const closeNameEdit = () => {
    if (nameSaving) return;
    setShowNameEdit(false);
    setNameError('');
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError('Ingresá un nombre.');
      return;
    }
    if (trimmed === displayName) {
      closeNameEdit();
      return;
    }
    setNameSaving(true);
    setNameError('');
    try {
      await updateProfile({ name: trimmed });
      await refreshUser();
      setShowNameEdit(false);
    } catch (err) {
      setNameError(err.response?.data?.message || 'No se pudo actualizar el nombre.');
    } finally {
      setNameSaving(false);
    }
  };
  const mobileTitle = PAGE_TITLE_KEYS[location.pathname] ? t(PAGE_TITLE_KEYS[location.pathname]) : 'MonArgent';
  const isDashboard = location.pathname === '/dashboard';
  const timeGreeting = getTimeGreeting();


  const activeClass =
    'bg-amber-500/15 text-amber-400 border-l-2 border-amber-400';
  const inactiveClass =
    'text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:translate-x-1';
  const baseNavClass =
    'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 text-sm font-medium';

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 transition-all duration-300 ease-in-out flex-shrink-0 ${
          expanded ? 'w-56' : 'w-16'
        }`}
      >
        {/* Logo + toggle */}
        <div
          className={`md:h-[53px] flex items-center border-b border-[#234063]/50 overflow-hidden ${
            expanded ? 'px-3 gap-2' : 'px-2 justify-center'
          }`}
        >
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
          >
            <ThemedBrandImage
              src="/monargent-icon.png"
              alt="MonArgent"
              className="w-9 h-9 object-contain flex-shrink-0 bg-transparent"
            />
            {expanded && (
              <span className="whitespace-nowrap font-display text-base tracking-tight truncate">
                <span className="text-white">Mon</span>
                <span className="text-[#E8B923]">Argent</span>
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={toggleExpanded}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all duration-150 shrink-0"
            title={expanded ? 'Contraer menú' : 'Expandir menú'}
          >
            {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 overflow-hidden">
          {NAV_ITEMS.map(({ path, labelKey, label: rawLabel, icon: Icon }) => {
            const label = rawLabel || t(labelKey);
            return (
              <div key={path} className={expanded ? 'px-3' : 'px-2'}>
                <button
                  onClick={() => handleNav(path)}
                  title={!expanded ? label : undefined}
                  className={`${baseNavClass} ${
                    isActive(path) ? activeClass : inactiveClass
                  } ${!expanded ? 'justify-center px-0' : ''}`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {expanded && <span className="truncate">{label}</span>}
                </button>
              </div>
            );
          })}

        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-[97px] md:h-[53px] flex-shrink-0 flex flex-col justify-center px-4 md:px-6 bg-[#081b33] border-b border-[#234063]/50 gap-2 py-2">
          <div className="w-full flex items-center justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              {isDashboard ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-amber-300/90 leading-tight truncate shrink-0">
                    {timeGreeting}
                  </p>
                  <p className="text-base md:text-lg font-semibold text-slate-100 leading-tight truncate capitalize">
                    {displayName}
                  </p>
                  <button
                    type="button"
                    onClick={openNameEdit}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors shrink-0"
                    aria-label={t('layout.editName')}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-xl md:text-2xl font-semibold text-slate-100 leading-tight truncate">
                    {mobileTitle}
                  </p>
                  {location.pathname === '/groups' && (
                    <HelpTip title={HELP.groups.title} body={HELP.groups.body} align="left" />
                  )}
                  {location.pathname.startsWith('/transactions') && (
                    <HelpTip title={HELP.transactions.title} body={HELP.transactions.body} align="left" />
                  )}
                  {location.pathname === '/scan' && (
                    <HelpTip title={HELP.scan.title} body={HELP.scan.body} align="left" />
                  )}
                  {location.pathname === '/goals' && (
                    <HelpTip title={HELP.goals.title} body={HELP.goals.body} align="left" />
                  )}
                  {location.pathname === '/recommendations' && (
                    <HelpTip title={HELP.recommendations.title} body={HELP.recommendations.body} align="left" />
                  )}
                  {location.pathname === '/calendar' && (
                    <HelpTip title={HELP.calendar.title} body={HELP.calendar.body} align="left" />
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ProfileMoodFace />
              <HeaderControls
                className="hidden md:flex"
                language={language}
                currency={currency}
                theme={theme}
                fx={fx}
                onToggleLanguage={toggleLanguage}
                onToggleCurrency={toggleCurrency}
                onToggleTheme={toggleTheme}
                onRefreshFx={() => refreshFxRate()}
                t={t}
              />
              <NotificationBell />
              <UserMenu initials={getInitials()} email={user?.email || ''} onLogout={logout} />
            </div>
          </div>

            <div className="w-full flex items-center justify-between gap-2 shrink-0 md:hidden">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 h-9 px-2 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/5 transition-colors"
                aria-label={t('layout.back')}
                title={t('layout.back')}
              >
                <ArrowLeft size={18} />
                <span className="text-xs font-medium hidden sm:inline">{t('layout.back')}</span>
              </button>

              <HeaderControls
                className="ml-auto"
                language={language}
                currency={currency}
                theme={theme}
                fx={fx}
                onToggleLanguage={toggleLanguage}
                onToggleCurrency={toggleCurrency}
                onToggleTheme={toggleTheme}
                onRefreshFx={() => refreshFxRate()}
                t={t}
              />
            </div>
        </header>

        {/* Content */}
        <main
          className="flex-1 overflow-auto bg-gradient-to-b from-[#071b34] to-[#06162b] p-4 pb-24 md:pb-6 md:p-6 lg:p-8 relative"
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          {children}

        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#26415f] bg-[#081b33]/95 backdrop-blur-xl px-1 py-2 pb-safe">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${MOBILE_NAV_ITEMS.length}, minmax(0, 1fr))` }}>
            {MOBILE_NAV_ITEMS.map(({ path, labelKey, label: rawLabel, icon: Icon }) => {
              const active = isActive(path);
              const label = rawLabel || t(labelKey);
              return (
                <button
                  key={path}
                  onClick={() => handleNav(path)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors ${
                    active
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon size={20} />
                  <span className={`h-1 w-1 rounded-full ${active ? 'bg-amber-400' : 'bg-transparent'}`} />
                </button>
              );
            })}

          </div>
        </nav>

        {/* Desktop floating back button, outside the left sidebar */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`hidden md:inline-flex fixed bottom-6 z-30 items-center gap-1.5 h-9 px-3 rounded-lg text-slate-400 bg-[#0b2138]/80 border border-[#26415f] backdrop-blur hover:text-amber-300 hover:bg-white/5 transition-colors ${
            expanded ? 'left-[15rem]' : 'left-[5rem]'
          }`}
          aria-label={t('layout.back')}
          title={t('layout.back')}
        >
          <ArrowLeft size={18} />
          <span className="text-xs font-medium">{t('layout.back')}</span>
        </button>
      </div>

      <EditNameModal
        open={showNameEdit}
        value={nameDraft}
        onChange={setNameDraft}
        onClose={closeNameEdit}
        onSubmit={handleSaveName}
        saving={nameSaving}
        error={nameError}
        suggestion={suggestedName}
      />
    </div>
  );
};

export default Layout;
