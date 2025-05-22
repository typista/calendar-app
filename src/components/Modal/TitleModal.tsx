import React, { FormEvent, Dispatch, SetStateAction } from 'react'
import { ModalWrapper } from './ModalWrapper'
import { PenSquare } from 'lucide-react'

type TitleModalProps = {
  show: boolean
  scheduleTitle: string
  setScheduleTitle: (name: string) => void
  setDisplayTitle: (name: string) => void
  onClose: Dispatch<SetStateAction<boolean>>
  onSubmit: () => void
}

export const TitleModal: React.FC<TitleModalProps> = ({
  show,
  scheduleTitle,
  setScheduleTitle,
  setDisplayTitle,
  onSubmit,
  onClose
}) => {
  const handleSubmit = () => {
    if (!scheduleTitle.trim()) return
    setDisplayTitle(scheduleTitle)
    onSubmit()
    onClose(false)
  }

  return (
    <ModalWrapper show={show} onClose={() => onClose(false)}>
      <form
        className="p-6"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <div className="flex items-center gap-2 mb-6">
          <PenSquare className="w-6 h-6 text-gray-600" />
          <h3 className="text-xl font-medium">
            スケジュール調整のタイトル
          </h3>
        </div>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded mb-4"
          value={scheduleTitle}
          onChange={(e) => {
            setScheduleTitle(e.target.value)
            setDisplayTitle(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
          }}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2" onClick={() => onClose(false)}>
            キャンセル
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded"
            disabled={!scheduleTitle.trim()}
          >
            保存
          </button>
        </div>
      </form>
    </ModalWrapper>
)
}
