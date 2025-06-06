// utils/buildScheduleUrl.ts

import { StoredEvent } from '../types';

/**
 * buildScheduleUrl
 *
 * @param baseUrl      - 例: window.location.href（現在のページ URL）
 * @param scheduleId   - スケジュールのユニーク ID
 * @param storedEvents - 「OK した枠」および「createdBy＝最初の作成者の枠」を含む配列
 *
 * 以下のクエリパラメータを自動で付与します:
 *  - events=⏤Base64(encodeURIComponent(JSON.stringify(storedEvents)))  
 *  - id=⏤scheduleId  
 *  - responders=⏤(storedEvents の approvedBy を一意化したユーザー名文字列, カンマ区切り)
 *
 * 呼出し例:
 *   const url = buildScheduleUrl(window.location.href, scheduleId, storedEvents);
 */
export function buildScheduleUrl(
  baseUrl: string,
  scheduleId: string,
  storedEvents: StoredEvent[],
  title: string
): string {
  // 1) storedEvents を JSON→URIエンコード→Base64 化してクエリにセット
  const encodedEvents = btoa(encodeURIComponent(JSON.stringify(storedEvents)));
  const url = new URL(baseUrl);
  url.searchParams.set('events', encodedEvents);
  url.searchParams.set('id', scheduleId);

  // 2) approvedBy 配列から「回答者」一覧を一意化して responders クエリにセット
  const respondersSet = new Set<string>();
  storedEvents.forEach((ev) => {
    if (Array.isArray(ev.approvedBy)) {
      ev.approvedBy.forEach((name) => {
        if (name && name.trim().length > 0) {
          respondersSet.add(name.trim());
        }
      });
    }
  });
  if (respondersSet.size > 0) {
    url.searchParams.set('responders', Array.from(respondersSet).join(','));
  }

  return url.toString();
}
