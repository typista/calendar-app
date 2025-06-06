import React, { useState, MouseEvent } from 'react';
import { formatEventDate, formatEventTime } from '../../utils/dateUtils';
import { getJsonItem, setJsonItem } from '../../utils/storage';
import { CalendarListProps } from './CalendarList.types';
import {
  Copy,
  Check,
  X as XIcon,
  UserCircle2,
  Trash2,
  Calendar,
  X
} from 'lucide-react';
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
  // 削除対象イベント
  const [toDeleteEvent, setToDeleteEvent] = useState<any | null>(null);

  // ─────────── URL から直接 responders クエリを取得して配列に変換 ───────────
  // (effectiveCreator に関係なく常に読み込む)
  const getRespondersList = () => {
    if (!scheduleId) return [];
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('responders');
    if (raw) {
      return raw
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
    }
    return [];
  };
  const respondersList = getRespondersList();

  // ─────────── OK/NG ボタンを押したときの処理 ───────────
  const handleApproval = (eventId: string, approved: boolean) => {
    setEvents((prevEvents) => {
      const updatedEvents = prevEvents.map((event) => {
        if (event.id === eventId) {
          // この userName で OK/NG をマーク
          const newApprovals = {
            ...(event.approvals || {}),
            [userName]: approved
          };
          // approvedBy 配列も更新
          let newApprovedBy: string[] = event.approvedBy || [];
          if (approved) {
            if (!newApprovedBy.includes(userName)) {
              newApprovedBy = [...newApprovedBy, userName];
            }
          } else {
            newApprovedBy = newApprovedBy.filter((name) => name !== userName);
          }
          return { ...event, approvals: newApprovals, approvedBy: newApprovedBy };
        }
        return event;
      });

      // localStorage にもこのユーザーの OK/NG 状況を保存
      if (scheduleId && userName) {
        const approvalsMap: { [key: string]: boolean } = {};
        updatedEvents.forEach((ev) => {
          if (ev.approvals && ev.approvals[userName] !== undefined) {
            approvalsMap[ev.id] = ev.approvals[userName]!;
          }
        });
        setJsonItem(`calendar-approvals-${scheduleId}-${userName}`, approvalsMap);
      }

      return updatedEvents;
    });
  };

  // ─────────── イベントカードをダブルクリックで編集モーダルを開く ───────────
  const handleEventDoubleClick = (e: MouseEvent, event: any) => {
    if (!effectiveCreator) return; // 編集権限はオーナーのまま
    e.stopPropagation();
    setEventData({ show: true, start: event.start, end: event.end, event });
    setNewEventTitle(event.title);
    setNewEventColor(event.color);
    setNewEventNotes(event.notes || '');
    setShowBottomSheet(false);
  };

  // ─────────── 各イベントカードを描画 ───────────
  const renderEventCard = (event: any) => {
    const allowEdit = isCreator || event.createdBy === userName;
    const showApprovalButtons = !effectiveCreator && event.createdBy !== userName;
    const myApproval = event.approvals?.[userName];

    return (
      <div
        key={event.id}
        className="relative p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
        style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
        onClick={allowEdit ? (e) => handleEventDoubleClick(e as any, event) : undefined}
      >
        {/* 日付 */}
        <div className="text-sm text-gray-600">{formatEventDate(event.start)}</div>
        {/* 時間帯 */}
        <div className="text-sm font-medium text-gray-600">
          {formatEventTime(event.start)} ～ {formatEventTime(event.end)}
        </div>
        {/* タイトル */}
        <div className="font-medium text-gray-800">{event.title}</div>
        {/* メモ */}
        {event.notes && (
          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{event.notes}</div>
        )}

        {/* OK/NG ボタン（回答者モード時のみ表示） */}
        {showApprovalButtons && (
          <div className="flex items-center gap-2 mt-2">
            <button
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
                myApproval === true ? 'bg-green-100 text-green-700' : 'hover:bg-green-50 text-gray-600'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleApproval(event.id, true);
              }}
            >
              <Check className="w-4 h-4" />OK
            </button>
            <button
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
                myApproval === false ? 'bg-red-100 text-red-700' : 'hover:bg-red-50 text-gray-600'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleApproval(event.id, false);
              }}
            >
              <XIcon className="w-4 h-4" />NG
            </button>
          </div>
        )}

        {/* ─────────── URL パラメータに含まれる回答者名を表示 ─────────── */}
        {respondersList.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            回答者: {respondersList.join(', ')}
          </div>
        )}

        {/* ─────────── オーナー向け：ゴミ箱アイコン ─────────── */}
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

  // ─────────── JSX 全体 ───────────
  return (
    <div>
      {/* ユーザーアイコン＋ユーザー名 */}
      <div className="h-16 px-4 border-b flex items-center justify-start">
        <UserCircle2 className="w-8 h-8 text-gray-500 p-1 mr-1" />
        <span className="text-sm font-medium text-gray-700">{userName}</span>
      </div>

      {/* PC（md 以上）用サイドバー */}
      <div className="hidden md:block w-60 border-l">
        <div className="h-16 px-4 border-b flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">予定一覧</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{events.length}件</span>
              <button
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                title={copyButtonText}
              >
                <Copy className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          {/* URL クエリに含まれる回答者を常に表示 */}
          {respondersList.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              回答者: {respondersList.join(', ')}
            </div>
          )}
        </div>

        <div className="h-[calc(100vh-64px)] overflow-y-auto">
          <div className="p-4 space-y-4">
            {events.length === 0 ? (
              <div className="text-center text-gray-500">予定はありません</div>
            ) : (
              events
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map((event) => renderEventCard(event))
            )}
          </div>
        </div>
      </div>

      {/* モバイル用 BottomSheet トリガー */}
      <div className="fixed inset-x-0 bottom-0 md:hidden">
        <div
          className="bg-white border-t shadow-lg px-4 py-3 flex items-center justify-between"
          onClick={() => onClick(true)}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="font-medium">予定一覧</span>
          </div>
          <div className="text-sm text-gray-600">{events.length}件</div>
        </div>
      </div>

      {/* モバイル用 BottomSheet の中身 */}
      {showBottomSheet && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
          onClick={() => onClick(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-xl"
            onClick={(e) => e.stopPropagation()}
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
                <div className="text-center text-gray-500">予定はありません</div>
              ) : (
                events
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .map((event) => renderEventCard(event))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {toDeleteEvent && (
        <ModalWrapper show={true} onClose={() => setToDeleteEvent(null)}>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">この予定を削除しますか？</h3>
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
                  setEvents(events.filter((ev) => ev.id !== toDeleteEvent.id));
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
