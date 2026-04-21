export const READ_ARCHIVE_INITIAL_RENDER = 24;
export const READ_ARCHIVE_RENDER_BATCH = 24;
export const STORAGE_RESET_QUERY_PARAM = 'reset';
export const FORO_STORAGE_KEY_PREFIX = 'foro_';
export const PROFILE_SECTION_EVENT = 'foro:profile-section';

export type ProfileSection = 'details' | 'pricing' | 'audience';

export const dispatchProfileSectionChange = (section: ProfileSection) => {
  if (typeof window === 'undefined') return;

  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(PROFILE_SECTION_EVENT, { detail: section }));
  }, 0);
};
