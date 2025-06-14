import { CalendarEvent, TimeRange } from '../../types/calendar';

export interface CalendarGridProps {
  scheduleId: string;
  scheduleTitle: string;
  gridRef: () => HTMLDivElement;
  timeRange: TimeRange;
  currentTime: Date;
  events: CalendarEvent[];
  setEvents: Dispatch<SetStateAction<Event[]>>;
  draggingEvent: () => { Event, number };
  effectiveCreator: boolean;
  currentDate: Date;
  setEventData: (boolean, date, date) => EventData;
  setNewEventTitle: (string) => void;
  setNewEventColor: (color) => void;
  setNewEventNotes: (string) => void;
}
