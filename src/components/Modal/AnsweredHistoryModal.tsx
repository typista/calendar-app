import React, { Dispatch, SetStateAction } from 'react'
import { getJsonItem } from '../../utils/storage'
import { ModalWrapper } from './ModalWrapper'
import { ScheduleHistory } from '../../types'
import { X, ExternalLink } from 'lucide-react'

type AnsweredHistoryModalProps = {
  show: boolean
  scheduleIds: string[]                    // ← 単一の scheduleId → 複数対応に変更
  handleOpenExternalTab: (id: string) => void
  onClick: Dispatch<SetStateAction<boolean>>
  onClose: Dispatch<SetStateAction<boolean>>
}

export const AnsweredHistoryModal: React.FC<AnsweredHistoryModalProps> = ({
  show,
  scheduleIds,
  handleOpenExternalTab,
  onClick,
  onClose
}) => {
  // 1) ローカルストレージに保存されている各スケジュールの sharedAt を読み、
  //    新しい順に並べ替えて配列 entries を作る
  console.log(scheduleIds);
  const entries: { id: string; sharedAt: string; title: string }[] = scheduleIds
    .map((id) => {
      const storedData = getJsonItem(`calendar-events-${id}`)
      if (!storedData) return null

      try {
        const { sharedAt } = storedData as ScheduleHistory
        const date = new Date(sharedAt)
        if (isNaN(date.getTime())) return null

        const title =
          getJsonItem(`calendar-schedule-title-${id}`) || '無題の候補日程'
        return { id, sharedAt, title }
      } catch {
        return null
      }
    })
    .filter(
      (item): item is { id: string; sharedAt: string; title: string } =>
        item !== null
    )
    // sharedAt を降順（新しい順）にソート
    .sort(
      (a, b) =>
        new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime()
    )

  return (
    <ModalWrapper show={show} onClose={onClose}>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50"
        onClick={onClick}
      >
        <div
          className="bg-white rounded-lg w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
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
            <div className="max-h-[60vh] overflow-y-auto divide-y">
              {entries.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  回答済みの候補日程はありません
                </div>
              ) : (
                entries.map(({ id, sharedAt, title }) => {
                  const date = new Date(sharedAt)
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
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalWrapper>
  )
}
