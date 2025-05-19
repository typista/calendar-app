import React, { useState, FormEvent } from 'react'
import { ModalWrapper } from './ModalWrapper'
import { useShareEvents } from '../../utils/shareEvents';

type NameModalProps = {
  show: boolean
  userName: string
  events: StoredEvent[]
  setUserName: (name: string) => void
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSubmit: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onClose: Dispatch<SetStateAction<boolean>>
}

export const NameModal: React.FC<NameModalProps> = ({
  show, userName, events, scheduleId, scheduleTitle, approvers, setUserName, handleKeyDown, onSubmit, onClose
}) => {
  const shareEvents = useShareEvents(
    events,
    userName,
    scheduleId,
    scheduleTitle,
    approvers
  );
  const [showNameModal, setShowNameModal] = useState(false);
  const handleNameSubmit = () => {
    if (!userName.trim()) return;
    setShowNameModal(false);
    shareEvents();
  };
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
          onKeyDown={handleKeyDown}
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
