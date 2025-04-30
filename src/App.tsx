// App.tsx
// Vite + React + TailwindCSS で Google カレンダーライクな UI を実装
// このファイルでは、週次カレンダー表示、ドラッグ選択、イベント作成・編集・共有、承認機能などを扱う

import React, { useState, useRef, MouseEvent, KeyboardEvent, useEffect, TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, Menu, Settings, X, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, PenSquare, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// ---- 型定義 ----

// イベント本体の型定義
interface Event {
  id: string;             // 固有ID
  title: string;          // タイトル
  start: Date;            // 開始日時
  end: Date;              // 終了日時
  color: string;          // 表示色
  notes?: string;         // メモ（任意）
  createdBy?: string;     // 作成者名（任意）
  approvals?: { [key: string]: boolean }; // 承認状況マップ
  approvedBy?: string[];  // 承認済みユーザーリスト
}

// イベントを描画するための位置情報型
interface EventPosition {
  left: number;           // 親コンテナ幅に対する左オフセット比率
  width: number;          // 親コンテナ幅に対する幅比率
}

// モーダル表示用の型定義
interface EventModal {
  show: boolean;          // モーダル表示フラグ
  start: Date;            // 対象イベント開始日時
  end: Date;              // 対象イベント終了日時
  event?: Event;          // 編集対象イベント（新規の場合は undefined）
}

// localStorage 用に Date を ISO 文字列に変換した型
interface StoredEvent extends Omit<Event, 'start' | 'end'> {
  start: string;
  end: string;
}

// カレンダーで表示する時間帯レンジ
interface TimeRange {
  start: number;          // 開始時刻（hour）
  end: number;            // 終了時刻（hour）
}

// 承認レスポンスを表す型
interface ApprovalResponse {
  [eventId: string]: boolean;
}

// スケジュールの履歴を localStorage に保存するための型
interface ScheduleHistory {
  events: StoredEvent[];
  sharedAt?: string;      // 最終共有日時
}

function App() {
  // ---- URL・localStorage 連携の初期化 ----

  // URL パラメータの scheduleId を取得
  const [scheduleId, setScheduleId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || '';
  });

  // 参照したスケジュールID 一覧を localStorage から読み込み
  const [scheduleIds, setScheduleIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('calendar-schedule-ids');
    return stored ? JSON.parse(stored) : [];
  });

  // 有効な履歴があるかどうかを示すフラグ
  const [hasValidSchedules, setHasValidSchedules] = useState(false);

  // ---- 各モーダル・状態管理用フラグ ----
  const [showScheduleHistoryModal, setShowScheduleHistoryModal] = useState(false);
  const [showAnsweredModal, setShowAnsweredModal] = useState(false);
  const [hasAnsweredSchedules, setHasAnsweredSchedules] = useState(false);

  // カレンダー表示の基準日
  const [currentDate, setCurrentDate] = useState(new Date());

  // イベントリスト (画面表示・編集用)
  const [events, setEvents] = useState<Event[]>([]);

  // ドラッグ選択関連
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ dayIndex: number; hourIndex: number; minutes: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ dayIndex: number; hourIndex: number; minutes: number } | null>(null);

  // 既存イベントのドラッグ移動用
  const [draggingEvent, setDraggingEvent] = useState<{ event: Event; offsetY: number } | null>(null);

  // モーダル入力フォームの状態管理
  const [eventModal, setEventModal] = useState<EventModal>({ show: false, start: new Date(), end: new Date() });
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventColor, setNewEventColor] = useState('#4285f4');
  const [newEventNotes, setNewEventNotes] = useState('');

  // コピー完了トースト表示
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const copyTimeoutRef = useRef<number>();

  // 共有リンクボタンのツールチップ文言
  const [copyButtonText, setCopyButtonText] = useState('共有リンクをコピー');

  // 各種モーダル表示フラグ
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);

  // スケジュールタイトル管理
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');

  // 作成者権限フラグ (URL に events パラメータがなければ作成者)
  const [isCreator, setIsCreator] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !params.get('events');
  });

  // ユーザー名 (ローカル保存)
  const [userName, setUserName] = useState(() => {
    const stored = localStorage.getItem('calendar-user-name');
    return stored || '';
  });

  // 承認者リスト
  const [approvers, setApprovers] = useState<string[]>([]);

  // 現在時刻更新用
  const [currentTime, setCurrentTime] = useState(new Date());

  // 設定画面の時間帯レンジ (localStorage から初期化)
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const stored = localStorage.getItem('calendar-time-range');
    return stored ? JSON.parse(stored) : { start: 8, end: 21 };
  });

  // 初回マウント判定 (タイトル入力制御用)
  const isInitialMount = useRef(true);

  /**
   * Date オブジェクトを「M/D」形式の文字列にフォーマットする
   * 例: new Date(2025, 3, 9) → "4/9"
   */
  const formatDate = (date: Date): string => {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${m}/${d}`;
  };

  /**
   * Date オブジェクトを「HH:mm」形式の文字列にフォーマットする
   * 例: new Date(2025, 3, 9,  9,  5) → "09:05"
   */
  const formatEventTime = (date: Date): string => {
    const hours   = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  /**
   * Date オブジェクトを「YYYY/MM/DD HH:mm」形式の文字列にフォーマットする
   * 例: new Date(2025, 3, 9, 14, 30) → "2025/04/09 14:30"
   */
  const formatEventDate = (date: Date): string => {
    const Y = date.getFullYear();
    const M = String(date.getMonth() + 1).padStart(2, '0');
    const D = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${Y}/${M}/${D} ${h}:${m}`;
  };

  // 履歴ボタン押下でスケジュール履歴モーダルを開く
  const handleScheduleHistoryClick = (): void => {
    setShowScheduleHistoryModal(true);
  };
  // 必要ならモーダルを閉じるハンドラも併せて
  const handleScheduleHistoryClose = (): void => {
    setShowScheduleHistoryModal(false);
  };

  // 曜日・時間・色パレットの定義
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const colors = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#46bdc6'];

  // ---- 副作用 (useEffect) ----

  // 1分ごとに現在時刻を更新 (ライトなタイマー)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // URL パラメータ or localStorage からイベントデータを読み込み・初期設定
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventsParam = params.get('events');
    const titleParam = params.get('title');
    const idParam = params.get('id');

    if (eventsParam) {
      try {
        // URL から渡された base64+encodeURIComponent 形式を逆変換
        const decodedEvents = JSON.parse(decodeURIComponent(atob(eventsParam)));
        // StoredEvent -> Event に変換
        const parsedEvents = decodedEvents.map((ev: StoredEvent) => ({
          ...ev,
          start: new Date(ev.start),
          end: new Date(ev.end),
        }));

        // 承認情報の復元 (localStorage)
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

        // 初回作成者の場合、ID やタイトルをセット & localStorage 保存
        if (idParam) {
          setScheduleId(idParam);
          localStorage.setItem(`calendar-events-${idParam}`, JSON.stringify({ events: decodedEvents, sharedAt: new Date().toISOString() }));
          if (titleParam) {
            const decodedTitle = decodeURIComponent(titleParam);
            setScheduleTitle(decodedTitle);
            setDisplayTitle(decodedTitle);
            localStorage.setItem(`calendar-schedule-title-${idParam}`, decodedTitle);
          }
        }

        // 承認者リストを構築
        const unique = new Set<string>();
        parsedEvents.forEach(ev => {
          ev.createdBy && unique.add(ev.createdBy);
          ev.approvedBy?.forEach(name => unique.add(name));
        });
        setApprovers(Array.from(unique));

        // ユーザー名が未入力なら入力モーダル表示
        if (!userName) setShowNameModal(true);
      } catch (e) {
        console.error('イベント解析失敗', e);
        if (idParam) loadFromLocalStorage(idParam);
      }
    } else if (idParam) {
      // URL に events がない場合、localStorage から読み込み
      loadFromLocalStorage(idParam);
    } else if (isCreator && isInitialMount.current) {
      // 完全新規作成フロー (ID 作成 & タイトル入力)
      const newId = uuidv4();
      setScheduleId(newId);
      setShowTitleModal(true);
      isInitialMount.current = false;
    }
  }, [userName, isCreator]);

  // イベント配列 or scheduleId が変わったら localStorage 更新
  useEffect(() => {
    if (!scheduleId) return;
    const stored: StoredEvent[] = events.map(ev => ({ ...ev, start: ev.start.toISOString(), end: ev.end.toISOString() }));
    localStorage.setItem(`calendar-events-${scheduleId}`, JSON.stringify({ events: stored, sharedAt: new Date().toISOString() }));
  }, [events, scheduleId]);

  // タイトル更新時の localStorage 反映
  useEffect(() => {
    if (scheduleId && scheduleTitle) {
      localStorage.setItem(`calendar-schedule-title-${scheduleId}`, scheduleTitle);
    }
  }, [scheduleTitle, scheduleId]);

  // 時間帯設定更新時に localStorage 反映
  useEffect(() => {
    localStorage.setItem('calendar-time-range', JSON.stringify(timeRange));
  }, [timeRange]);

  // ユーザー名更新時に localStorage 反映
  useEffect(() => {
    if (userName) localStorage.setItem('calendar-user-name', userName);
  }, [userName]);

  // 回答済みフラグを localStorage から読み込み
  useEffect(() => {
    if (scheduleId && userName) {
      setHasAnsweredSchedules(localStorage.getItem(`calendar-approvals-${scheduleId}-${userName}`) !== null);
    } else {
      setHasAnsweredSchedules(false);
    }
  }, [scheduleId, userName]);

  // 保存済みスケジュールから有効な履歴があるかチェック
  useEffect(() => {
    let valid = false;
    for (const id of scheduleIds) {
      const data = localStorage.getItem(`calendar-events-${id}`);
      if (data) {
        try {
          const { sharedAt } = JSON.parse(data) as ScheduleHistory;
          if (sharedAt && !isNaN(new Date(sharedAt).getTime())) { valid = true; break; }
        } catch {}
      }
    }
    setHasValidSchedules(valid);
  }, [scheduleIds]);

  // ---- 関数定義 ----

  /**
   * localStorage から events と title を読み込むヘルパー
   */
  const loadFromLocalStorage = (id: string) => {
    const data = localStorage.getItem(`calendar-events-${id}`);
    const title = localStorage.getItem(`calendar-schedule-title-${id}`);
    if (data) {
      const { events: storedEvents } = JSON.parse(data) as ScheduleHistory;
      setEvents(storedEvents.map(ev => ({ ...ev, start: new Date(ev.start), end: new Date(ev.end) })));
    }
    if (title) {
      setScheduleTitle(title);
      setDisplayTitle(title);
    }
  };

  /**
   * イベント共有用 URL を生成してクリップボードにコピー
   */
  const shareEvents = async () => {
    // 作成者自身または一定数以上承認されたイベントのみをフィルタ
    const filtered = events.filter(ev => {
      if (ev.createdBy === userName) return true;
      if (!ev.approvals) return false;
      const count = Object.values(ev.approvals).filter(v => v).length;
      const threshold = approvers.length + (approvers.includes(userName) ? 0 : 1) - 1;
      return count >= threshold;
    });
    const toStore: StoredEvent[] = filtered.map(ev => ({ ...ev, start: ev.start.toISOString(), end: ev.end.toISOString(), approvedBy: [...(ev.approvedBy || []), userName] }));
    const encoded = btoa(encodeURIComponent(JSON.stringify(toStore)));
    const url = new URL(window.location.href);
    url.searchParams.set('events', encoded);
    url.searchParams.set('id', scheduleId);
    scheduleTitle && url.searchParams.set('title', encodeURIComponent(scheduleTitle));

    try {
      await navigator.clipboard.writeText(url.toString());
      setShowCopiedToast(true);
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setShowCopiedToast(false), 2000);
    } catch {
      console.error('コピー失敗');
    }
  };

  // 共有ボタンクリック時のハンドラ
  const handleShareEvents = () => {
    if (!userName) return setShowNameModal(true);
    shareEvents();
  };

  /**
   * 単一イベントの承認操作を反映し、localStorage に保存
   */
  const handleApproval = (eventId: string, approved: boolean) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== eventId) return ev;
      const newMap = { ...(ev.approvals || {}), [userName]: approved };
      const newList = approved ? [...(ev.approvedBy || []), userName] : (ev.approvedBy || []).filter(n => n !== userName);
      return { ...ev, approvals: newMap, approvedBy: newList };
    }));
    localStorage.setItem(`calendar-approvals-${scheduleId}-${userName}`, JSON.stringify(
      events.reduce((acc, ev) => { if (ev.approvals?.[userName] !== undefined) acc[ev.id] = ev.approvals[userName]; return acc; }, {} as ApprovalResponse)
    ));
  };

  // 名前入力モーダルの OK ボタン
  const handleNameSubmit = () => {
    if (!userName.trim()) return;
    setShowNameModal(false);
    shareEvents();
  };

  // タイトル入力モーダルの保存ボタン
  const handleTitleSubmit = () => {
    if (!scheduleTitle.trim()) return;
    setDisplayTitle(scheduleTitle);
    setShowTitleModal(false);
    setIsCreator(true);
    const updated = Array.from(new Set([...scheduleIds, scheduleId]));
    setScheduleIds(updated);
    localStorage.setItem('calendar-schedule-ids', JSON.stringify(updated));
  };

  // 前週 / 次週 / 今日 ボタン
  const handlePrevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const handleNextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };
  const handleToday    = () => setCurrentDate(new Date());

  // 時間帯チェック
  const isTimeInRange = (h: number) => h >= timeRange.start && h < timeRange.end;
  const isPastTime    = (d: Date) => d < new Date();

  /**
   * マウス or タッチ位置から calendar grid 上の day, hour, minute を計算
   */
  const getEventPosition = (e: MouseEvent | Touch) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const timeColWidth = rect.width / 8;
    const x = e.clientX - rect.left - timeColWidth;
    const y = e.clientY - rect.top;
    const dayIdx = Math.floor((x / (rect.width - timeColWidth)) * 7);
    const hrIdx  = Math.floor(y / 48);
    const mins   = Math.floor((y % 48) / 24) * 30;
    if (dayIdx < 0 || dayIdx >= 7 || hrIdx < 0 || hrIdx >= 24 || !isTimeInRange(hrIdx)) return null;
    return { dayIndex: dayIdx, hourIndex: hrIdx, minutes: mins };
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (draggingEvent || !isCreator) return;
    
    const position = getEventPosition(e);
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
    if (!isCreator) return;
    
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
    if (!isCreator) return;
    
    e.stopPropagation();
    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    
    setDraggingEvent({ event, offsetY });
  };

  const handleEventTouchStart = (e: TouchEvent, event: Event) => {
    if (!isCreator) return;
    
    e.stopPropagation();
    const touch = e.touches[0];
    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const offsetY = touch.clientY - rect.top;
    
    setDraggingEvent({ event, offsetY });
  };

  const handleEventDoubleClick = (e: MouseEvent, event: Event) => {
    if (!isCreator) return;
    
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
    if (!isCreator) return;

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
          className={`absolute rounded-lg px-2 py-1 text-white text-sm ${isCreator ? 'cursor-move' : ''} flex flex-col`}
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

  const getDayNumbers = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    return days.map((_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return {
        number: date.getDate(),
        isToday: date.toDateString() === new Date().toDateString()
      };
    });
  };

  // カレンダー描画用 ref
  const gridRef = useRef<HTMLDivElement>(null);

  const renderEventCard = (event: Event) => {
    const isEventCreator = event.createdBy === userName;
    const approval = event.approvals?.[userName];
    const showApprovalButtons = !isCreator && !isEventCreator;

    return (
      <div
        key={event.id}
        className="p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
        style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
        onClick={(e) => handleEventDoubleClick(e as any, event)}
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
              {isCreator && (
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
            {days.map((day, index) => {
              const dayInfo = getDayNumbers()[index];
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
            className="relative flex-1 grid grid-cols-8"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="border-r">
              {hours.map((hour) => (
                <div key={hour} className="h-12 text-right pr-2 text-sm text-gray-500">
                  {hour}:00
                </div>
              ))}
            </div>
            {days.map((day, index) => {
              const weekStart = new Date(currentDate);
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              const currentDay = new Date(weekStart);
              currentDay.setDate(weekStart.getDate() + index);

              return (
                <div key={day} className="border-r">
                  <div>
                    {hours.map((hour) => {
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

      <div className="hidden md:block w-80 border-l">
        <div className="h-16 px-4 border-b flex items-center justify-between">
          <h3 className="font-medium">予定一覧</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{events.length}件</span>
            <button 
              className="p-2 hover:bg-gray-100 rounded-full"
              onClick={handleShareEvents}
              title={copyButtonText}
            >
              <Copy className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="h-[calc(100vh-64px)] overflow-y-auto">
          <div className="p-4 space-y-4">
            {events.length === 0 ? (
              <div className="text-center text-gray-500">
                予定はありません
              </div>
            ) : (
              events
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map(event => renderEventCard(event))
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 md:hidden">
        <div 
          className="bg-white border-t shadow-lg px-4 py-3 flex items-center justify-between"
          onClick={() => setShowBottomSheet(true)}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="font-medium">予定一覧</span>
          </div>
          <div className="text-sm text-gray-600">
            {events.length}件
          </div>
        </div>
      </div>

      {showBottomSheet && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
          onClick={() => setShowBottomSheet(false)}
        >
          <div 
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium">予定一覧</h3>
              <button 
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={() => setShowBottomSheet(false)}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
              {events.length === 0 ? (
                <div className="text-center text-gray-500">
                  予定はありません
                </div>
              ) : (
                events
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .map(event => renderEventCard(event))
              )}
            </div>
          </div>
        </div>
      )}

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

      {showNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              handleNameSubmit();
            }}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <UserCircle2 className="w-6 h-6 text-gray-600" />
                  <h3 className="text-xl font-medium">
                    名前を入力してください
                  </h3>
                </div>
                {approvers.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      これまでの回答者:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {approvers.map((approver, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-600"
                        >
                          {approver}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="あなたの名前"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    onClick={() => setShowNameModal(false)}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    disabled={!userName.trim()}
                  >
                    OK
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTitleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              handleTitleSubmit();
            }}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <PenSquare className="w-6 h-6 text-gray-600" />
                  <h3 className="text-xl font-medium">
                    スケジュール調整のタイトル
                  </h3>
                </div>
                <input
                  type="text"
                  placeholder="タイトルを入力"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={scheduleTitle}
                  onChange={(e) => {
                    setScheduleTitle(e.target.value);
                    setDisplayTitle(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    onClick={() => setShowTitleModal(false)}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    disabled={!scheduleTitle.trim()}
                  >
                    保存
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleHistoryModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50"
          onClick={() => setShowScheduleHistoryModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium">作成済みの候補日程</h3>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  onClick={() => setShowScheduleHistoryModal(false)}
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto divide-y">
                {scheduleIds.map(id => {
                  const storedData = localStorage.getItem(`calendar-events-${id}`);
                  if (!storedData) return null;

                  try {
                    const { sharedAt } = JSON.parse(storedData) as ScheduleHistory;
                    const title = localStorage.getItem(`calendar-schedule-title-${id}`) || '無題の候補日程';
                    const date = new Date(sharedAt);
                    
                    // Skip invalid dates
                    if (isNaN(date.getTime())) return null;

                    return (
                      <div key={id} className="py-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{title}</div>
                          <div className="text-sm text-gray-600">
                            {date.toLocaleString('ja-JP')}
                          </div>
                        </div>
                        <button
                          className="p-2 hover:bg-gray-100 rounded-full"
                          onClick={() => handleCopyHistoryUrl(id)}
                        >
                          <Copy className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    );
                  } catch (error) {
                    return null; // Skip any entries that fail to parse
                  }
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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