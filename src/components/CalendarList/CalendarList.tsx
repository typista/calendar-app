import React from 'react';
import { ChevronLeft, ChevronRight, Menu, Settings, X, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, PenSquare, Plus, Minus } from 'lucide-react';

export const CalendarList: React.FC<CalendarListProps> = ({ events, onClick, onRender, showBottomSheet, copyButtonText }) => {
  return (
    <div>
        <div className="hidden md:block w-80 border-l">
            <div className="h-16 px-4 border-b flex items-center justify-between">
            <h3 className="font-medium">予定一覧</h3>
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{events.length}件</span>
                <button 
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={onClick}
                title={copyButtonText}
                >
                <Copy className="w-5 h-5 text-gray-600" />
                </button>
            </div>
            </div>
            <div className="h-[calc(100vh-64px)] overflow-y-auto">
            <div className="p-4 space-y-4">
                {events.length === 0 ? (
                <div className="text-center text-gray-500">
                    予定はありません
                </div>
                ) : (
                events
                    .sort((a, b) => a.start.getTime() - b.start.getTime())
                    .map(event => onRender(event))
                )}
            </div>
            </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 md:hidden">
            <div 
            className="bg-white border-t shadow-lg px-4 py-3 flex items-center justify-between"
            onClick={() => onClick(true)}
            >
            <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span className="font-medium">予定一覧</span>
            </div>
            <div className="text-sm text-gray-600">
                {events.length}件
            </div>
            </div>
        </div>

        {showBottomSheet && (
            <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
            onClick={() => onClick(false)}
            >
            <div 
                className="absolute inset-x-0 bottom-0 bg-white rounded-t-xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-medium">予定一覧</h3>
                <button 
                    className="p-2 hover:bg-gray-100 rounded-full"
                    onClick={() => onClick(false)}
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
                {events.length === 0 ? (
                    <div className="text-center text-gray-500">
                    予定はありません
                    </div>
                ) : (
                    events
                    .sort((a, b) => a.start.getTime() - b.start.getTime())
                    .map(event => onRender(event))
                )}
                </div>
            </div>
            </div>
        )}
    </div>
  )
};