import React, { FormEvent, Dispatch, SetStateAction } from 'react'
import { getJsonItem, setJsonItem, removeJsonItem } from '../../utils/storage';
import { ModalWrapper } from './ModalWrapper'
import { ScheduleHistory } from '../../types/calendar';
import { ChevronLeft, ChevronRight, Menu, Settings, X, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, PenSquare, Plus, Minus, ExternalLink } from 'lucide-react';

type ScheduleHistoryModalProps = {
    show: boolean
    scheduleIds: []
    handleOpenExternalTab: () => void
    onClick: Dispatch<SetStateAction<boolean>>
    onClose: Dispatch<SetStateAction<boolean>>
  }
  
  export const ScheduleHistoryModal: React.FC<ScheduleHistoryModalProps> = ({
    show, scheduleIds, handleOpenExternalTab, onClick, onClose
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
                {/*
                まず、scheduleIds を sharedAt（文字列→Date）を基準に降順ソートしてから表示します。
                mutate を避けるために slice() を用いてコピーを作成しています。
                */}
                {scheduleIds
                .slice() // 元配列を破壊せずにコピー
                .sort((idA, idB) => {
                    // sharedAt を取り出し、Date 化したうえで差分を返す
                    const storedA = getJsonItem(`calendar-events-${idA}`);
                    const storedB = getJsonItem(`calendar-events-${idB}`);
                    // sharedAt が存在しない・不正な場合は 0 とみなす
                    const dateA = storedA
                    ? new Date((storedA as ScheduleHistory).sharedAt).getTime()
                    : 0;
                    const dateB = storedB
                    ? new Date((storedB as ScheduleHistory).sharedAt).getTime()
                    : 0;
                    // 降順：dateB - dateA
                    return dateB - dateA;
                })
                .map(id => {
                    const storedData = getJsonItem(`calendar-events-${id}`);
                    if (!storedData) return null;

                    try {
                    const { sharedAt } = storedData as ScheduleHistory;
                    const title =
                        getJsonItem(`calendar-schedule-title-${id}`) ||
                        '無題の候補日程';
                    const date = new Date(sharedAt);

                    // 無効な日付はスキップ
                    if (isNaN(date.getTime())) return null;

                    return (
                        <div
                        key={id}
                        className="py-4 flex items-center justify-between"
                        >
                        <div>
                            <div className="font-medium">{title}</div>
                            <div className="text-sm text-gray-600">
                            {date.toLocaleString('ja-JP')}
                            </div>
                        </div>
                        <button
                            className="p-2 hover:bg-gray-100 rounded-full"
                            onClick={() => handleOpenExternalTab(id)}
                        >
                            <ExternalLink className="w-5 h-5 text-gray-600" />
                        </button>
                        </div>
                    );
                    } catch {
                    return null;
                    }
                })}
              </div>
          </div>
          </div>
      </div>
    </ModalWrapper>
  )