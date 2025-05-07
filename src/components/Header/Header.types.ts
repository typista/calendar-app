import { EventData } from './../../types/Calendar';

export interface HeaderProps {
  displayTitle: string;
  isCreator: boolean;
  effectiveCreator: boolean;
  showCopiedToast: boolean;
  setShowTitleModal: (boolean) => void;
  setShowBottomSheet: (boolean) => void;
  handleShareEvents: () => void;
  copyButtonText: string;
  setShowSettingsModal: (boolean) => void;
  handleToday: () => void;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  currentDate: date;
  hasValidSchedules: boolean;
  hasAnsweredSchedules: boolean;
  handleScheduleHistoryClick: () => void;
  scheduleId: string;
  scheduleIds: string[];
  handleAnsweredSchedulesClick: () => void;
  setEventData: (boolean, date, date)=>EventData;
}
