import React, { FormEvent, useState } from 'react'
import { ModalWrapper } from './ModalWrapper'
import { WEEK_DAYS, HOURS, COLORS } from '../../constants/calendar';
import { EventData } from '../../types/calendar';
import { formatDate, formatEventTime, formatEventDate, getDayNumbers } from '../../utils/dateUtils';
import { ChevronLeft, ChevronRight, Menu, Settings, X, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, PenSquare, Plus, Minus } from 'lucide-react';

type EventModalProps = {
    show: boolean
    newEventTitle: string
    newEventColor: string
    newEventNotes: string
    eventData: EventData
    setEventData: (data: EventData) => void
    setNewEventTitle: (title: string) => void
    setNewEventColor: (color: string) => void
    setNewEventNotes: (notes: string) => void
    onClick: () => void
    onClose: () => void
}

export const EventModal: React.FC<EventModalProps> = ({
  show,
  newEventTitle,
  newEventColor,
  newEventNotes,
  eventData,
  setEventData,
  setNewEventTitle,
  setNewEventColor,
  setNewEventNotes,
  onClick,
  onClose
}) => {
  const [isComposing, setIsComposing] = useState(false);

  // 15分刻みの時間オプションを生成
  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      timeOptions.push(`${hh}:${mm}`);
    }
  }

  // 現在の start/end を "HH:MM" 形式で表現
  const getHHMM = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // 開始時間を選択したとき
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [hh, mm] = e.target.value.split(':').map(Number);
    const newStart = new Date(eventData.start);
    newStart.setHours(hh, mm, 0, 0);
    // 終了が開始より前なら１時間後に自動調整
    let newEnd = new Date(eventData.end);
    if (newEnd.getTime() <= newStart.getTime()) {
      newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
    }
    setEventData({ ...eventData, start: newStart, end: newEnd });
  };

  // 終了時間を選択したとき
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [hh, mm] = e.target.value.split(':').map(Number);
    const newEnd = new Date(eventData.end);
    newEnd.setHours(hh, mm, 0, 0);
    // 終了が開始より前なら開始を1時間前に自動調整
    let newStart = new Date(eventData.start);
    if (newEnd.getTime() <= newStart.getTime()) {
      newStart = new Date(newEnd.getTime() - 60 * 60 * 1000);
    }
    setEventData({ ...eventData, start: newStart, end: newEnd });
  };

  const handleKeyDownWrapper = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing) {
      if (e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      onClick();
    }
  };

  return (
    <ModalWrapper show={show} onClose={onClose}>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50" 
        onKeyDown={handleKeyDownWrapper} 
        tabIndex={0}
        onClick={() => setEventData({ ...eventData, show: false })}
      >
        <div 
          className="bg-white rounded-lg w-full max-w-md mx-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium">
                {eventData.event ? '予定を編集' : '予定を追加'}
              </h3>
              <button 
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={() => setEventData({ ...eventData, show: false })}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {/* タイトル入力 */}
            <input
              type="text"
              placeholder="タイトルを入力"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              autoFocus
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
            />
            {/* 日付表示 */}
            <div className="text-sm text-gray-600 mb-4">
              {formatEventDate(eventData.start)}
            </div>
            {/* 時間選択 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={getHHMM(eventData.start)}
                  onChange={handleStartTimeChange}
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">終了時間</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={getHHMM(eventData.end)}
                  onChange={handleEndTimeChange}
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* 色選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                色を選択
              </label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded-full border-2 ${
                      color === newEventColor ? 'border-gray-400' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewEventColor(color)}
                  />
                ))}
              </div>
            </div>
            {/* メモ */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メモ
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={3}
                value={newEventNotes}
                onChange={(e) => setNewEventNotes(e.target.value)}
              />
            </div>
            {/* ボタン */}
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                onClick={onClose}
              >
                キャンセル
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600:opacity-50"
                onClick={onClick}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
};
