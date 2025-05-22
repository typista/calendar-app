import { Dispatch, SetStateAction } from 'react'
import { Event } from './event'

// useCalendarData の戻り値
export interface UseCalendarDataResult {
  events: Event[]
  setEvents: Dispatch<SetStateAction<Event[]>>
  scheduleTitle: string
  setScheduleTitle: Dispatch<SetStateAction<string>>
  displayTitle: string
  setDisplayTitle: Dispatch<SetStateAction<string>>
  showAnsweredButton: boolean
  effectiveCreator: boolean
}