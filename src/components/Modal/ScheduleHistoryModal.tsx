import React, { FormEvent, Dispatch, SetStateAction } from 'react'
import { getJsonItem, setJsonItem, removeJsonItem } from '../../utils/storage';
import { ModalWrapper } from './ModalWrapper'
import { ScheduleHistory } from '../../types/calendar';
import { ChevronLeft, ChevronRight, Menu, Settings, X, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, PenSquare, Plus, Minus } from 'lucide-react';

type ScheduleHistoryModalProps = {
    show: boolean
    scheduleIds: []
    handleCopyHistoryUrl: () => void
    onClick: Dispatch<SetStateAction<boolean>>
    onClose: Dispatch<SetStateAction<boolean>>
  }
  
  export const ScheduleHistoryModal: React.FC<ScheduleHistoryModalProps> = ({
    show, scheduleIds, handleCopyHistoryUrl, onClick, onClose
  }) => (
    <ModalWrapper show={show} onClose={onClose}>
      <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50"
          onClick={onClick}
      >
          <div 
          className="bg-white rounded-lg w-full max-w-md mx-4"
          onClick={e => e.stopPropagation()}
          >
          <div className="p-6">
              <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium">作成済みの候補日程</h3>
              <button 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  onClick={onClose}
              >
                  <X className="w-5 h-5 text-gray-600" />
              </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto divide-y">
              {scheduleIds.map(id => {
                  const storedData = getJsonItem(`calendar-events-${id}`);
                  if (!storedData) return null;
  
                  try {
                  const { sharedAt } = storedData as ScheduleHistory;
                  const title = getJsonItem(`calendar-schedule-title-${id}`) || '無題の候補日程';
                  const date = new Date(sharedAt);
                  
                  // Skip invalid dates
                  if (isNaN(date.getTime())) return null;
  
                  return (
                      <div key={id} className="py-4 flex items-center justify-between">
                      <div>
                          <div className="font-medium">{title}</div>
                          <div className="text-sm text-gray-600">
                          {date.toLocaleString('ja-JP')}
                          </div>
                      </div>
                      <button
                          className="p-2 hover:bg-gray-100 rounded-full"
                          onClick={() => handleCopyHistoryUrl(id)}
                      >
                          <Copy className="w-5 h-5 text-gray-600" />
                      </button>
                      </div>
                  );
                  } catch (error) {
                  return null; // Skip any entries that fail to parse
                  }
              })}
              </div>
          </div>
          </div>
      </div>
    </ModalWrapper>
  )