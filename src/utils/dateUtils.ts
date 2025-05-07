export const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long'
  }).format(date);

export const formatEventTime = (date: Date): string =>
  new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);

export const formatEventDate = (date: Date): string =>
  new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(date);
