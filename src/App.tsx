import { useState, useRef, useCallback, KeyboardEvent, useEffect } from 'react';
import { CalendarEvent, EventData, StoredEvent, TimeRange, ScheduleHistory } from './types';
import { getJsonItem, setJsonItem } from './utils/storage';
import { copyScheduleLink } from './utils/clipboard';
import { buildScheduleUrl } from './utils/buildScheduleUrl';
import { useCalendarData } from './hooks/useCalendarData';
import { Header } from './components/Header/Header';
import { useCalendarInitializer } from './components/CalendarInitializer/CalendarInitializer';
import { CalendarGrid } from './components/CalendarGrid/CalendarGrid';
import { CalendarList } from './components/CalendarList/CalendarList';
import { NameModal } from './components/Modal/NameModal';
import { TitleModal } from './components/Modal/TitleModal';
import { ScheduleHistoryModal } from './components/Modal/ScheduleHistoryModal';
import { AnsweredHistoryModal } from './components/Modal/AnsweredHistoryModal';
import { SettingsModal } from './components/Modal/SettingsModal';
import { EventModal } from './components/Modal/EventModal';
import { v4 as uuidv4 } from 'uuid';



function App() {
  // URLパラメータから scheduleId を取得（参照専用）
  const [scheduleId, setScheduleId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || uuidv4();
  });

  // ユーザー名
  const [userName, setUserName] = useState(() => {
    const stored = getJsonItem('calendar-user-name') as string | null;
    return stored ?? '';
  });

  // 作成者判定（URLに events パラメータが無い場合は作成者）
  const [isCreator, setIsCreator] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !params.get('events');
  });

  // これまで参照した scheduleIds を localStorage から初期化
  const [scheduleIds, setScheduleIds] = useState<string[]>(() => {
    const stored = getJsonItem('calendar-schedule-ids');
    return stored ? stored : [];
  });

  // 各種モーダル表示フラグ
  const [showScheduleHistoryModal, setShowScheduleHistoryModal] = useState(false);
  const [showAnsweredModal, setShowAnsweredModal] = useState(false);

  // カレンダー表示の基準日
  const [currentDate, setCurrentDate] = useState(new Date());

  // イベントリスト
  
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
    const stored = getJsonItem('calendar-time-range');
    return stored ? stored : { start: 8, end: 21 };
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
    effectiveCreator,
  } = useCalendarData(scheduleId, userName, isCreator);

  const copyTimeoutRef = useRef<number>();

  // カレンダーグリッド参照
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scheduleId) {
      const storedEvents: StoredEvent[] = events.map(event => ({
        ...event,
        start: event.start.toISOString(),
        end: event.end.toISOString()
      }));

      const existingSchedule = getJsonItem<ScheduleHistory>(`calendar-events-${scheduleId}`);

      const scheduleData: ScheduleHistory = {
        events: storedEvents,
        sharedAt: existingSchedule?.sharedAt ?? undefined
      };

      setJsonItem(`calendar-events-${scheduleId}`, scheduleData);
    }
  }, [events, scheduleId]);

  useEffect(() => {
    if (scheduleId && scheduleTitle) {
      setJsonItem(`calendar-schedule-title-${scheduleId}`, scheduleTitle);
    }
  }, [scheduleTitle, scheduleId]);

  useEffect(() => {
    setJsonItem('calendar-time-range', timeRange);
  }, [timeRange]);

  useEffect(() => {
    if (userName) {
      setJsonItem('calendar-user-name', userName);
    }
  }, [userName]);

  useEffect(() => {
    if (scheduleTitle) {
      setJsonItem('calendar-schedule-title', scheduleTitle);
    }
  }, [scheduleTitle]);

  useEffect(() => {
    if (scheduleIds.length > 0) {
      setJsonItem('calendar-schedule-ids', scheduleIds);
    }
  }, [scheduleIds]);

  useEffect(() => {
    // 自分が登録したタイトルのオーナーなら
    if (userName && displayTitle) {
      setJsonItem(`calendar-schedule-owner-${scheduleId}`, userName);
      const owner = getJsonItem<string>(`calendar-schedule-owner-${scheduleId}`);
      if (owner === userName && !scheduleIds.includes(scheduleId)) {
        const next = [...scheduleIds, scheduleId];
        setScheduleIds(next);
        setJsonItem('calendar-schedule-ids', next);
      }
    }
  }, [userName, displayTitle, scheduleId, scheduleIds]);

  // 初期マウント時：すでにオーナー登録が localStorage にあれば scheduleIds に追加
  useEffect(() => {
   if (userName && displayTitle) {
     const owner = getJsonItem<string>(`calendar-schedule-owner-${scheduleId}`);
     if (owner === userName && !scheduleIds.includes(scheduleId)) {
       setScheduleIds(prev => {
         const next = [...prev, scheduleId];
         setJsonItem('calendar-schedule-ids', next);
         return next;
       });
     }
   }
 }, []); // マウント一度きりで OK

  const loadFromLocalStorage = useCallback((id: string) => {
    const storedData = getJsonItem<ScheduleHistory>(`calendar-events-${id}`);
    const storedTitle = getJsonItem<string>(`calendar-schedule-title-${id}`);
    
    if (storedData) {
      const { events } = storedData;
      const normalized = events.map(ev => ({
        ...ev,
        start: new Date(ev.start),
        end:   new Date(ev.end)
      }));
      setEvents(normalized as StoredEvent[]);
    }
    
    if (storedTitle) {
      setScheduleTitle(storedTitle);
      setDisplayTitle(storedTitle);
    }
  }, []);
  
  const handleSettingsModalClose = () => {
    setShowSettingsModal(false);
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
    const updatedIds = Array.from(new Set([...(getJsonItem('calendar-schedule-ids')||'[]'), scheduleId]));
    setJsonItem('calendar-schedule-ids', updatedIds);
    setJsonItem(`calendar-schedule-owner-${scheduleId}`, userName);
    setJsonItem(`calendar-schedule-title-${scheduleId}`, scheduleTitle);
    setJsonItem(
      `calendar-events-${scheduleId}`,
      {
        events: [], 
        sharedAt: new Date().toISOString()
      }
    );
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

  const handleOpenExternalTab = async (id: string) => {
    const storedData = getJsonItem<ScheduleHistory>(`calendar-events-${id}`);
    const storedTitle = getJsonItem<string>(`calendar-schedule-title-${id}`);

    if (storedData) {
      const { events: storedEvents }: ScheduleHistory = storedData;
      const url = buildScheduleUrl(
        window.location.href,
        id,
        storedEvents,
        storedTitle || ''
      );
      window.open(url, '_blank');
    }
  };

  const handleCopyHistoryUrl = async (id: string) => {
    const storedData = getJsonItem<ScheduleHistory>(`calendar-events-${id}`);
    const storedTitle = getJsonItem<string>(`calendar-schedule-title-${id}`);

    if (storedData) {
      const { events: storedEvents }: ScheduleHistory = storedData;
      try {
        await copyScheduleLink(
          storedEvents,
          window.location.href,
          id,
          storedTitle || ''
        );
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
    
    const newEvent: CalendarEvent = {
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

  // --- 2. “作成済み” と “回答済み” の ID リストをそれぞれ計算 ------------
  // “作成済み”：localStorage の calendar-events-<id> に含まれる events の中で
  //             createdBy === userName のイベントがひとつでもあれば所有者とみなす
  const createdScheduleIds = scheduleIds.filter((id) =>
    getJsonItem<string>(`calendar-schedule-owner-${id}`) === userName
  );

  // “回答済み” ：localStorage に calendar-approvals-<id>-<userName> があれば含める
  const answeredScheduleIds = scheduleIds.filter((id) => {
    if (!userName) return false;
    const approvals = getJsonItem<{ [ev: string]: boolean }>(
      `calendar-approvals-${id}-${userName}`
    );
    return approvals !== null;
  });

  useCalendarInitializer({
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
  });

  return (
    <div className="h-screen flex bg-white">
      <div className="flex-1 flex flex-col">

        <Header
          displayTitle={displayTitle}
          userName={userName}
          isCreator={isCreator}
          events={events}
          scheduleTitle={scheduleTitle}
          approvers={approvers}
          effectiveCreator={effectiveCreator}
          copyTimeoutRef={copyTimeoutRef}
          showCopiedToast={showCopiedToast}
          setShowTitleModal={setShowTitleModal}
          setShowBottomSheet={setShowBottomSheet}
          copyButtonText={copyButtonText}
          setCopyButtonText={setCopyButtonText}
          setShowCopiedToast={setShowCopiedToast}
          setShowSettingsModal={setShowSettingsModal}
          setShowNameModal={setShowNameModal}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          handleScheduleHistoryClick={handleScheduleHistoryClick}
          scheduleId={scheduleId}
          scheduleIds={scheduleIds}
          setScheduleIds={setScheduleIds}
          handleAnsweredSchedulesClick={handleAnsweredSchedulesClick}
          setEventData={setEventData}
        />

        <CalendarGrid
          userName={userName}
          gridRef={gridRef}
          timeRange={timeRange}
          currentTime={currentTime}
          events={events}
          effectiveCreator={effectiveCreator}
          currentDate={currentDate}
          setEvents={setEvents}
          setEventData={setEventData}
          setNewEventTitle={setNewEventTitle}
          setNewEventColor={setNewEventColor}
          setNewEventNotes={setNewEventNotes}
          showBottomSheet={showBottomSheet}
          setShowBottomSheet={setShowBottomSheet}
        />
      </div>

      <CalendarList
        events={events}
        userName={userName}
        isCreator={isCreator}
        effectiveCreator={effectiveCreator}
        scheduleId={scheduleId}
        onClick={setShowBottomSheet}
        setEvents={setEvents}
        setEventData={setEventData}
        setNewEventTitle={setNewEventTitle}
        setNewEventColor={setNewEventColor}
        setNewEventNotes={setNewEventNotes}
        setShowBottomSheet={setShowBottomSheet}
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
        events={events}
        handleKeyDown={handleKeyDown}
        onClose={handleNameModalClose}
        scheduleId={scheduleId}
        scheduleTitle={scheduleTitle}
        approvers={approvers}
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
        scheduleIds={createdScheduleIds}
        handleOpenExternalTab={handleOpenExternalTab}
        onClick={setShowScheduleHistoryModal}
        onClose={handleScheduleHistoryClose}
      />
      <AnsweredHistoryModal
        show={showAnsweredModal}
        scheduleIds={answeredScheduleIds}
        handleOpenExternalTab={handleOpenExternalTab}
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
        setNewEventNotes={setNewEventNotes}
        onClick={handleCreateEvent}
        onClose={handleEventModalClose}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export default App;