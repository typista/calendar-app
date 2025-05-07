import React, { FormEvent } from 'react'
import { ModalWrapper } from './ModalWrapper'
import { ChevronLeft, ChevronRight, Menu, Settings, X, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, PenSquare, Plus, Minus } from 'lucide-react';

type TitleModalProps = {
  show: boolean
  scheduleTitle: string
  setScheduleTitle: (name: string) => void
  setDisplayTitle: (name: string) => void
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSubmit: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onClose: Dispatch<SetStateAction<boolean>>
}

export const TitleModal: React.FC<TitleModalProps> = ({
  show, scheduleTitle, setScheduleTitle, setDisplayTitle, handleKeyDown, onSubmit, onClose
}) => (
  <ModalWrapper show={show} onClose={onClose}>
    <form
      className="p-6"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        onSubmit()
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
            setDisplayTitle(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <button type="button" className="px-4 py-2" onClick={onClose}>
          キャンセル
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded" disabled={!scheduleTitle.trim()}>
          保存
        </button>
      </div>
    </form>
  </ModalWrapper>
)
