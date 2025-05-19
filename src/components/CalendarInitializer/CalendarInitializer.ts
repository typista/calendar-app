// useCalendarInitializer.ts
import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  parseEventsParam,
  applyApprovals,
  collectApprovers,
} from '../CalendarUtils/CalendarUtils';
import {
  getJsonItem,
  setJsonItem,
} from '../../utils/storage';
import { StoredEvent, ApprovalResponse, ScheduleHistory } from '../../types/Calendar';

interface Params {
  userName: string | null;
  isCreator: boolean;
  loadFromLocalStorage: (id: string) => void;
  setEvents: (ev: StoredEvent[]) => void;
  setScheduleId: (id: string) => void;
  setScheduleTitle: (t: string) => void;
  setDisplayTitle: (t: string) => void;
  setApprovers: (list: string[]) => void;
  setShowNameModal: (b: boolean) => void;
  setShowTitleModal: (b: boolean) => void;
}

export function useCalendarInitializer({
  userName,
  isCreator,
  loadFromLocalStorage,
  setEvents,
  setScheduleId,
  setScheduleTitle,
  setDisplayTitle,
  setApprovers,
  setShowNameModal,
  setShowTitleModal,
}: Params) {
  const isFirst = useRef(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventsParam = params.get('events');
    const titleParam  = params.get('title');
    const idParam     = params.get('id');

    async function init() {
      if (eventsParam) {
        try {
          const parsed = parseEventsParam(eventsParam);

          if (userName && idParam) {
            const approvals = getJsonItem<ApprovalResponse>(
              `calendar-approvals-${idParam}-${userName}`,
              {}
            )!;
            applyApprovals(parsed, approvals, userName);
          }

          setEvents(parsed);

          if (idParam) {
            setScheduleId(idParam);

            const history: ScheduleHistory = {
              events: parsed.map(ev => ({
                ...ev,
                start:   ev.start.toISOString(),
                end:     ev.end.toISOString(),
              })),
              sharedAt: new Date().toISOString(),
            };
            setJsonItem(`calendar-events-${idParam}`, history);

            if (titleParam) {
              const decodedTitle = decodeURIComponent(titleParam);
              setScheduleTitle(decodedTitle);
              setDisplayTitle(decodedTitle);
              setJsonItem(`calendar-schedule-title-${idParam}`, decodedTitle);
            }
          }

          setApprovers(collectApprovers(parsed));

          if (!userName) {
            setShowNameModal(true);
          }
        } catch (e) {
          console.error('Failed to parse events:', e);
          if (idParam) loadFromLocalStorage(idParam);
        }
      }
      else if (idParam) {
        loadFromLocalStorage(idParam);
      }
      else if (isCreator && isFirst.current) {
        setScheduleId(uuidv4());
        setShowTitleModal(true);
        isFirst.current = false;
      }
    }

    init();
  }, [
    userName,
    isCreator,
    loadFromLocalStorage,
    setEvents,
    setScheduleId,
    setScheduleTitle,
    setDisplayTitle,
    setApprovers,
    setShowNameModal,
    setShowTitleModal,
  ]);
}
