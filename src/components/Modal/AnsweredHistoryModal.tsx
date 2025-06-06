import React, { FormEvent, Dispatch, SetStateAction } from 'react'
import { getJsonItem, setJsonItem, removeJsonItem } from '../../utils/storage';
import { ModalWrapper } from './ModalWrapper'
import { StoredEvent, ScheduleHistory } from '../../types';
import { ChevronLeft, ChevronRight, Menu, Settings, X, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, PenSquare, Plus, Minus, ExternalLink } from 'lucide-react';

type AnsweredHistoryModalProps = {
    show: boolean
    scheduleId: string
    handleOpenExternalTab: () => void
    onClick: Dispatch<SetStateAction<boolean>>
    onClose: Dispatch<SetStateAction<boolean>>
  }
  
  export const AnsweredHistoryModal: React.FC<AnsweredHistoryModalProps> = ({
    show, scheduleId, handleOpenExternalTab, onClick, onClose
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
            <h3 className="text-xl font-medium">回答済みの候補日程</h3>
            <button 
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={onClose}
            >
                <X className="w-5 h-5 text-gray-600" />
            </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
            {(() => {
                const storedData = getJsonItem(`calendar-events-${scheduleId}`);
                if (!storedData) return null;

                const { sharedAt } = storedData as ScheduleHistory;
                const title = getJsonItem(`calendar-schedule-title-${scheduleId}`) || '無題の候補日程';
                const date = new Date(sharedAt);

                return (
                <div className="py-4 flex items-center justify-between">
                    <div>
                    <div className="font-medium">{title}</div>
                    <div className="text-sm text-gray-600">
                        {date.toLocaleString('ja-JP')}
                    </div>
                    </div>
                    <button
                    className="p-2 hover:bg-gray-100 rounded-full"
                    onClick={() => handleOpenExternalTab(scheduleId)}
                    >
                    <ExternalLink className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                );
            })()}
            </div>
        </div>
        </div>
    </div>
    </ModalWrapper>
  )