aimport { CalendarEvent } from '../../types/Calendar';

export interface CalendarListProps {
    events: CalendarEvent[];
    userName: string;
    isCreator: boolean;
    effectiveCreator: boolean;
    scheduleId: string;
    onClick: (boolean) => void;
    setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
    showBottomSheet: boolean;
    copyButtonText: string;
    setEventData: (boolean:  date:  date) => EventData;
    setNewEventTitle: (string) => void;
    setNewEventColor: (color) => void;
    setNewEventNotes: (string) => void;
}
