import React, { useState, useRef, MouseEvent, KeyboardEvent, useEffect, TouchEvent } from 'react';
import { WEEK_DAYS, HOURS } from './constants/calendar';
import { formatDate, formatEventTime, formatEventDate, getDayNumbers } from './utils/dateUtils';
import { useCalendarData } from './hooks/useCalendarData';
import { CalendarList } from './components/CalendarList/CalendarList';
import { NameModal } from './components/Modal/NameModal';
import { TitleModal } from './components/Modal/TitleModal';
import { ScheduleHistoryModal } from './components/Modal/ScheduleHistoryModal';
import { ChevronLeft, ChevronRight, Menu, Settings, X, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, PenSquare, Plus, Minus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// イベントの型定義
interface Event {
  id: string;             // イベント固有ID
  title: string;          // イベントのタイトル
  start: Date;            // 開始日時
  end: Date;              // 終了日時
  color: string;          // 表示色
  notes?: string;         // メモ
  createdBy?: string;     // 作成者名
  approvals?: { [key: string]: boolean }; // 承認状況マップ
  approvedBy?: string[];  // 承認済みユーザーリスト
}

// イベント描画位置情報の型
interface EventPosition {
  left: number;           // 左位置の割合
  width: number;          // 幅の割合
}

// モーダル表示用の型定義
interface EventModal {
  show: boolean;          // モーダル表示フラグ
  start: Date;            // 編集対象開始日時
  end: Date;              // 編集対象終了日時
  event?: Event;          // 編集対象イベント（新規なら undefined）
}

// ローカル保存用のイベント型（Date を ISO 文字列に変換）
interface StoredEvent extends Omit<Event, 'start' | 'end'> {
  start: string;
  end: string;
}

// 表示時間帯の型
interface TimeRange {
  start: number;          // 開始時刻 (hour)
  end: number;            // 終了時刻 (hour)
}

// 承認レスポンス型
interface ApprovalResponse {
  [eventId: string]: boolean;
}

// スケジュール履歴用
interface ScheduleHistory {
  events: StoredEvent[];
  sharedAt?: string;      // 共有日時
}

function App() {
  // URLパラメータから scheduleId を取得（参照専用）
  const [scheduleId, setScheduleId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || uuidv4();
  });

  // ユーザー名
  const [userName, setUserName] = useState(() => {
    const stored = localStorage.getItem('calendar-user-name');
    return stored || '';
  });

  // 作成者判定（URLに events パラメータが無い場合は作成者）
  const [isCreator, setIsCreator] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !params.get('events');
  });

  // これまで参照した scheduleIds を localStorage から初期化
  const [scheduleIds, setScheduleIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('calendar-schedule-ids');
    return stored ? JSON.parse(stored) : [];
  });

  // 有効なスケジュールがあるかフラグ
  const [hasValidSchedules, setHasValidSchedules] = useState(false);

  // 各種モーダル表示フラグ
  const [showScheduleHistoryModal, setShowScheduleHistoryModal] = useState(false);
  const [showAnsweredModal, setShowAnsweredModal] = useState(false);
  const [hasAnsweredSchedules, setHasAnsweredSchedules] = useState(false);

  // カレンダー表示の基準日
  const [currentDate, setCurrentDate] = useState(new Date());

  // イベントリスト
  
  // ドラッグ選択関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ dayIndex: number; hourIndex: number; minutes: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ dayIndex: number; hourIndex: number; minutes: number } | null>(null);

  // 確定済みイベントドラッグ移動用
  const [draggingEvent, setDraggingEvent] = useState<{ event: Event, offsetY: number } | null>(null);

  // 予定追加・編集モーダル用状態
  const [eventModal, setEventModal] = useState<EventModal>({ show: false, start: new Date(), end: new Date() });
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventColor, setNewEventColor] = useState('#4285f4');
  const [newEventNotes, setNewEventNotes] = useState('');

  // トースト表示用
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // ボトムシート、設定モーダル、名前入力モーダル、タイトル入力モーダル
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);

  // スケジュールタイトル
    
  // スケジュールマスター権限フラグ
  const [isScheduleMaster, setIsScheduleMaster] = useState(false);

  // 表示時間帯を localStorage から初期化
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const stored = localStorage.getItem('calendar-time-range');
    return stored ? JSON.parse(stored) : { start: 8, end: 21 };
  });

  // 承認者リスト
  const [approvers, setApprovers] = useState<string[]>([]);

  // 現在時刻更新用
  const [currentTime, setCurrentTime] = useState(new Date());

  // コピー用ボタン文言
  const [copyButtonText, setCopyButtonText] = useState('共有リンクをコピー');

  const {
    events,
    setEvents,
    scheduleTitle,
    setScheduleTitle,
    displayTitle,
    setDisplayTitle,
    showAnsweredButton,
    effectiveCreator,
  } = useCalendarData(scheduleId, userName, isCreator);

  const copyTimeoutRef = useRef<number>();

  // カレンダーグリッド参照
  const gridRef = useRef<HTMLDivElement>(null);

  // 初回マウント判定
  const isInitialMount = useRef(true);

  // カラーパレット
  const colors = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#46bdc6'];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventsParam = params.get('events');
    const titleParam = params.get('title');
    const idParam = params.get('id');
    
    if (eventsParam) {
      try {
        const decodedEvents = JSON.parse(decodeURIComponent(atob(eventsParam)));
        const parsedEvents = decodedEvents.map((event: StoredEvent) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end)
        }));

        if (userName && idParam) {
          const storedApprovals = localStorage.getItem(`calendar-approvals-${idParam}-${userName}`);
          if (storedApprovals) {
            const approvals: ApprovalResponse = JSON.parse(storedApprovals);
            parsedEvents.forEach(event => {
              if (approvals[event.id] !== undefined) {
                event.approvals = event.approvals || {};
                event.approvals[userName] = approvals[event.id];
                event.approvedBy = event.approvedBy || [];
                if (approvals[event.id] && !event.approvedBy.includes(userName)) {
                  event.approvedBy.push(userName);
                }
              }
            });
          }
        }

        setEvents(parsedEvents);

        if (idParam) {
          setScheduleId(idParam);
          const storedData: ScheduleHistory = {
            events: decodedEvents,
            sharedAt: new Date().toISOString()
          };
          localStorage.setItem(`calendar-events-${idParam}`, JSON.stringify(storedData));
          
          if (titleParam) {
            const decodedTitle = decodeURIComponent(titleParam);
            setScheduleTitle(decodedTitle);
            setDisplayTitle(decodedTitle);
            localStorage.setItem(`calendar-schedule-title-${idParam}`, decodedTitle);
          }
        }

        const uniqueApprovers = new Set<string>();
        parsedEvents.forEach(event => {
          if (event.createdBy) uniqueApprovers.add(event.createdBy);
          if (event.approvedBy) {
            event.approvedBy.forEach(approver => uniqueApprovers.add(approver));
          }
        });
        setApprovers(Array.from(uniqueApprovers));

        if (!userName) {
          setShowNameModal(true);
        }
      } catch (error) {
        console.error('Failed to parse events from URL:', error);
        if (idParam) {
          loadFromLocalStorage(idParam);
        }
      }
    } else if (idParam) {
      loadFromLocalStorage(idParam);
    } else if (isCreator && isInitialMount.current) {
      const newScheduleId = uuidv4();
      setScheduleId(newScheduleId);
      setShowTitleModal(true);
      isInitialMount.current = false;
    }
  }, [userName, isCreator]);

  useEffect(() => {
    if (scheduleId) {
      const storedEvents: StoredEvent[] = events.map(event => ({
        ...event,
        start: event.start.toISOString(),
        end: event.end.toISOString()
      }));

      const existingData = localStorage.getItem(`calendar-events-${scheduleId}`);
      const existingSchedule: ScheduleHistory | null = existingData ? JSON.parse(existingData) : null;

      const scheduleData: ScheduleHistory = {
        events: storedEvents,
        sharedAt: existingSchedule?.sharedAt
      };

      localStorage.setItem(`calendar-events-${scheduleId}`, JSON.stringify(scheduleData));
    }
  }, [events, scheduleId]);

  useEffect(() => {
    if (scheduleId && scheduleTitle) {
      localStorage.setItem(`calendar-schedule-title-${scheduleId}`, scheduleTitle);
    }
  }, [scheduleTitle, scheduleId]);

  useEffect(() => {
    localStorage.setItem('calendar-time-range', JSON.stringify(timeRange));
  }, [timeRange]);

  useEffect(() => {
    if (userName) {
      localStorage.setItem('calendar-user-name', userName);
    }
  }, [userName]);

  useEffect(() => {
    if (scheduleTitle) {
      localStorage.setItem('calendar-schedule-title', scheduleTitle);
    }
  }, [scheduleTitle]);

  useEffect(() => {
    if (scheduleIds.length > 0) {
      localStorage.setItem('calendar-schedule-ids', JSON.stringify(scheduleIds));
    }
  }, [scheduleIds]);

  useEffect(() => {
    if (scheduleId && userName) {
      const hasAnswers = localStorage.getItem(`calendar-approvals-${scheduleId}-${userName}`) !== null;
      setHasAnsweredSchedules(hasAnswers);
    } else {
      setHasAnsweredSchedules(false);
    }
  }, [scheduleId, userName]);

  useEffect(() => {
    let hasValid = false;
    for (const id of scheduleIds) {
      const storedData = localStorage.getItem(`calendar-events-${id}`);
      if (storedData) {
        try {
          const { sharedAt } = JSON.parse(storedData) as ScheduleHistory;
          if (sharedAt && !isNaN(new Date(sharedAt).getTime())) {
            hasValid = true;
            break;
          }
        } catch (error) {
          console.error('Failed to parse stored data:', error);
        }
      }
    }
    setHasValidSchedules(hasValid);
  }, [scheduleIds]);

  const loadFromLocalStorage = (id: string) => {
    const storedData = localStorage.getItem(`calendar-events-${id}`);
    const storedTitle = localStorage.getItem(`calendar-schedule-title-${id}`);
    
    if (storedData) {
      const { events: storedEvents }: ScheduleHistory = JSON.parse(storedData);
      setEvents(storedEvents.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      })));
    }
    
    if (storedTitle) {
      setScheduleTitle(storedTitle);
      setDisplayTitle(storedTitle);
    }
  };

  /**
   * 回答者用：OK/NG/未回答 を localStorage に保存し、
   * OK のみを eventsParam として URL コピー
   */
  /**
   * 回答者用：OK/NG/未回答を localStorage に保存しつつ、
   * URLコピー用にはOKのみを eventsParam にする
   */
  const handleCopyUrl = async (): Promise<void> => {
    // --- 1) 候補スロット本体を保存 ---
    const storedEvents: StoredEvent[] = events.map(ev => ({
      ...ev,
      // ISO文字列化
      start: ev.start.toISOString(),
      end:   ev.end.toISOString(),
      createdBy: ev.createdBy,
      approvals: ev.approvals,
      approvedBy: ev.approvedBy
    }));
    localStorage.setItem(
      `calendar-events-${scheduleId}`,
      JSON.stringify({ events: storedEvents, sharedAt: new Date().toISOString() })
    );

    // --- 2) 全回答を保存 (未回答はOK扱い) ---
    const approvalMap: ApprovalResponse = {};
    events.forEach(ev => {
      const approved = ev.approvals?.[userName] ?? true;
      approvalMap[ev.id] = approved;
    });
    localStorage.setItem(
      `calendar-approvals-${scheduleId}-${userName}`,
      JSON.stringify(approvalMap)
    );

    // --- 3) ブラウザURLを id+title のみで更新 ---
    const browserUrl = new URL(window.location.href);
    browserUrl.searchParams.set('id', scheduleId);
    browserUrl.searchParams.delete('events');
    browserUrl.searchParams.delete('responseId');
    if (displayTitle) {
      browserUrl.searchParams.set('title', encodeURIComponent(displayTitle));
    }
    window.history.replaceState(null, '', browserUrl.toString());

    // --- 4) OK=true のものだけを eventsParam にしてクリップボードへコピー ---
    const okPayload = events
      .filter(ev => approvalMap[ev.id])
      .map(ev => ({
        id:    ev.id,
        start: ev.start.toISOString(),
        end:   ev.end.toISOString(),
        color: ev.color,
        title: ev.title,
        notes: ev.notes || ''
      }));
    const encoded = btoa(encodeURIComponent(JSON.stringify(okPayload)));
    const clipUrl = new URL(window.location.href);
    clipUrl.searchParams.set('events', encoded);
    clipUrl.searchParams.set('id', scheduleId);
    if (displayTitle) {
      clipUrl.searchParams.set('title', encodeURIComponent(displayTitle));
    }

    try {
      await navigator.clipboard.writeText(clipUrl.toString());
      setShowCopiedToast(true);
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setShowCopiedToast(false), 2000);
    } catch {
      console.error('URLコピーに失敗しました');
    }
  };
  
  const handleShareEvents = () => {
    if (!userName) {
      setShowNameModal(true);
      return;
    }

    shareEvents();
  };

  const shareEvents = async () => {
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

      localStorage.setItem(`calendar-events-${scheduleId}`, JSON.stringify({
        events: storedEvents,
        sharedAt: new Date().toISOString()
      }));
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
  };

  const handleApproval = (eventId: string, approved: boolean) => {
    setEvents(prevEvents => {
      const updatedEvents = prevEvents.map(event => {
        if (event.id === eventId) {
          const approvals = { ...(event.approvals || {}), [userName]: approved };
          const approvedBy = approved 
            ? [...(event.approvedBy || []), userName].filter((v, i, a) => a.indexOf(v) === i)
            : (event.approvedBy || []).filter(name => name !== userName);
          return { ...event, approvals, approvedBy };
        }
        return event;
      });

      if (scheduleId && userName) {
        const approvals: ApprovalResponse = {};
        updatedEvents.forEach(event => {
          if (event.approvals && event.approvals[userName] !== undefined) {
            approvals[event.id] = event.approvals[userName];
          }
        });
        localStorage.setItem(`calendar-approvals-${scheduleId}-${userName}`, JSON.stringify(approvals));
      }

      return updatedEvents;
    });
  };

  const handleNameSubmit = () => {
    if (!userName.trim()) return;
    setShowNameModal(false);
    shareEvents();
  };

  const handleNameModalClose = () => {
    setShowNameModal(false);
  };

  const handleTitleSubmit = () => {
    if (!scheduleTitle.trim()) return;
    setDisplayTitle(scheduleTitle);
    setShowTitleModal(false);
    setIsScheduleMaster(true);
    
    setIsCreator(true);
    const updatedIds = Array.from(new Set([...(JSON.parse(localStorage.getItem('calendar-schedule-ids')||'[]')), scheduleId]));
    localStorage.setItem('calendar-schedule-ids', JSON.stringify(updatedIds));
    localStorage.setItem(`calendar-schedule-title-${scheduleId}`, scheduleTitle);
  };

  const handleTitleModalClose = () => {
    setShowTitleModal(false);
  };

  const handleScheduleHistoryClick = () => {
    setShowScheduleHistoryModal(true);
  };

  const handleScheduleHistoryClose = () => {
    setShowScheduleHistoryModal(false);
  };

  const handleAnsweredSchedulesClick = () => {
    setShowAnsweredModal(true);
  };

  const handleCopyHistoryUrl = async (id: string) => {
    const storedData = localStorage.getItem(`calendar-events-${id}`);
    const storedTitle = localStorage.getItem(`calendar-schedule-title-${id}`);
    
    if (storedData) {
      const { events: storedEvents }: ScheduleHistory = JSON.parse(storedData);
      const encodedEvents = btoa(encodeURIComponent(JSON.stringify(storedEvents)));
      const url = new URL(window.location.href);
      url.searchParams.set('events', encodedEvents);
      url.searchParams.set('id', id);
      if (storedTitle) {
        url.searchParams.set('title', encodeURIComponent(storedTitle));
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
      } catch (error) {
        console.error('Failed to copy URL:', error);
      }
    }
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isTimeInRange = (hour: number) => {
    return hour >= timeRange.start && hour < timeRange.end;
  };

  const isPastTime = (date: Date) => {
    const now = new Date();
    return date < now;
  };

  const getEventPosition = (e: MouseEvent | Touch) => {
    if (!gridRef.current) return null;
    
    const rect = gridRef.current.getBoundingClientRect();
    const timeColumnWidth = rect.width / 8;
    const x = e.clientX - rect.left - timeColumnWidth;
    const y = e.clientY - rect.top;
    
    const dayIndex = Math.floor((x / (rect.width - timeColumnWidth)) * 7);
    const hourIndex = Math.floor(y / 48);
    const minutes = Math.floor((y % 48) / 24) * 30;
    
    if (dayIndex < 0 || dayIndex >= 7 || hourIndex < 0 || hourIndex >= 24 || !isTimeInRange(hourIndex)) return null;
    
    return { dayIndex, hourIndex, minutes };
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (draggingEvent || !effectiveCreator) return;
    
    const position = getEventPosition(e);
    console.log(position);
    if (!position) return;

    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + position.dayIndex);
    startDate.setHours(position.hourIndex, position.minutes, 0, 0);

    if (startDate < new Date()) {
      return;
    }

    setIsDragging(true);
    setDragStart(position);
    setDragEnd(position);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!effectiveCreator) return;
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const position = getEventPosition(touch);
      if (position) {
        setIsDragging(true);
        setDragStart(position);
        setDragEnd(position);
      }
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const position = getEventPosition(touch);
    if (position) {
      setDragEnd(position);
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + dragStart.dayIndex);
    startDate.setHours(dragStart.hourIndex, dragStart.minutes, 0, 0);

    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + dragEnd.dayIndex);
    endDate.setHours(dragEnd.hourIndex, dragEnd.minutes, 0, 0);

    const start = new Date(Math.min(startDate.getTime(), endDate.getTime()));
    const end = new Date(Math.max(startDate.getTime(), endDate.getTime()));

    if (start.getTime() !== end.getTime()) {
      setEventModal({ show: true, start, end });
      setNewEventTitle('');
      setNewEventColor('#4285f4');
      setNewEventNotes('');
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleEventMouseDown = (e: MouseEvent, event: Event) => {
    if (!effectiveCreator) return;
    
    e.stopPropagation();
    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    
    setDraggingEvent({ event, offsetY });
  };

  const handleEventTouchStart = (e: TouchEvent, event: Event) => {
    if (!effectiveCreator) return;
    
    e.stopPropagation();
    const touch = e.touches[0];
    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const offsetY = touch.clientY - rect.top;
    
    setDraggingEvent({ event, offsetY });
  };

  const handleEventDoubleClick = (e: MouseEvent, event: Event) => {
    if (!effectiveCreator) return;
    
    e.stopPropagation();
    setEventModal({ show: true, start: event.start, end: event.end, event });
    setNewEventTitle(event.title);
    setNewEventColor(event.color);
    setNewEventNotes(event.notes || '');
    setShowBottomSheet(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggingEvent) {
      const position = getEventPosition(e);
      if (!position) return;

      const duration = draggingEvent.event.end.getTime() - draggingEvent.event.start.getTime();
      
      const weekStart = new Date(currentDate);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const newStart = new Date(weekStart);
      newStart.setDate(weekStart.getDate() + position.dayIndex);
      newStart.setHours(position.hourIndex, position.minutes, 0, 0);

      const newEnd = new Date(newStart.getTime() + duration);

      setEvents(events.map(e => 
        e.id === draggingEvent.event.id 
          ? { ...e, start: newStart, end: newEnd }
          : e
      ));
      return;
    }

    if (!isDragging) return;

    const position = getEventPosition(e);
    if (!position) return;

    setDragEnd(position);
  };

  const handleMouseUp = () => {
    if (draggingEvent) {
      setDraggingEvent(null);
      return;
    }

    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + dragStart.dayIndex);
    startDate.setHours(dragStart.hourIndex, dragStart.minutes, 0, 0);

    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + dragEnd.dayIndex);
    endDate.setHours(dragEnd.hourIndex, dragEnd.minutes, 0, 0);

    const start = new Date(Math.min(startDate.getTime(), endDate.getTime()));
    const end = new Date(Math.max(startDate.getTime(), endDate.getTime()));

    if (start.getTime() !== end.getTime()) {
      setEventModal({ show: true, start, end });
      setNewEventTitle('');
      setNewEventColor('#4285f4');
      setNewEventNotes('');
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleCreateEvent = () => {
    if (!effectiveCreator) return;

    const now = new Date();
    if (eventModal.start < now) {
      alert('過去の日時には予定を作成できません');
      return;
    }
    
    const newEvent: Event = {
      id: eventModal.event?.id || uuidv4(),
      title: newEventTitle,
      start: eventModal.start,
      end: eventModal.end,
      color: newEventColor,
      notes: newEventNotes,
      createdBy: userName,
      approvals: eventModal.event?.approvals || {}
    };

    setEvents(events.map(e => e.id === newEvent.id ? newEvent : e));
    if (!eventModal.event) {
      setEvents(prev => [...prev, newEvent]);
    }
    setEventModal({ ...eventModal, show: false });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (e.currentTarget.form) {
        e.currentTarget.form.dispatchEvent(new Event('submit', { cancelable: true }));
      } else {
        handleCreateEvent();
      }
    }
  };

  const calculateOverlappingGroups = (events: Event[], dayEvents: Event[]): Map<string, EventPosition> => {
    const positions = new Map<string, EventPosition>();
    
    const groups: Event[][] = [];
    for (const event of dayEvents) {
      let added = false;
      for (const group of groups) {
        if (group.some(groupEvent => {
          return (event.start < groupEvent.end && event.end > groupEvent.start);
        })) {
          group.push(event);
          added = true;
          break;
        }
      }
      if (!added) {
        groups.push([event]);
      }
    }

    groups.forEach(group => {
      const count = group.length;
      group.forEach((event, index) => {
        positions.set(event.id, {
          left: index * (1 / count),
          width: 1 / count
        });
      });
    });

    return positions;
  };

  const renderEvents = () => {
    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const eventsByDay = new Map<number, Event[]>();
    events.forEach(event => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
        (eventStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (!eventsByDay.has(daysDiff)) {
        eventsByDay.set(daysDiff, []);
      }
      eventsByDay.get(daysDiff)?.push(event);
    });

    return events.map((event) => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
        (eventStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const startHour = event.start.getHours();
      const startMinutes = event.start.getMinutes();
      const endHour = event.end.getHours();
      const endMinutes = event.end.getMinutes();
      
      const durationInMinutes = 
        (endHour * 60 + endMinutes) - (startHour * 60 + startMinutes);
      
      const height = (durationInMinutes / 60) * 48;

      const dayEvents = eventsByDay.get(daysDiff) || [];
      const positions = calculateOverlappingGroups(events, dayEvents);
      const position = positions.get(event.id);

      const columnWidth = 100 / 8;
      const baseLeft = (daysDiff + 1) * columnWidth;
      const left = position
        ? `calc(${baseLeft}% + ${position.left * (columnWidth - 1)}%)`
        : `calc(${baseLeft}%)`;
      const width = position
        ? `calc(${position.width * (columnWidth - 1)}%)`
        : `calc(${columnWidth - 1}%)`;

      return (
        <div
          key={event.id}
          className={`absolute rounded-lg px-2 py-1 text-white text-sm ${effectiveCreator ? 'cursor-move' : ''} flex flex-col`}
          style={{
            left,
            top: `${startHour * 48 + (startMinutes / 60) * 48}px`,
            width,
            height: `${height - 4}px`,
            backgroundColor: event.color,
          }}
          onMouseDown={(e) => handleEventMouseDown(e, event)}
          onTouchStart={(e) => handleEventTouchStart(e, event)}
          onDoubleClick={(e) => handleEventDoubleClick(e, event)}
        >
          <div className="text-xs font-medium">
            {formatEventTime(event.start)} 〜 {formatEventTime(event.end)}
          </div>
          
          <div className="font-medium">{event.title}</div>
          {event.notes && (
            <div className="text-xs opacity-90 mt-1 line-clamp-2">{event.notes}</div>
          )}
        </div>
      );
    });
  };

  const renderDragSelection = () => {
    if (!isDragging || !dragStart || !dragEnd) return null;

    const startDay = Math.min(dragStart.dayIndex, dragEnd.dayIndex);
    const endDay = Math.max(dragStart.dayIndex, dragEnd.dayIndex);
    
    const startTimeInMinutes = dragStart.hourIndex * 60 + dragStart.minutes;
    const endTimeInMinutes = dragEnd.hourIndex * 60 + dragEnd.minutes;
    const startTime = Math.min(startTimeInMinutes, endTimeInMinutes);
    const endTime = Math.max(startTimeInMinutes, endTimeInMinutes);
    
    const startTop = (startTime / 60) * 48;
    const height = ((endTime - startTime) / 60) * 48;

    const columnWidth = 100 / 8;
    const baseLeft = (startDay + 1) * columnWidth;

    return (
      <div
        className="absolute bg-blue-200 opacity-50 rounded-lg"
        style={{
          left: `calc(${baseLeft}%)`,
          top: `${startTop}px`,
          width: `calc(${(endDay - startDay + 1) * columnWidth - 1}%)`,
          height: `${height}px`,
        }}
      />
    );
  };

  const renderEventCard = (event: Event) => {
    // 当該ユーザーがこのイベントを作成した or マスター権限がある場合のみ編集モーダルを開ける
    const allowEdit = isCreator || event.createdBy === userName;
    const isEventCreator = event.createdBy === userName;
    const approval = event.approvals?.[userName];
    // 回答ボタンは回答者モード(= !effectiveCreator)かつ自分作成でないときだけ
    const showApprovalButtons = !effectiveCreator && event.createdBy !== userName;


    return (
      <div
        key={event.id}
        className="p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
        style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
        onClick={allowEdit ? (e) => handleEventDoubleClick(e as any, event) : undefined}
      >
        <div className="text-sm text-gray-600">
          {formatEventDate(event.start)}
        </div>
        <div className="text-sm font-medium text-gray-600">
          {formatEventTime(event.start)} 〜 {formatEventTime(event.end)}
        </div>
        <div className="font-medium text-gray-800">
          {event.title}
        </div>
        {event.notes && (
          <div className="text-sm text-gray-600 mt-1 line-clamp-2">
            {event.notes}
          </div>
        )}
        {showApprovalButtons && (
          <div className="flex items-center gap-2 mt-2">
            <button
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
                approval === true
                  ? 'bg-green-100 text-green-700'
                  : 'hover:bg-green-50 text-gray-600'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleApproval(event.id, true);
              }}
            >
              <Check className="w-4 h-4" />
              OK
            </button>
            <button
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
                approval === false
                  ? 'bg-red-100 text-red-700'
                  : 'hover:bg-red-50 text-gray-600'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleApproval(event.id, false);
              }}
            >
              <XIcon className="w-4 h-4" />
              NG
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex bg-white">
      <div className="flex-1 flex flex-col">
        <header className="flex flex-col">
          <div className="h-16 px-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="p-3 hover:bg-gray-100 rounded-full">
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-xl text-gray-800">カレンダー</h1>
                {displayTitle && (
                  <span className="text-gray-600">
                    {displayTitle}
                    {isCreator && (
                      <button
                        className="p-2 hover:bg-gray-100 rounded-full ml-1"
                        onClick={() => setShowTitleModal(true)}
                        title="タイトルを編集"
                      >
                        <PenSquare className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </span>
                )}
                {!displayTitle && isCreator && (
                  <button
                    className="p-2 hover:bg-gray-100 rounded-full"
                    onClick={() => setShowTitleModal(true)}
                    title="タイトルを編集"
                  >
                    <PenSquare className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="p-3 hover:bg-gray-100 rounded-full relative md:hidden"
                onClick={() => setShowBottomSheet(!showBottomSheet)}
              >
                <List className="w-6 h-6 text-gray-600" />
              </button>
              <div className="relative">
                <button 
                  className="p-3 hover:bg-gray-100 rounded-full hidden sm:block"
                  onClick={handleShareEvents}
                  title={copyButtonText}
                >
                  <Copy className="w-6 h-6 text-gray-600" />
                </button>
                {showCopiedToast && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-2 bg-gray-800 text-white text-sm rounded shadow-lg whitespace-nowrap">
                    URLをコピーしました
                  </div>
                )}
              </div>
              <button 
                className="p-3 hover:bg-gray-100 rounded-full hidden sm:block"
                onClick={() => setShowSettingsModal(true)}
              >
                <Settings className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="h-16 px-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                className="px-3 sm:px-6 py-2 bg-white hover:bg-gray-100 rounded-md border text-sm sm:text-base"
                onClick={handleToday}
              >
                今日
              </button>
              <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  onClick={handlePrevWeek}
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  onClick={handleNextWeek}
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <h2 className="text-base sm:text-xl">{formatDate(currentDate)}</h2>
            </div>
            <div className="flex items-center gap-2">
              {hasValidSchedules && (
                <button
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-100 rounded-md border text-sm sm:text-base"
                  onClick={handleScheduleHistoryClick}
                >
                  作成済みの候補日程
                </button>
              )}
              {!scheduleIds.includes(scheduleId) && hasAnsweredSchedules && (
                <button
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-100 rounded-md border text-sm sm:text-base"
                  onClick={handleAnsweredSchedulesClick}
                >
                  回答済みの候補日程
                </button>
              )}
              {effectiveCreator && (
                <button 
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-100 rounded-full border shadow-sm text-sm sm:text-base"
                  onClick={() => setEventModal({ show: true, start: new Date(), end: new Date() })}
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">予定を作成</span>
                  <span className="sm:hidden">作成</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-8 border-b">
            <div className="border-r" />
            {WEEK_DAYS.map((day, index) => {
              const dayInfo = getDayNumbers(currentDate)[index];
              return (
                <div key={day} className="border-r">
                  <div className="h-14 px-1 sm:px-2 flex flex-col items-center justify-center">
                    <div className="text-xs sm:text-sm text-gray-500">{day}</div>
                    <div className={`text-base sm:text-xl ${dayInfo.isToday ? 'bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center' : ''}`}>
                      {dayInfo.number}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div 
            ref={gridRef}
            className="relative flex-1 grid grid-cols-8 overflow-y-scroll overflow-x-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="border-r">
              {HOURS.map((hour) => (
                <div key={hour} className="h-12 text-right pr-2 text-sm text-gray-500">
                  {hour}:00
                </div>
              ))}
            </div>
            {WEEK_DAYS.map((day, index) => {
              const weekStart = new Date(currentDate);
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              const currentDay = new Date(weekStart);
              currentDay.setDate(weekStart.getDate() + index);

              return (
                <div key={day} className="border-r">
                  <div>
                    {HOURS.map((hour) => {
                      const timeSlotDate = new Date(currentDay);
                      timeSlotDate.setHours(hour, 0, 0, 0);
                      const isPastSlot = isPastTime(timeSlotDate);

                      return (
                        <div 
                          key={hour} 
                          className={`h-12 border-b border-gray-100 ${
                            !isTimeInRange(hour) ? 'bg-gray-50 hidden sm:block' : ''
                          } ${isPastSlot ? 'bg-gray-100' : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {(() => {
              const now = currentTime;
              const weekStart = new Date(currentDate);
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              weekStart.setHours(0, 0, 0, 0);
              
              const daysDiff = Math.floor(
                (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
              );
              
              if (daysDiff >= 0 && daysDiff < 7) {
                const hour = now.getHours();
                const minutes = now.getMinutes();
                const top = hour * 48 + (minutes / 60) * 48;
                
                return (
                  <div 
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: `${top}px` }}
                  >
                    <div className="relative">
                      <div className="absolute left-[12.5%] right-0 border-t-2 border-red-500" />
                      <div className="absolute left-[12.5%] w-2 h-2 rounded-full bg-red-500 -translate-x-1 -translate-y-1" />
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {renderEvents()}
            {renderDragSelection()}
          </div>
        </div>
      </div>

      <CalendarList events={events} onClick={setShowBottomSheet} onRender={renderEventCard} showBottomSheet={showBottomSheet} copyButtonText={copyButtonText} />

      {showSettingsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowSettingsModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-6 h-6 text-gray-600" />
                  <h3 className="text-xl font-medium">表示時間の設定</h3>
                </div>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  onClick={() => setShowSettingsModal(false)}
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    開始時刻
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={timeRange.start}
                    onChange={(e) => setTimeRange(prev => ({ ...prev, start: parseInt(e.target.value) }))}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i} disabled={i >= timeRange.end}>
                        {i}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    終了時刻
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={timeRange.end}
                    onChange={(e) => setTimeRange(prev => ({ ...prev, end: parseInt(e.target.value) }))}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i} disabled={i <= timeRange.start}>
                        {i}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setShowSettingsModal(false)}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <NameModal show={showNameModal} userName={userName} setUserName={setUserName} handleKeyDown={handleKeyDown} onSubmit={handleNameSubmit} onClose={handleNameModalClose} />
      <TitleModal show={showTitleModal} scheduleTitle={scheduleTitle} setScheduleTitle={setScheduleTitle} setDisplayTitle={setDisplayTitle} handleKeyDown={handleKeyDown} onSubmit={handleTitleSubmit} onClose={handleTitleModalClose} />
      <ScheduleHistoryModal show={showScheduleHistoryModal} scheduleIds={scheduleIds} handleCopyHistoryUrl={handleCopyHistoryUrl} onClick={setShowScheduleHistoryModal} onClose={handleScheduleHistoryClose} />

      {showAnsweredModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50"
          onClick={() => setShowAnsweredModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium">回答済みの候補日程</h3>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  onClick={() => setShowAnsweredModal(false)}
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {(() => {
                  const storedData = localStorage.getItem(`calendar-events-${scheduleId}`);
                  if (!storedData) return null;

                  const { sharedAt } = JSON.parse(storedData) as ScheduleHistory;
                  const title = localStorage.getItem(`calendar-schedule-title-${scheduleId}`) || '無題の候補日程';
                  const date = new Date(sharedAt);

                  return (
                    <div className="py-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{title}</div>
                        <div className="text-sm text-gray-600">
                          {date.toLocaleString('ja-JP')}
                        </div>
                      </div>
                      <button
                        className="p-2 hover:bg-gray-100 rounded-full"
                        onClick={() => handleCopyHistoryUrl(scheduleId)}
                      >
                        <Copy className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {eventModal.show && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50"
          onClick={() => setEventModal({ ...eventModal, show: false })}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium">
                  {eventModal.event ? '予定を編集' : '予定を追加'}
                </h3>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  onClick={() => setEventModal({ ...eventModal, show: false })}
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <input
                type="text"
                placeholder="タイトルを入力"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <div className="text-sm text-gray-600 mb-4">
                {formatEventDate(eventModal.start)}
                <br />
                {formatEventTime(eventModal.start)} 〜 {formatEventTime(eventModal.end)}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  色を選択
                </label>
                
                <div className="flex gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full border-2 ${
                        color === newEventColor ? 'border-gray-400' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewEventColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メモ
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  rows={3}
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                  onClick={() => setEventModal({ ...eventModal, show: false })}
                >
                  キャンセル
                </button>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  onClick={handleCreateEvent}
                  disabled={!newEventTitle.trim()}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;