// calendarUtils.ts
import { StoredEvent, ApprovalResponse, ScheduleHistory } from '../../types/Calendar';

/**
 * URLSearchParams からデコード→Date 変換まで行う
 */
export function parseEventsParam(raw: string): StoredEvent[] {
  const decoded = JSON.parse(decodeURIComponent(atob(raw))) as StoredEvent[];
  return decoded.map(ev => ({
    ...ev,
    start: new Date(ev.start),
    end:   new Date(ev.end),
  }));
}

/**
 * userName と approval 情報を元にイベントに approvals/approvedBy を注入
 */
export function applyApprovals(
  events: StoredEvent[],
  approvals: ApprovalResponse,
  userName: string
): void {
  events.forEach(ev => {
    if (approvals[ev.id] !== undefined) {
      ev.approvals  = ev.approvals  || {};
      ev.approvals[userName] = approvals[ev.id];
      ev.approvedBy = ev.approvedBy || [];
      if (approvals[ev.id] && !ev.approvedBy.includes(userName)) {
        ev.approvedBy.push(userName);
      }
    }
  });
}

/**
 * イベントから一意の承認者リストを抽出
 */
export function collectApprovers(events: StoredEvent[]): string[] {
  const set = new Set<string>();
  events.forEach(ev => {
    if (ev.createdBy) set.add(ev.createdBy);
    ev.approvedBy?.forEach(name => set.add(name));
  });
  return Array.from(set);
}
