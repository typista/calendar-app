// hooks/useCalendarData.ts
import { useState, useRef, useEffect } from 'react';
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
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  scheduleTitle: string;
  setScheduleTitle: React.Dispatch<React.SetStateAction<string>>;
  displayTitle: string;
  setDisplayTitle: React.Dispatch<React.SetStateAction<string>>;
  showAnsweredButton: boolean;
  effectiveCreator: boolean;
}

/**
 * カレンダーデータ読み込み & 回復用フック
 * URL パラメータ or localStorage から候補スロットと回答スロットを復元
 * effectiveCreator: isCreator or no events yet
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
  const originalCount = useRef<number>(0);

  // 回答者でも、まだイベントがなければ作成者モード
  const effectiveCreator = isCreator || originalCount.current === 0;

  // localStorage から候補スロットとタイトルを読み込む
  const loadLocal = (id: string) => {
    const data = localStorage.getItem(`calendar-events-${id}`);
    if (data) {
      const { events: storedEvents } = JSON.parse(data) as { events: StoredEvent[] };
      originalCount.current = storedEvents.length;
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

  // URL or localStorage からデータを読み込み、回答状態をマージ
  const loadCalendarData = (id: string, user: string) => {
    const params = new URLSearchParams(window.location.search);
    const eventsParam = params.get('events');
    const titleParam = params.get('title');
    const respParam = params.get('responseId');

    // 候補スロットは
    // - 作成者なら URL パラメータを優先
    // - 回答者（effectiveCreator含む）なら常に localStorage から
    if (eventsParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(eventsParam))) as StoredEvent[];
        originalCount.current = decoded.length;
        const parsed = decoded.map(ev => ({
          ...ev,
          start: new Date(ev.start),
          end: new Date(ev.end),
        }));
        setEvents(parsed);
        // 作成者のみ localStorage に保存
        if (isCreator) {
          localStorage.setItem(
            `calendar-events-${id}`,
            JSON.stringify({ events: decoded, sharedAt: new Date().toISOString() })
          );
        }
        if (titleParam) {
          const t = decodeURIComponent(titleParam);
          setScheduleTitle(t);
          setDisplayTitle(t);
          if (isCreator) localStorage.setItem(`calendar-schedule-title-${id}`, t);
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
            if (!info) return ev;
            // slot がある場合のみ上書き
            const slot = info.slot || {};
            return {
              ...ev,
              start: slot.start ? new Date(slot.start) : ev.start,
              end: slot.end ? new Date(slot.end) : ev.end,
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

  // 初回マウント or 引数変更時の読み込み
  useEffect(() => {
    if (scheduleId) loadCalendarData(scheduleId, userName);
  }, [scheduleId, userName, isCreator]);

  return {
    events,
    setEvents,
    scheduleTitle,
    setScheduleTitle,
    displayTitle,
    setDisplayTitle,
    showAnsweredButton,
    effectiveCreator,
  };
}
