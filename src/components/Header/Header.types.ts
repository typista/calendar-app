import { EventData } from '../../types/calendar';

export interface HeaderProps {
  displayTitle: string;
  userName: string;
  isCreator: boolean;
  effectiveCreator: boolean;
  showCopiedToast: boolean;
  setShowTitleModal: (boolean) => void;
  setShowBottomSheet: (boolean) => void;
  handleShareEvents: () => void;
  copyButtonText: string;
  setShowSettingsModal: (boolean) => void;
  currentDate: date;
  setCurrentDate: (date) => void;
  hasValidSchedules: boolean;
  hasAnsweredSchedules: boolean;
  handleScheduleHistoryClick: () => void;
  scheduleId: string;
  scheduleIds: string[];
  handleAnsweredSchedulesClick: () => void;
  setEventData: (boolean, date, date)=>EventData;
}
