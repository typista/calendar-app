import React, { ReactNode } from 'react'
import { X } from 'lucide-react'

type ModalWrapperProps = {
  show: boolean
  onClose: () => void
  children: ReactNode
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({ show, onClose, children }) => {
  if (!show) return null
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="p-2 hover:bg-gray-100 rounded-full absolute top-2 right-2"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
        {children}
      </div>
    </div>
  )
}
