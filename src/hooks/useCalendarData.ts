// hooks/useCalendarData.ts
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface StoredEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  notes?: string;
}

export interface ApprovalInfo {
  approved: boolean;
  slot: { start: string; end: string };
  color: string;
  title: string;
  notes: string;
}
export interface ApprovalResponse {
  [eventId: string]: ApprovalInfo;
}

export interface UseCalendarDataResult {
  events: Event[];
  scheduleTitle: string;
  displayTitle: string;
  showAnsweredButton: boolean;
  loadCalendarData: (id: string, userName: string) => void;
}

/**
 * カレンダーデータ読み込み & 回復用フック
 * URL パラメータ or localStorage から候補スロットと回答スロットを復元
 */
export function useCalendarData(
  scheduleId: string,
  userName: string,
  isCreator: boolean
): UseCalendarDataResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');
  const [showAnsweredButton, setShowAnsweredButton] = useState(false);

  const loadLocal = (id: string) => {
    const data = localStorage.getItem(`calendar-events-${id}`);
    if (data) {
      const { events: storedEvents } = JSON.parse(data) as { events: StoredEvent[] };
      setEvents(
        storedEvents.map(ev => ({
          ...ev,
          start: new Date(ev.start),
          end: new Date(ev.end),
        }))
      );
    }
    const title = localStorage.getItem(`calendar-schedule-title-${id}`);
    if (title) {
      setScheduleTitle(title);
      setDisplayTitle(title);
    }
  };

  const loadCalendarData = (id: string, user: string) => {
    const params = new URLSearchParams(window.location.search);
    const eventsParam = params.get('events');
    const titleParam = params.get('title');
    const respParam = params.get('responseId');

    // 候補スロットの読み込み
    if (eventsParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(eventsParam))) as StoredEvent[];
        const parsed = decoded.map(ev => ({
          ...ev,
          start: new Date(ev.start),
          end: new Date(ev.end),
        }));
        setEvents(parsed);
        if (isCreator) {
          localStorage.setItem(
            `calendar-events-${id}`,
            JSON.stringify({ events: decoded, sharedAt: new Date().toISOString() })
          );
          if (titleParam) {
            localStorage.setItem(
              `calendar-schedule-title-${id}`,
              decodeURIComponent(titleParam)
            );
          }
        }
        if (titleParam) {
          const t = decodeURIComponent(titleParam);
          setScheduleTitle(t);
          setDisplayTitle(t);
        }
      } catch {
        loadLocal(id);
      }
    } else if (id) {
      loadLocal(id);
    }

    // 回答情報の復元
    if (id && user) {
      const baseKey = `calendar-approvals-${id}-${user}`;
      const key = respParam ? `${baseKey}-${respParam}` : baseKey;
      const json = localStorage.getItem(key);
      if (json) {
        const approvals = JSON.parse(json) as ApprovalResponse;
        setEvents(prev =>
          prev.map(ev => {
            const info = approvals[ev.id];
            if (!info) return ev; // 未回答
            const slot = info.slot;
            return {
              ...ev,
              start: slot && slot.start ? new Date(slot.start) : ev.start,
              end: slot && slot.end ? new Date(slot.end) : ev.end,
              color: info.color || ev.color,
              title: info.title || ev.title,
              notes: info.notes || ev.notes,
              approvals: { [user]: info.approved },
              approvedBy: info.approved ? [user] : [],
            };
          })
        );
        setShowAnsweredButton(true);
      }
    }
  };

  useEffect(() => {
    if (scheduleId) loadCalendarData(scheduleId, userName);
  }, [scheduleId, userName, isCreator]);

  return { events, scheduleTitle, displayTitle, showAnsweredButton, setScheduleTitle, setDisplayTitle, setEvents };
}
