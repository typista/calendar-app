import React, { FormEvent, Dispatch, SetStateAction } from 'react'
import { ModalWrapper } from './ModalWrapper'
import { WEEK_DAYS, HOURS, COLORS } from '../../constants/calendar';
import { EventData } from '../../types/Calendar';
import { formatDate, formatEventTime, formatEventDate, getDayNumbers } from '../../utils/dateUtils';
import { ChevronLeft, ChevronRight, Menu, Settings, X, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, PenSquare, Plus, Minus } from 'lucide-react';

type EventModalProps = {
    show: boolean
    newEventTitle: string
    newEventColor: color
    newEventNotes: string
    eventData: EventData
    setEventData: (boolean, date, date)=>EventData
    setNewEventTitle: (string)=>void
    setNewEventColor: (color)=>void
    setNewEventNotes: (string)=>void
    onClick: Dispatch<SetStateAction<boolean>>
    onClose: Dispatch<SetStateAction<boolean>>
    onKeyDown: Dispatch<SetStateAction<boolean>>
  }
  
  export const EventModal: React.FC<EventModalProps> = ({
    show, newEventTitle, newEventColor, newEventNotes, eventData, setEventData, setNewEventTitle, setNewEventColor, setNewEventNotes, onClick, onClose, onKeyDown
  }) => (
    <ModalWrapper show={show} onClose={onClose}>
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50"
          onClick={() => setEventData({ ...eventModal, show: false })}
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
              <input
                type="text"
                placeholder="タイトルを入力"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                onKeyDown={onKeyDown}
                autoFocus
              />
              <div className="text-sm text-gray-600 mb-4">
                {formatEventDate(eventData.start)}
                <br />
                {formatEventTime(eventData.start)} 〜 {formatEventTime(eventData.end)}
              </div>
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
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メモ
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  rows={3}
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  onKeyDown={onKeyDown}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                  onClick={onClose}
                >
                  キャンセル
                </button>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  onClick={onClick}
                  disabled={!newEventTitle.trim()}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
    </ModalWrapper>
  )