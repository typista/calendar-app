
// utils/clipboard.ts
import { StoredEvent } from '../types';

export async function copyScheduleLink(
  storedEvents: StoredEvent[],
  baseUrl: string,
  scheduleId: string,
  scheduleTitle?: string
) {
  // Encode events array
  const encodedEvents = btoa(encodeURIComponent(JSON.stringify(storedEvents)));
  const url = new URL(baseUrl);
  url.searchParams.set('events', encodedEvents);
  url.searchParams.set('id', scheduleId);
  if (scheduleTitle) {
    url.searchParams.set('title', encodeURIComponent(scheduleTitle));
  }

  // Prepare plain text and HTML content
  const text = url.toString();
  const listItems = storedEvents
    .map(ev => {
      const start = new Date(ev.start);
      const end = new Date(ev.end);
      const dateStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')} `;
      const timeStr = `${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')} ～ ${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
      return `<li>${dateStr}${timeStr}</li>`;
    })
    .join('');
  const html = `<div><h2>${scheduleTitle}</h2><ul>${listItems}</ul><p><a href="${text}">このスケジュールに回答する</a></p></div>`;

  // Write both formats to clipboard
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/plain': new Blob([text], { type: 'text/plain' }),
      'text/html': new Blob([html], { type: 'text/html' }),
    }),
  ]);
}
