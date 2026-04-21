import { useRef, useState } from 'react';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { usePersistentState } from '../../hooks/usePersistentState';
import type { ProfileSection } from '../constants';

export const useAppShellState = () => {
  const [status, setStatus] = useState('');
  const [activeView, setActiveView] = usePersistentState(STORAGE_KEYS.activeView, 'home');
  const [contentTab, setContentTab] = usePersistentState(STORAGE_KEYS.contentTab, 'search');
  const [, setMobileProfileSection] = useState<ProfileSection>('details');
  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollMainToTop = () => {
    window.setTimeout(() => {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, 0);
  };

  return {
    status,
    setStatus,
    activeView,
    setActiveView,
    contentTab,
    setContentTab,
    setMobileProfileSection,
    mainScrollRef,
    scrollMainToTop,
  };
};
