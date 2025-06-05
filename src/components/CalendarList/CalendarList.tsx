import React, { useState, MouseEvent } from 'react';
import { formatDate, formatEventTime, formatEventDate, getDayNumbers } from '../../utils/dateUtils';
import { getJsonItem, setJsonItem } from '../../utils/storage';
import { CalendarListProps } from './CalendarList.types';
import { ChevronLeft, ChevronRight, Menu, Settings, X, Copy, List, Calendar, Clock, Check, X as XIcon, UserCircle2, UserCircle2 as User, Trash2 } from 'lucide-react';
import { ModalWrapper } from '../Modal/ModalWrapper';

export const CalendarList: React.FC<CalendarListProps> = ({
  events,
  userName,
  isCreator,
  effectiveCreator,
  scheduleId,
  onClick,
  setEvents,
  showBottomSheet,
  copyButtonText,
  setEventData,
  setNewEventTitle,
  setNewEventColor,
  setNewEventNotes,
  setShowBottomSheet
}) => {
  const [toDeleteEvent, setToDeleteEvent] = useState<any | null>(null);

  const handleApproval = (eventId: string, approved: boolean) => {
    setEvents(prevEvents => {
      const updatedEvents = prevEvents.map(event => {
        if (event.id === eventId) {
          const approvals = { ...(event.approvals || {}), [userName]: approved };
          const approvedBy = approved 
            ? [...(event.approvedBy || []), userName].filter((v, i, a) => a.indexOf(v) === i)
            : (event.approvedBy || []).filter(name => name !== userName);
          return { ...event, approvals: {
            ...event.approvals,
            [userName]: approved
          }, approvedBy };
        }
        return event;
      });

      if (scheduleId && userName) {
        const approvals: { [key: string]: boolean } = {};
        updatedEvents.forEach(event => {
          if (event.approvals && event.approvals[userName] !== undefined) {
            approvals[event.id] = event.approvals[userName]!;
          }
        });
        setJsonItem(`calendar-approvals-${scheduleId}-${userName}`, approvals);
      }

      return updatedEvents;
    });
  };

  const handleEventDoubleClick = (e: MouseEvent, event: any) => {
    if (!effectiveCreator) return;

    e.stopPropagation();
    setEventData({ show: true, start: event.start, end: event.end, event });
    setNewEventTitle(event.title);
    setNewEventColor(event.color);
    setNewEventNotes(event.notes || '');
    setShowBottomSheet(false);
  };

  const renderEventCard = (event: any) => {
    // 当該ユーザーがこのイベントを作成した or マスター権限がある場合のみ編集モーダルを開ける
    const allowEdit = isCreator || event.createdBy === userName;
    const isEventCreator = event.createdBy === userName;
    const approval = event.approvals?.[userName];
    // 回答ボタンは回答者モード(= !effectiveCreator)かつ自分作成でないときだけ
    const showApprovalButtons = !effectiveCreator && event.createdBy !== userName;

    return (
      <div
        key={event.id}
        className="relative p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
        style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
        onClick={allowEdit ? (e) => handleEventDoubleClick(e as any, event) : undefined}
      >
        <div className="text-sm text-gray-600">
          {formatEventDate(event.start)}
        </div>
        <div className="text-sm font-medium text-gray-600">
          {formatEventTime(event.start)} 〜 {formatEventTime(event.end)}
        </div>
        <div className="font-medium text-gray-800">
          {event.title}
        </div>
        {event.notes && (
          <div className="text-sm text-gray-600 mt-1 line-clamp-2">
            {event.notes}
          </div>
        )}
        {showApprovalButtons && (
          <div className="flex items-center gap-2 mt-2">
            <button
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
                approval === true
                  ? 'bg-green-100 text-green-700'
                  : 'hover:bg-green-50 text-gray-600'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleApproval(event.id, true);
              }}
            >
              <Check className="w-4 h-4" />
              OK
            </button>
            <button
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
                approval === false
                  ? 'bg-red-100 text-red-700'
                  : 'hover:bg-red-50 text-gray-600'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleApproval(event.id, false);
              }}
            >
              <XIcon className="w-4 h-4" />
              NG
            </button>
          </div>
        )}
        {/* ゴミ箱アイコン */}
        {effectiveCreator && (
          <button
            className="absolute top-2 right-2"
            onClick={(e) => {
              e.stopPropagation();
              setToDeleteEvent(event);
            }}
          >
            <Trash2 className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="h-16 px-4 border-b flex items-center justify-start">
        <UserCircle2 className="w-8 h-8 text-gray-500 p-1 mr-1" />
        <span className="text-sm font-medium text-gray-700">{userName}</span>
      </div>
      <div className="hidden md:block w-60 border-l">
        <div className="h-16 px-4 border-b flex items-center justify-between">
          <h3 className="font-medium">予定一覧</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{events.length}件</span>
            <button 
              className="p-2 hover:bg-gray-100 rounded-full"
              onClick={(e) => { e.stopPropagation(); onClick(); }}
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
                .map(event => renderEventCard(event))
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
                  .map(event => renderEventCard(event))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {toDeleteEvent && (
        <ModalWrapper show={true} onClose={() => setToDeleteEvent(null)}>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">
              この予定を削除しますか？
            </h3>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                onClick={() => setToDeleteEvent(null)}
              >
                キャンセル
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded"
                onClick={() => {
                  setEvents(events.filter(ev => ev.id !== toDeleteEvent.id));
                  setToDeleteEvent(null);
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
};
