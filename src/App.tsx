import React, { useState, useRef, MouseEvent, KeyboardEvent, useEffect, TouchEvent } from 'react';
import { WEEK_DAYS, HOURS, COLORS } from './constants/calendar';
import { formatDate, formatEventTime, formatEventDate, getDayNumbers } from './utils/dateUtils';
import { useCalendarData } from './hooks/useCalendarData';
import { Header } from './components/Header/Header';
import { CalendarGrid } from './components/CalendarGrid/CalendarGrid';
import { CalendarList } from './components/CalendarList/CalendarList';
import { NameModal } from './components/Modal/NameModal';
import { TitleModal } from './components/Modal/TitleModal';
import { ScheduleHistoryModal } from './components/Modal/ScheduleHistoryModal';
import { AnsweredHistoryModal } from './components/Modal/AnsweredHistoryModal';
import { SettingsModal } from './components/Modal/SettingsModal';
import { EventModal } from './components/Modal/EventModal';
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
interface EventData {
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
  const [eventData, setEventData] = useState<EventData>({ show: false, start: new Date(), end: new Date() });
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

  const handleSettingsModalClose = () => {
    setShowSettingsModal(false);
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

  const handleAnsweredSchedulesClose = () => {
    setShowAnsweredModal(false);
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

  const handleEventDoubleClick = (e: MouseEvent, event: Event) => {
    if (!effectiveCreator) return;
    
    e.stopPropagation();
    setEventData({ show: true, start: event.start, end: event.end, event });
    setNewEventTitle(event.title);
    setNewEventColor(event.color);
    setNewEventNotes(event.notes || '');
    setShowBottomSheet(false);
  };

  const handleEventModalClose = () =>{
    setEventData({show: false})
  }

  const handleCreateEvent = () => {
    if (!effectiveCreator) return;

    const now = new Date();
    if (eventData.start < now) {
      alert('過去の日時には予定を作成できません');
      return;
    }
    
    const newEvent: Event = {
      id: eventData.event?.id || uuidv4(),
      title: newEventTitle,
      start: eventData.start,
      end: eventData.end,
      color: newEventColor,
      notes: newEventNotes,
      createdBy: userName,
      approvals: eventData.event?.approvals || {}
    };

    setEvents(events.map(e => e.id === newEvent.id ? newEvent : e));
    if (!eventData.event) {
      setEvents(prev => [...prev, newEvent]);
    }
    setEventData({ ...eventData, show: false });
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

          <Header
            displayTitle={displayTitle}
            isCreator={isCreator}
            effectiveCreator={effectiveCreator}
            showCopiedToast={showCopiedToast}
            setShowTitleModal={setShowTitleModal}
            setShowBottomSheet={setShowBottomSheet}
            handleShareEvents={handleShareEvents}
            copyButtonText={copyButtonText}
            setShowSettingsModal={setShowSettingsModal}
            handleToday={handleToday}
            handlePrevWeek={handlePrevWeek}
            handleNextWeek={handleNextWeek}
            currentDate={currentDate}
            hasValidSchedules={hasValidSchedules}
            hasAnsweredSchedules={hasAnsweredSchedules}
            handleScheduleHistoryClick={handleScheduleHistoryClick}
            scheduleId={scheduleId}
            scheduleIds={scheduleIds}
            handleAnsweredSchedulesClick={handleAnsweredSchedulesClick}
            setEventData={setEventData}
          />

          <CalendarGrid
            gridRef={gridRef}
            timeRange={timeRange}
            currentTime={currentTime}
            events={events}
            draggingEvent={draggingEvent}
            effectiveCreator={effectiveCreator}
            currentDate={currentDate}
            setIsDragging={setIsDragging}
            setDragStart={setDragStart}
            setDragEnd={setDragEnd}
            isDragging={isDragging}
            dragStart={dragStart}
            dragEnd={dragEnd}
            setEventData={setEventData}
            setNewEventTitle={setNewEventTitle}
            setNewEventColor={setNewEventColor}
            setNewEventNotes={setNewEventNotes}
            setDraggingEvent={setDraggingEvent}
          />
      </div>

      <CalendarList
        events={events}
        onClick={setShowBottomSheet}
        onRender={renderEventCard}
        showBottomSheet={showBottomSheet}
        copyButtonText={copyButtonText}
      />
      <SettingsModal
        show={showSettingsModal}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        onClose={handleSettingsModalClose}
      />
      <NameModal
        show={showNameModal}
        userName={userName}
        setUserName={setUserName}
        handleKeyDown={handleKeyDown}
        onSubmit={handleNameSubmit}
        onClose={handleNameModalClose}
      />
      <TitleModal
        show={showTitleModal}
        scheduleTitle={scheduleTitle}
        setScheduleTitle={setScheduleTitle}
        setDisplayTitle={setDisplayTitle}
        handleKeyDown={handleKeyDown}
        onSubmit={handleTitleSubmit}
        onClose={handleTitleModalClose}
      />
      <ScheduleHistoryModal
        show={showScheduleHistoryModal}
        scheduleIds={scheduleIds}
        handleCopyHistoryUrl={handleCopyHistoryUrl}
        onClick={setShowScheduleHistoryModal}
        onClose={handleScheduleHistoryClose}
      />
      <AnsweredHistoryModal
        show={showAnsweredModal}
        scheduleId={scheduleId}
        handleCopyHistoryUrl={handleCopyHistoryUrl}
        onClick={setShowAnsweredModal}
        onClose={handleAnsweredSchedulesClose}
      />
      <EventModal
        show={eventData.show}
        newEventTitle={newEventTitle}
        newEventColor={newEventColor}
        newEventNotes={newEventNotes}
        eventData={eventData}
        setEventData={setEventData}
        setNewEventTitle={setNewEventTitle}
        setNewEventColor={setNewEventColor}
        onClick={handleCreateEvent}
        onClose={handleEventModalClose}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export default App;