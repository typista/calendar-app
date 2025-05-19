import React, { FormEvent, Dispatch, SetStateAction } from 'react'
import { CalendarEvent } from '../../types/Calendar';

export interface CalendarListProps {
    events: CalendarEvent[];
    userName: string;
    isCreator: boolean;
    effectiveCreator: boolean;
    scheduleId: string;
    onClick: (boolean) => void;
    setEvents: Dispatch<SetStateAction<Event[]>>;
    showBottomSheet: boolean;
    copyButtonText: string;
    setEventData: (boolean:  date:  date) => EventData;
    setNewEventTitle: (string) => void;
    setNewEventColor: (color) => void;
    setNewEventNotes: (string) => void;
}
