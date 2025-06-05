// utils/clipboard.ts
import { StoredEvent } from '../types';
import { formatEventDate } from './dateUtils'; // 日付整形用

/**
 * copyScheduleLink
 *
 * @param storedEvents  「このユーザーが OK した枠」または「最初の作成者が登録した枠」
 * @param baseUrl       たとえば window.location.href
 * @param scheduleId    このスケジュールのユニーク ID
 * @param scheduleTitle スケジュールのタイトル（省略可）
 *
 * Header.tsx から “OK だけフィルター済み” の events をそのまま渡す前提です。
 * ここではさらにフィルターせず、直接エンコード・Base64 化して URL にセットします。
 * 併せて、approvedBy 配列から一意化したユーザー名を responders=... に追加します。
 */
export async function copyScheduleLink(
  storedEvents: StoredEvent[],
  baseUrl: string,
  scheduleId: string,
  scheduleTitle?: string
) {
  // 1) storedEvents をそのままクエリにセット（Header.tsx 側で OK だけを渡している想定）
  const encodedEvents = btoa(encodeURIComponent(JSON.stringify(storedEvents)));
  const url = new URL(baseUrl);
  url.searchParams.set('events', encodedEvents);
  url.searchParams.set('id', scheduleId);

  // 2) approvedBy 配列から一意化した “回答者” 一覧を responders=... に追加
  const respondersSet = new Set<string>();
  storedEvents.forEach(ev => {
    if (Array.isArray(ev.approvedBy)) {
      ev.approvedBy.forEach(name => {
        if (name && name.trim().length > 0) {
          respondersSet.add(name.trim());
        }
      });
    }
  });
  if (respondersSet.size > 0) {
    url.searchParams.set('responders', Array.from(respondersSet).join(','));
  }

  const text = url.toString();

  // 3) HTML 形式のコピー用文字列を組み立て
  const listItems = storedEvents
    .map(ev => {
      const dateStr = formatEventDate(new Date(ev.start)); // YYYY/MM/DD などに整形
      const start = new Date(ev.start);
      const end = new Date(ev.end);
      const timeStr =
        `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}` +
        ` ～ ` +
        `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
      return `<li>${dateStr} ${timeStr}</li>`;
    })
    .join('');
  const safeTitle = scheduleTitle ? scheduleTitle : '';
  const html = `<div>
    <h2>${safeTitle}</h2>
    <ul>${listItems}</ul>
    <p><a href="${text}">このスケジュールに回答する</a></p>
  </div>`;

  // 4) クリップボードに text/plain + text/html 両方でコピー
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/plain': new Blob([text], { type: 'text/plain' }),
      'text/html': new Blob([html], { type: 'text/html' })
    })
  ]);
}
