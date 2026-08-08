/**
 * Utility functions for date and time formatting.
 */

/**
 * Formats a date/timestamp into a readable relative human-time string like '2 mins ago'.
 * @param dateInput Date object, ISO date string, or timestamp number
 * @returns Human readable relative time string (e.g. 'Just now', '2 mins ago', '1 hr ago', '3 days ago')
 */
export const formatRelativeTime = (dateInput?: string | Date | number): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Handle future dates or clock skew
  if (diffMs < 0) {
    return 'Just now';
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 45) {
    return 'Just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hr ago' : `${hours} hrs ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4.5) {
    return weeks === 1 ? '1 wk ago' : `${weeks} wks ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? '1 mo ago' : `${months} mos ago`;
  }

  const years = Math.floor(days / 365);
  return years === 1 ? '1 yr ago' : `${years} yrs ago`;
};
