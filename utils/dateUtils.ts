// utils/dateUtils.ts

/**
 * Formats a date to relative time (Today, Yesterday, or date)
 */
export const formatMessageDateSeparator = (dateString: string): string => {
  const messageDate = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to start of day for accurate comparison
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (messageDay.getTime() === todayStart.getTime()) {
    return 'Today';
  } else if (messageDay.getTime() === yesterdayStart.getTime()) {
    return 'Yesterday';
  } else {
    // For older dates, show full date
    return messageDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }
};

/**
 * Checks if two dates are on the same day
 */
export const isSameDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

/**
 * Gets the date key for grouping messages (YYYY-MM-DD format)
 */
export const getDateKey = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Groups messages by date and inserts date separators
 */
export const insertDateSeparators = (messages: any[]): any[] => {
  if (messages.length === 0) return [];

  const result: any[] = [];
  let lastDateKey: string | null = null;

  // Process messages in chronological order (oldest first)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const message of sortedMessages) {
    const currentDateKey = getDateKey(message.createdAt);
    
    // If this is a new day, add a date separator
    if (lastDateKey !== currentDateKey) {
      result.push({
        id: `date-separator-${currentDateKey}`,
        type: 'dateSeparator',
        dateText: formatMessageDateSeparator(message.createdAt),
        createdAt: message.createdAt,
      });
      lastDateKey = currentDateKey;
    }
    
    result.push(message);
  }

  return result;
};