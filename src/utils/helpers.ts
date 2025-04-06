import { Timestamp } from 'firebase/firestore';

/**
 * Format a date to a readable format using the user's local timezone
 */
export const formatDate = (dateObj: Date | Timestamp | null) => {
  if (!dateObj) {
    return 'Unknown date';
  }
  
  // Convert Firebase Timestamp to JS Date if needed
  if (dateObj instanceof Timestamp) {
    dateObj = dateObj.toDate();
  }
  
  // Use the default locale of the user's device
  const userLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  
  // Format date and time according to user's locale and timezone
  return dateObj.toLocaleString(userLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Use 24-hour clock format for European standards
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Use user's timezone
  });
};

/**
 * Calculate time remaining until a specific date
 */
export const getTimeRemaining = (targetDate: Date | Timestamp): string => {
  const date = targetDate instanceof Timestamp ? targetDate.toDate() : targetDate;
  const now = new Date();
  
  // If the date is in the past
  if (date.getTime() <= now.getTime()) {
    return 'Revealed';
  }
  
  const diffInMs = date.getTime() - now.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays > 30) {
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} remaining`;
  } else if (diffInDays > 0) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} remaining`;
  } else {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours > 0) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} remaining`;
    } else {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} remaining`;
    }
  }
};

/**
 * Generate a random color
 */
export const getRandomColor = (): string => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#7E78D2', // Purple
    '#F7B801', // Yellow
    '#48A9A6', // Green
    '#F67280', // Pink
    '#4B97FF', // Blue
    '#7CCA62', // Light Green
    '#E84A5F', // Coral
    '#45B7D1', // Sky Blue
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Generate initials from a name
 */
export const getInitials = (name: string): string => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Generate a unique ID
 */
export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * Truncate text to a specific length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Formats a timestamp to a human-readable string using the user's local timezone
 */
export const formatTime = (timestamp: any): string => {
  if (!timestamp) return '';
  
  // Convert Firestore timestamp to JavaScript Date if needed
  const date = typeof timestamp.toDate === 'function' 
    ? timestamp.toDate() 
    : new Date(timestamp);
  
  // Get user's locale and timezone
  const userOptions = Intl.DateTimeFormat().resolvedOptions();
    
  return date.toLocaleTimeString(userOptions.locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false, // Use 24-hour clock format for European standards
    timeZone: userOptions.timeZone
  });
};

/**
 * Truncates a string to a specified length and adds ellipsis if needed
 */
export const truncateString = (str: string, maxLength: number): string => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  
  return str.substring(0, maxLength) + '...';
}; 