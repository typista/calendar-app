import React, { useState, useEffect } from 'react';
import { HeaderProps } from './Header.types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  List,
  Settings,
  Plus,
  PenSquare
} from 'lucide-react';
import { getJsonItem, setJsonItem } from '../../utils/storage';
import { copyScheduleLink } from '../../utils/clipboard';
import { formatDate } from '../../utils/dateUtils';

export const Header: React.FC<HeaderProps> = ({
  displayTitle,
  userName,
  isCreator,
  events,
  scheduleTitle,
  effectiveCreator,
  copyTimeoutRef,
  copyButtonText,
  setCopyButtonText,
  showCopiedToast,
  setShowCopiedToast,
  setShowTitleModal,
  setShowSettingsModal,
  setShowBottomSheet,
  showBottomSheet,
  setShowNameModal,
  currentDate,
  setCurrentDate,
  handleScheduleHistoryClick,
  handleAnsweredSchedulesClick,
  scheduleId,
  scheduleIds,
  setScheduleIds,
  setEventData
}) => {
  // ① 作成済みスケジュールの存在判定
  // scheduleIds 配列内のいずれかのIDについて、
  // localStorage の calendar-schedule-owner-<id> が自分の userName なら true
  const createdCount = scheduleIds.filter(id =>
    getJsonItem<string>(`calendar-schedule-owner-${id}`) === userName
  ).length;

  const [hasAnsweredSchedules, setHasAnsweredSchedules] = useState(() =>
    scheduleIds.some(id =>
      getJsonItem(`calendar-approvals-${id}-${userName}`) !== null
    )
  );

  useEffect(() => {
    // current scheduleについてもチェック
    const approvals = getJsonItem(`calendar-approvals-${scheduleId}-${userName}`);
    if (approvals !== null) {
      setHasAnsweredSchedules(true);
    }
  }, [scheduleIds, scheduleId, userName]);

  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };
  const handleToday = () => setCurrentDate(new Date());

  const handleShareEvents = async () => {
    // ② userName未入力時はNameModalを開く
    if (!userName) {
      setShowNameModal(true);
      return;
    }
    try {
      const toShare = effectiveCreator
        ? events
        : events.filter(ev => ev.approvals?.[userName]);
      await copyScheduleLink(toShare, window.location.href, scheduleId, scheduleTitle || '');
      // コピー直後にIDを追加し、作成済みボタンを即時表示
      if (!scheduleIds.includes(scheduleId)) {
        const next = [...scheduleIds, scheduleId];
        setScheduleIds(next);
        setJsonItem('calendar-schedule-ids', next);
      }
      setCopyButtonText('コピーしました！');
      setShowCopiedToast(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopyButtonText('共有リンクをコピー');
        setShowCopiedToast(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  return (
    <header className="flex flex-col">
      {/* Top bar */}
      <div className="h-16 px-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="p-3 hover:bg-gray-100 rounded-full">
            <Calendar className="w-6 h-6 text-gray-600" />
          </button>
          {displayTitle && (
            <span className="flex items-center text-gray-600">
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
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-3 hover:bg-gray-100 rounded-full md:hidden"
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
            title="設定"
          >
            <Settings className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>
      {/* Bottom bar */}
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
          {createdCount > 0 && (
            <button
              className="flex items-center gap-1 sm:gap-2 px-3 py-2 bg-white hover:bg-gray-100 rounded-md border text-sm sm:text-base"
              onClick={handleScheduleHistoryClick}
            >
              作成済みの候補日程
            </button>
          )}
          {hasAnsweredSchedules && (
            <button
              className="flex items-center gap-1 sm:gap-2 px-3 py-2 bg-white hover:bg-gray-100 rounded-md border text-sm sm:text-base"
              onClick={handleAnsweredSchedulesClick}
            >
              回答済みの候補日程
            </button>
          )}
          {effectiveCreator && (
            <button
              className="flex items-center gap-1 sm:gap-2 px-3 py-2 bg-white hover:bg-gray-100 rounded-full border shadow-sm text-sm sm:text-base"
              onClick={() => setEventData({ show: true, start: new Date(), end: new Date() })}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">予定を作成</span>
            </button>
          )}
        </div>
      </div>
    </header>
)};
