import React, { useState, useRef, MouseEvent, KeyboardEvent, useEffect, TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, Menu, Settings, X, Share2, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, PenSquare, Plus, Minus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  notes?: string;
  createdBy?: string;
  approvals?: { [key: string]: boolean };
  approvedBy?: string[];
}

interface EventPosition {
  left: number;
  width: number;
}

interface EventModal {
  show: boolean;
  start: Date;
  end: Date;
  event?: Event;
}

interface StoredEvent extends Omit<Event, 'start' | 'end'> {
  start: string;
  end: string;
}

interface TimeRange {
  start: number;
  end: number;
}

interface ApprovalResponse {
  [eventId: string]: boolean;
}

function App() {
  const [scheduleId, setScheduleId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || '';
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ dayIndex: number; hourIndex: number; minutes: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ dayIndex: number; hourIndex: number; minutes: number } | null>(null);
  const [draggingEvent, setDraggingEvent] = useState<{ event: Event, offsetY: number } | null>(null);
  const [eventModal, setEventModal] = useState<EventModal>({ show: false, start: new Date(), end: new Date() });
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventColor, setNewEventColor] = useState('#4285f4');
  const [newEventNotes, setNewEventNotes] = useState('');
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const stored = localStorage.getItem('calendar-time-range');
    return stored ? JSON.parse(stored) : { start: 8, end: 21 };
  });
  const [isCreator, setIsCreator] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const hasEvents = params.get('events');
    const hasId = params.get('id');
    return !hasEvents || !hasId;
  });
  const [userName, setUserName] = useState(() => {
    const stored = localStorage.getItem('calendar-user-name');
    return stored || '';
  });
  const [approvers, setApprovers] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [copyButtonText, setCopyButtonText] = useState('共有リンクをコピー');
  const copyTimeoutRef = useRef<number>();
  const gridRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
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
    
    if (titleParam && idParam) {
      const decodedTitle = decodeURIComponent(titleParam);
      setScheduleTitle(decodedTitle);
      setDisplayTitle(decodedTitle);
      localStorage.setItem(`calendar-schedule-title-${idParam}`, decodedTitle);
    }
    
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
          localStorage.setItem(`calendar-events-${idParam}`, JSON.stringify(decodedEvents));
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
      
      const storedScheduleIds = JSON.parse(localStorage.getItem('calendar-schedule-ids') || '[]');
      storedScheduleIds.push(newScheduleId);
      localStorage.setItem('calendar-schedule-ids', JSON.stringify(storedScheduleIds));
      
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
      localStorage.setItem(`calendar-events-${scheduleId}`, JSON.stringify(storedEvents));
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

  const loadFromLocalStorage = (id: string) => {
    const storedEvents = localStorage.getItem(`calendar-events-${id}`);
    const storedTitle = localStorage.getItem(`calendar-schedule-title-${id}`);
    
    if (storedEvents) {
      const parsedEvents: StoredEvent[] = JSON.parse(storedEvents);
      setEvents(parsedEvents.map(event => ({
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

  const handleShareEvents = () => {
    if (!userName) {
      setShowNameModal(true);
      return;
    }

    shareEvents(true);
  };

  const shareEvents = async (shouldCopy: boolean = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set('id', scheduleId);
    
    if (events.length > 0) {
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
      url.searchParams.set('events', encodedEvents);
    }
    
    if (scheduleTitle) {
      url.searchParams.set('title', encodeURIComponent(scheduleTitle));
    }
    
    if (shouldCopy) {
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
        setCopyButtonText('コピーに失敗しました');
        
        if (copyTimeoutRef.current) {
          window.clearTimeout(copyTimeoutRef.current);
        }
        
        copyTimeoutRef.current = window.setTimeout(() => {
          setCopyButtonText('共有リンクをコピー');
        }, 2000);
      }
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
    shareEvents(true);
  };

  const handleTitleSubmit = () => {
    if (!scheduleTitle.trim()) return;
    setDisplayTitle(scheduleTitle);
    setShowTitleModal(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', { 
      year: 'numeric',
      month: 'long'
    }).format(date);
  };

  const formatEventTime = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  const formatEventDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    }).format(date);
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

  const renderEventCard = (event: Event) => {
    const isEventCreator = event.createdBy === userName;
    const approval = event.approvals?.[userName];

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
        {!isCreator && !isEventCreator && (
          <div className="flex items-center gap-2 mt-2">
            <button
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
                approval === true
                  ? 'bg-green-100 text-green-700'
                  : 'hover:bg-green-50 text-gray-600'
              }`}
              onClick={(e)=> {
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
                <h1 className="text-xl text-gray-800 ml-1">カレンダー</h1>
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
                  className="p-3 hover:bg-gray-100 rounded-full relative hidden sm:block"
                  onClick={handleShareEvents}
                  title={copyButtonText}
                >
                  <Share2 className="w-6 h-6 text-gray-600" />
                </button>
                {showCopiedToast && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-2 bg-gray-800 text-white text-sm rounded shadow-lg whitespace-nowrap z-50">
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

          <div className="h-16 px-4 sm:px-6 border-b flex items-center justify-between">
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
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-8 border-b">
            <div className="border-r h-14" />
            {days.map((day, index) => {
              const dayInfo = getDayNumbers()[index];
              return (
                <div key={day} className="border-r">
                  <div className="h-14 px-1 sm:px-2 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-xs sm:text-sm text-gray-500">{day}</div>
                    <div className={`
                      text-base sm:text-xl
                      ${dayInfo.isToday ? 'w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center' : ''}
                    `}>
                      {dayInfo.number}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div 
            ref={gridRef}
            className="flex-1 grid grid-cols-8 overflow-y-auto relative select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="border-r">
              {hours.map((hour) => (
                <div key={hour} className="h-12 text-right pr-2">
                  <span className="text-xs sm:text-sm text-gray-500 relative -top-2">
                    {hour}:00
                  </span>
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
                      const isPast = isPastTime(timeSlotDate);

                      return (
                        <div 
                          key={hour} 
                          className={`
                            h-12 border-b border-gray-100
                            ${!isTimeInRange(hour) ? 'bg-gray-50 hidden sm:block' : ''}
                            ${isPast ? 'bg-gray-100' : ''}
                          `}
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

      <div className="hidden md:block w-[300px] border-l">
        <div className="h-16 px-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">候補日程</h3>
          <div className="flex items-center gap-4">
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
        <div className="overflow-y-auto h-[calc(100vh-64px)]">
          {events.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              予定はありません
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {[...events]
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map(event => renderEventCard(event))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t shadow-lg z-40">
        <div 
          className="flex items-center justify-between px-4 py-2"
          onClick={() => setShowBottomSheet(true)}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="font-medium">候補日程</span>
          </div>
          <div className="text-sm text-gray-600">
            {events.length}件
          </div>
        </div>
      </div>

      {showBottomSheet && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 md:hidden z-40"
          onClick={() => setShowBottomSheet(false)}
        >
          <div 
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-xl transition-transform duration-300 ease-out translate-y-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">候補日程</h3>
              <button 
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={() => setShowBottomSheet(false)}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {events.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  予定はありません
                </div>
              ) : (
                <div className="space-y-4">
                  {[...events]
                    .sort((a, b) => a.start.getTime() - b.start.getTime())
                    .map(event => renderEventCard(event))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {eventModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 sm:pt-32 px-4 sm:px-0 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[448px] sm:translate-y-0 -translate-y-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">
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
                placeholder="タイトルを追加"
                className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <div className="text-sm text-gray-600 mb-4">
                <div className="sm:block flex items-center gap-2">
                  <span>{formatEventDate(eventModal.start)}</span>
                  <span>{formatEventTime(eventModal.start)} 〜 {formatEventTime(eventModal.end)}</span>
                </div>
              </div>
              <div className="mb-4">
                <div className="sm:block flex items-center gap-3">
                  <label className="block text-sm font-medium text-gray-700 sm:mb-2 whitespace-nowrap">
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
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メモ
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={window.innerWidth < 640 ? 2 : 3}
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
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={handleCreateEvent}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <h3 className="text-xl font-semibold">表示時間の設定</h3>
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
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="flex justify-end mt-6">
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              handleNameSubmit();
            }}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <UserCircle2 className="w-6 h-6 text-gray-600" />
                  <h3 className="text-xl font-semibold">
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
                  className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <div className="flex justify-end gap-3">
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
                    共有
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTitleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              handleTitleSubmit();
            }}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <PenSquare className="w-6 h-6 text-gray-600" />
                  <h3 className="text-xl font-semibold">
                    スケジュール調整のタイトル
                  </h3>
                </div>
                <input
                  type="text"
                  placeholder="タイトルを入力"
                  className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={scheduleTitle}
                  onChange={(e) => {
                    setScheduleTitle(e.target.value);
                    setDisplayTitle(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <div className="flex justify-end gap-3">
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
    </div>
  );
}

export default App;