import { WEEK_DAYS } from '../constants/calendar';

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

export const getDayNumbers = (currentDate: Date) => {
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  
  return WEEK_DAYS.map((_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      number: date.getDate(),
      isToday: date.toDateString() === new Date().toDateString()
    };
  });
};