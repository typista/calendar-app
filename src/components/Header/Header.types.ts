import { Event } from './../../types/Event';

// モーダル表示用の型定義
interface EventData {
  show: boolean;          // モーダル表示フラグ
  start: Date;            // 編集対象開始日時
  end: Date;              // 編集対象終了日時
  event?: Event;          // 編集対象イベント（新規なら undefined）
}

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
