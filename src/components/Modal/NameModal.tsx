import React, { FormEvent } from 'react'
import { ModalWrapper } from './ModalWrapper'

type NameModalProps = {
  show: boolean
  userName: string
  setUserName: (name: string) => void
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSubmit: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onClose: Dispatch<SetStateAction<boolean>>
}

export const NameModal: React.FC<NameModalProps> = ({
  show, userName, setUserName, handleKeyDown, onSubmit, onClose
}) => (
  <ModalWrapper show={show} onClose={onClose}>
    <form
      className="p-6"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        onSubmit()
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
