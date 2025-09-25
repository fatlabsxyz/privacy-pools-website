export const truncateAddress = (address?: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTimestamp = (timestamp?: string, full?: boolean): string => {
  if (!timestamp) return '-';

  // Convert timestamp to milliseconds if needed
  const timestampMs = timestamp.length <= 10 ? Number(timestamp) * 1000 : Number(timestamp);
  const date = new Date(timestampMs);

  // Check if date is valid
  if (isNaN(date.getTime())) return '-';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  const timezone = date.getTimezoneOffset();
  const timezoneSign = timezone > 0 ? '+' : '-';
  const timezoneOffset = Math.abs(timezone);
  const timezoneOffsetHours = Math.floor(timezoneOffset / 60);

  return full
    ? `${day}/${month}/${year} ${hours}:${minutes} UTC${timezoneSign}${timezoneOffsetHours}`
    : `${day}/${month}/${year} ${hours}:${minutes}`;
};

export const getTimeAgo = (timestamp?: string): string => {
  if (!timestamp) return '-';

  // Convert timestamp to milliseconds if needed
  const timestampMs = timestamp.length <= 10 ? Number(timestamp) * 1000 : Number(timestamp);
  const date = new Date(timestampMs);

  // Check if date is valid
  if (isNaN(date.getTime())) return '-';

  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diff < 86400) {
    const hrs = Math.floor(diff / 3600);
    return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diff < 2592000) {
    const days = Math.floor(diff / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  if (diff < 31536000) {
    const months = Math.floor(diff / 2592000);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  const years = Math.floor(diff / 31536000);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
};
