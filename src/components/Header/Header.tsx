import React, { useState, useRef, MouseEvent, KeyboardEvent, useEffect, TouchEvent } from 'react';
import { HeaderProps } from './Header.types';
import { Calendar, ChevronLeft, ChevronRight, Copy, List, Settings, Plus, PenSquare } from 'lucide-react';
import { formatDate } from './../../utils/dateUtils';

export const Header: React.FC<HeaderProps> = ({
  displayTitle,
  isCreator,
  effectiveCreator,
  showCopiedToast,
  setShowTitleModal,
  setShowBottomSheet,
  handleShareEvents,
  copyButtonText,
  setShowSettingsModal,
  currentDate,
  setCurrentDate,
  hasValidSchedules,
  hasAnsweredSchedules,
  handleScheduleHistoryClick,
  scheduleId,
  scheduleIds,
  handleAnsweredSchedulesClick,
  setEventData
}) => {
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

  return (
  <div>
    <header className="flex flex-col">
      <div className="h-16 px-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="p-3 hover:bg-gray-100 rounded-full">
            <Calendar className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl text-gray-800">カレンダー</h1>
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
          >
            <Settings className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

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
          {hasValidSchedules && (
            <button
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-100 rounded-md border text-sm sm:text-base"
              onClick={handleScheduleHistoryClick}
            >
              作成済みの候補日程
            </button>
          )}
          {!scheduleIds.includes(scheduleId) && hasAnsweredSchedules && (
            <button
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-100 rounded-md border text-sm sm:text-base"
              onClick={handleAnsweredSchedulesClick}
            >
              回答済みの候補日程
            </button>
          )}
          {effectiveCreator && (
            <button 
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-100 rounded-full border shadow-sm text-sm sm:text-base"
              onClick={() => setEventData({ show: true, start: new Date(), end: new Date() })}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">予定を作成</span>
              <span className="sm:hidden">作成</span>
            </button>
          )}
        </div>
      </div>
    </header>
  </div>
  );
}
