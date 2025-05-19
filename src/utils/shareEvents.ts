import { useState, useRef, useCallback } from 'react';
import { setJsonItem } from './storage';
import type { StoredEvent } from '../types/Calendar';

export function useShareEvents(
  events: StoredEvent[],
  userName: string,
  scheduleId: string,
  scheduleTitle: string | null,
  approvers: string[]
) {
  const copyTimeoutRef = useRef<number>();
  // トースト表示用
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  // コピー用ボタン文言
  const [copyButtonText, setCopyButtonText] = useState('共有リンクをコピー');

  const shareEvents = useCallback(async () => {
    const filteredEvents = events.filter(event => {
      if (event.createdBy === userName) return true;
      if (!event.approvals) return false;
      
      const approvalCount = Object.values(event.approvals).filter(v => v).length;
      const position = approvers.length + (approvers.includes(userName) ? 0 : 1);
      
      return approvalCount >= position - 1;
    });

    const storedEvents: StoredEvent[] = filteredEvents.map(event => ({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      approvedBy: [...(event.approvedBy || []), userName]
    }));
    
    const encodedEvents = btoa(encodeURIComponent(JSON.stringify(storedEvents)));
    const url = new URL(window.location.href);
    url.searchParams.set('events', encodedEvents);
    url.searchParams.set('id', scheduleId);
    if (scheduleTitle) {
      url.searchParams.set('title', encodeURIComponent(scheduleTitle));
    }
    
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyButtonText('コピーしました！');
      setShowCopiedToast(true);
      
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopyButtonText('共有リンクをコピー');
        setShowCopiedToast(false);
      }, 2000);

      setJsonItem(`calendar-events-${scheduleId}`, {
        events: storedEvents,
        sharedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to copy URL:', error);
      setCopyButtonText('コピーに失敗しました');
      
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopyButtonText('共有リンクをコピー');
      }, 2000);
    }
}, [events, userName, scheduleId, scheduleTitle, approvers]);

  return shareEvents;
}
