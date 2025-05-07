import { Event } from '../../types/Event';

// 表示時間帯の型
interface TimeRange {
  start: number;          // 開始時刻 (hour)
  end: number;            // 終了時刻 (hour)
}

export interface CalendarGridProps {
  gridRef: () => HTMLDivElement;
  timeRange: TimeRange;
  currentTime: Date;
  events: Event[];
  draggingEvent: () => { Event, number };
  effectiveCreator: boolean;
  currentDate: Date;
  setIsDragging: boolean;
  setDragStart: (number, number, number) => void;
  setDragEnd: (number, number, number) => void;
  isDragging: boolean;
  dragStart: (number, number, number) => void;
  dragEnd: (number, number, number) => void;
  setEventData: (boolean, date, date) => EventData;
  setNewEventTitle: (string) => void;
  setNewEventColor: (color) => void;
  setNewEventNotes: (string) => void;
  setDraggingEvent: (Event, number) => void;
}
