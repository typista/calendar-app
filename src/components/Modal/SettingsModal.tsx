import React, { FormEvent, Dispatch, SetStateAction } from 'react'
import { ModalWrapper } from './ModalWrapper'
import { TimeRange } from '../../types/Calendar';
import { ChevronLeft, ChevronRight, Menu, Settings, X, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, PenSquare, Plus, Minus } from 'lucide-react';

type SettingsModalProps = {
    show: boolean
    timeRange: TimeRange
    setTimeRange: (TimeRange)=>void
    onClose: Dispatch<SetStateAction<boolean>>
  }
  
  export const SettingsModal: React.FC<SettingsModalProps> = ({
    show, timeRange, setTimeRange, onClose
  }) => (
    <ModalWrapper show={show} onClose={onClose}>
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div 
            className="bg-white rounded-lg w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
            >
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Clock className="w-6 h-6 text-gray-600" />
                    <h3 className="text-xl font-medium">表示時間の設定</h3>
                </div>
                <button 
                    className="p-2 hover:bg-gray-100 rounded-full"
                    onClick={onClose}
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>
                </div>
                <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    開始時刻
                    </label>
                    <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={timeRange.start}
                    onChange={(e) => setTimeRange(prev => ({ ...prev, start: parseInt(e.target.value) }))}
                    >
                    {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i} disabled={i >= timeRange.end}>
                        {i}:00
                        </option>
                    ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    終了時刻
                    </label>
                    <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={timeRange.end}
                    onChange={(e) => setTimeRange(prev => ({ ...prev, end: parseInt(e.target.value) }))}
                    >
                    {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i} disabled={i <= timeRange.start}>
                        {i}:00
                        </option>
                    ))}
                    </select>
                </div>
                </div>
                <div className="mt-6 flex justify-end">
                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={onClose}
                >
                    閉じる
                </button>
                </div>
            </div>
            </div>
        </div>
    </ModalWrapper>
  )