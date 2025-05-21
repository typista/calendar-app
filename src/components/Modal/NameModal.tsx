import React, { FormEvent, KeyboardEvent } from 'react'
import { ModalWrapper } from './ModalWrapper'
import { useShareEvents } from '../../utils/shareEvents'
import { StoredEvent } from '../../types'

type NameModalProps = {
  show: boolean
  userName: string
  events: StoredEvent[]
  setUserName: (name: string) => void
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  onClose: () => void
  scheduleId: string
  scheduleTitle: string | null
  approvers: string[]
}

export const NameModal: React.FC<NameModalProps> = ({
  show,
  userName,
  events,
  setUserName,
  handleKeyDown,
  onClose,
  scheduleId,
  scheduleTitle,
  approvers
}) => {
  const shareEvents = useShareEvents(events, userName, scheduleId, scheduleTitle, approvers)
  const handleNameSubmit = () => {
    if (!userName.trim()) return
    shareEvents()
    onClose()
  }

  return (
    <ModalWrapper show={show} onClose={onClose}>
      <form
        className="p-6"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          handleNameSubmit()
        }}
      >
        <h3 className="text-xl font-medium mb-4">名前を入力してください</h3>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded mb-4"
          value={userName}
          onChange={e => setUserName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleNameSubmit()
            }
          }}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded" disabled={!userName.trim()}>
            OK
          </button>
        </div>
      </form>
    </ModalWrapper>
  )
}
