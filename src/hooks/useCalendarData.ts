// hooks/useCalendarData.ts
import { useState, useRef, useEffect } from 'react'
import { getJsonItem, setJsonItem, removeJsonItem } from '../utils/storage';
import { StoredEvent, ApprovalInfo, ApprovalResponse, UseCalendarDataResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { ScheduleHistory } from '../types';

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
    const data = getJsonItem<ScheduleHistory>(`calendar-events-${id}`);
    if (data) {
      const { events } = data;
      const normalized = events.map(ev => ({
        ...ev,
        start: new Date(ev.start),
        end:   new Date(ev.end)
      }));
      setEvents(normalized as StoredEvent[]);
      originalCount.current = events.length;
    }
    const title = getJsonItem(`calendar-schedule-title-${id}`);
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

    if (eventsParam) {
      if (isCreator) {
        // 作成者は URL の events を表示・保存
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(eventsParam))) as StoredEvent[];
          originalCount.current = decoded.length;
          const parsed = decoded.map(ev => ({
            ...ev,
            start: new Date(ev.start),
            end:   new Date(ev.end),
          }));
          setEvents(parsed);
          setJsonItem(
            `calendar-events-${id}`,
            { events: decoded, sharedAt: new Date().toISOString() }
          );
          if (titleParam) {
            const t = decodeURIComponent(titleParam);
            setScheduleTitle(t);
            setDisplayTitle(t);
            setJsonItem(`calendar-schedule-title-${id}`, t);
          }
        } catch {
          loadLocal(id);
        }
      } else {
        // 回答者は常にローカルストレージの「全枠」を読み込み
        loadLocal(id);
      }
    } else if (id) {
      // URL に events がなくても、IDありならローカルから
      loadLocal(id);
    }

    // 回答情報の復元
    if (id && user) {
      const baseKey = `calendar-approvals-${id}-${user}`;
      const key = respParam ? `${baseKey}-${respParam}` : baseKey;
      const json = getJsonItem(key);
      if (json) {
        const approvals = json as ApprovalResponse;
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
