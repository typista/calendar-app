import React, { Dispatch, SetStateAction } from 'react'
import { getJsonItem } from '../../utils/storage';
import { ModalWrapper } from './ModalWrapper'
import { ScheduleHistory } from '../../types/calendar';
import { X, ExternalLink } from 'lucide-react';

type ScheduleHistoryModalProps = {
    show: boolean
    scheduleIds: string[]
    handleOpenExternalTab: (id: string) => void
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
              {scheduleIds
                .slice()
                .sort((idA, idB) => {
                  const sdA = getJsonItem<ScheduleHistory>(`calendar-events-${idA}`);
                  const sdB = getJsonItem<ScheduleHistory>(`calendar-events-${idB}`);
                  const dateA = sdA?.sharedAt ? new Date(sdA.sharedAt).getTime() : 0;
                  const dateB = sdB?.sharedAt ? new Date(sdB.sharedAt).getTime() : 0;
                  return dateB - dateA;
                })
                .map(id => {
                  // Always display even if no events stored
                  const storedData = getJsonItem<ScheduleHistory>(`calendar-events-${id}`);
                  const sharedAt = storedData?.sharedAt;
                  const title = getJsonItem<string>(`calendar-schedule-title-${id}`) || '無題の候補日程';
                  const dateDisplay = sharedAt
                    ? new Date(sharedAt).toLocaleString('ja-JP')
                    : '日時不明';

                  return (
                    <div
                      key={id}
                      className="py-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{title}</div>
                        <div className="text-sm text-gray-600">{dateDisplay}</div>
                      </div>
                      <button
                        className="p-2 hover:bg-gray-100 rounded-full"
                        onClick={() => handleOpenExternalTab(id)}
                      >
                        <ExternalLink className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </ModalWrapper>
)
export default ScheduleHistoryModal;
