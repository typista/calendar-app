import React, { useState, MouseEvent, TouchEvent } from 'react';
import { WEEK_DAYS, HOURS, COLORS } from '../../constants/calendar';
import { formatEventTime, formatEventDate, getDayNumbers } from '../../utils/dateUtils';
import { CalendarGridProps } from './CalendarGrid.types';
import { Check, X as XIcon, Trash2 } from 'lucide-react';
import { ModalWrapper } from '../Modal/ModalWrapper';
import { buildScheduleUrl } from '../../utils/buildScheduleUrl';

export const CalendarGrid: React.FC<
  CalendarGridProps & { userName: string }
> = ({
  scheduleId,
  scheduleTitle,
  userName,
  gridRef,
  timeRange,
  currentTime,
  events,
  setEvents,
  effectiveCreator,
  currentDate,
  setEventData,
  setNewEventTitle,
  setNewEventColor,
  setNewEventNotes,
  setShowBottomSheet
}) => {
  // ドラッグ選択関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ dayIndex: number; hourIndex: number; minutes: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ dayIndex: number; hourIndex: number; minutes: number } | null>(null);

  // 確定済みイベントドラッグ移動用
  const [draggingEvent, setDraggingEvent] = useState<{ event: any, offsetY: number } | null>(null);

  // 削除モーダル用ステート
  const [toDeleteEvent, setToDeleteEvent] = useState<any | null>(null);

  const isTimeInRange = (hour: number) => {
    return hour >= timeRange.start && hour < timeRange.end;
  };

  const isPastTime = (date: Date) => {
    const now = new Date();
    return date < now;
  };

  const getEventPosition = (e: MouseEvent | Touch) => {
    if (!gridRef.current) return null;

    const rect = gridRef.current.getBoundingClientRect();
    const scrollOffset = gridRef.current.scrollTop;
    const timeColumnWidth = rect.width / 8;
    const x = (e as any).clientX - rect.left - timeColumnWidth;
    const y = (e as any).clientY - rect.top + scrollOffset;

    const dayIndex = Math.floor((x / (rect.width - timeColumnWidth)) * 7);
    const hourIndex = Math.floor(y / 48);
    const minutes = Math.floor((y % 48) / 24) * 30;

    if (dayIndex < 0 || dayIndex >= 7 || hourIndex < 0 || hourIndex >= 24 || !isTimeInRange(hourIndex)) return null;

    return { dayIndex, hourIndex, minutes };
  };

  const calculateOverlappingGroups = (allEvents: any[]): Map<string, any> => {
    const positions = new Map<string, any>();
    const groups: any[][] = [];

    for (const event of allEvents) {
      let added = false;
      for (const group of groups) {
        if (group.some(groupEvent => {
          return (event.start < groupEvent.end && event.end > groupEvent.start);
        })) {
          group.push(event);
          added = true;
          break;
        }
      }
      if (!added) {
        groups.push([event]);
      }
    }

    groups.forEach(group => {
      const count = group.length;
      group.forEach((event, index) => {
        positions.set(event.id, {
          left: index * (1 / count),
          width: 1 / count
        });
      });
    });

    return positions;
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

  const handleMouseDown = (e: MouseEvent) => {
    if (draggingEvent || !effectiveCreator) return;

    const position = getEventPosition(e);
    if (!position) return;

    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + position.dayIndex);
    startDate.setHours(position.hourIndex, position.minutes, 0, 0);

    if (startDate < new Date()) {
      return;
    }

    setIsDragging(true);
    setDragStart(position);
    setDragEnd(position);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!effectiveCreator) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const position = getEventPosition(touch as any);
      if (position) {
        setIsDragging(true);
        setDragStart(position);
        setDragEnd(position);
      }
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const position = getEventPosition(touch as any);
    if (position) {
      setDragEnd(position);
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }
    finishSelection();
  };

  const handleEventMouseDown = (e: MouseEvent, event: any) => {
    if (!effectiveCreator) return;

    e.stopPropagation();
    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;

    setDraggingEvent({ event, offsetY });
  };

  const handleEventTouchStart = (e: TouchEvent, event: any) => {
    if (!effectiveCreator) return;

    e.stopPropagation();
    const touch = e.touches[0];
    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const offsetY = touch.clientY - rect.top;

    setDraggingEvent({ event, offsetY });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggingEvent) {
      const position = getEventPosition(e);
      if (!position) return;

      const duration = draggingEvent.event.end.getTime() - draggingEvent.event.start.getTime();

      const weekStart = new Date(currentDate);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const newStart = new Date(weekStart);
      newStart.setDate(weekStart.getDate() + position.dayIndex);
      newStart.setHours(position.hourIndex, position.minutes, 0, 0);

      const newEnd = new Date(newStart.getTime() + duration);

      setEvents(events.map(ev =>
        ev.id === draggingEvent.event.id
          ? { ...ev, start: newStart, end: newEnd }
          : ev
      ));
      return;
    }

    if (!isDragging) return;

    const position = getEventPosition(e);
    if (!position) return;

    setDragEnd(position);
  };

  const handleMouseUp = () => {
    // 既存イベント移動終了
    if (draggingEvent) {
      setDraggingEvent(null);
      return;
    }

    // ドラッグ選択中でなければリセットして終了
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    finishSelection();
  };

  // ドラッグ or クリック選択の共通ロジック
  const finishSelection = () => {
    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + dragStart!.dayIndex);
    startDate.setHours(dragStart!.hourIndex, dragStart!.minutes, 0, 0);

    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + dragEnd!.dayIndex);
    endDate.setHours(dragEnd!.hourIndex, dragEnd!.minutes, 0, 0);

    const rawStart = new Date(Math.min(startDate.getTime(), endDate.getTime()));
    const rawEnd = new Date(Math.max(startDate.getTime(), endDate.getTime()));

    let finalStart = rawStart;
    let finalEnd = rawEnd;

    // クリックだけの場合 → 時間部分:00から1時間分
    if (rawStart.getTime() === rawEnd.getTime()) {
      const h = rawStart.getHours();
      finalStart = new Date(rawStart);
      finalStart.setHours(h, 0, 0, 0);
      finalEnd = new Date(finalStart);
      finalEnd.setHours(h + 1, 0, 0, 0);
    }

    if (finalStart.getTime() !== finalEnd.getTime()) {
      const newEventData = { show: true, start: finalStart, end: finalEnd };
      setEventData(newEventData);
      setNewEventTitle('');
      setNewEventColor('#4285f4');
      setNewEventNotes('');
      // const all = [...events, {
      //   ...newEventData,
      //   id: 'temp', color: '#4285f4', title: '', notes: ''
      // }];
      // const base = window.location.origin + window.location.pathname;
      // const url = buildScheduleUrl(base, scheduleId, all, scheduleTitle);
      // window.history.replaceState(null, '', url);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const renderEvents = () => {
    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    // 日ごとにイベントを収集
    const eventsByDay = new Map<number, any[]>();
    events.forEach(event => {
      const evStart = new Date(event.start);
      evStart.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
        (evStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (!eventsByDay.has(daysDiff)) {
        eventsByDay.set(daysDiff, []);
      }
      eventsByDay.get(daysDiff)!.push(event);
    });

    const positions = calculateOverlappingGroups(events);

    return events.map(event => {
      const evStart = new Date(event.start);
      evStart.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
        (evStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      const startHour = event.start.getHours();
      const startMinutes = event.start.getMinutes();
      const endHour = event.end.getHours();
      const endMinutes = event.end.getMinutes();

      const durationInMinutes =
        endHour * 60 + endMinutes - (startHour * 60 + startMinutes);
      const height = (durationInMinutes / 60) * 48;

      const pos = positions.get(event.id);

      // イベントブロック

      return (
        <div
          key={event.id}
          className={`absolute rounded-lg px-2 py-1 text-white text-sm ${
            effectiveCreator ? 'cursor-move' : ''
          } flex flex-col ${
            event.approvals?.[userName] === false ? 'opacity-30' : ''
          }`}
          style={{
            left: pos
              ? `calc(${(daysDiff + 1) * (100 / 8)}% + ${
                  pos.left * (100 / 8 - 0.125)
                }%)`
              : `calc(${(daysDiff + 1) * (100 / 8)}%)`,
            top: `${startHour * 48 + (startMinutes / 60) * 48}px`,
            width: pos
              ? `calc(${(pos.width * 100) / 8}% - 0.125rem)`
              : `calc(${100 / 8 - 0.125}%)`,
            height: `${height - 4}px`,
            backgroundColor: event.color,
          }}
          onMouseDown={e => handleEventMouseDown(e, event)}
          onTouchStart={e => handleEventTouchStart(e, event)}
          onDoubleClick={e => handleEventDoubleClick(e, event)}
        >
          <div className="flex justify-between">
            <div className="text-xs font-medium">
              {formatEventTime(event.start)} ～ {formatEventTime(event.end)}
              {event.approvals?.[userName] === true && (
                <Check className="inline-block ml-1 w-4 h-4" />
              )}
              {event.approvals?.[userName] === false && (
                <XIcon className="inline-block ml-1 w-4 h-4" />
              )}
            </div>
            {effectiveCreator && (
              <button
                className="ml-1"
                onClick={e => {
                  e.stopPropagation();
                  setToDeleteEvent(event);
                }}
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
          <div className="font-medium">{event.title}</div>
          {event.notes && (
            <div className="text-xs opacity-90 mt-1 line-clamp-2">
              {event.notes}
            </div>
          )}
        </div>
      );
    });
  };

  const renderDragSelection = () => {
    if (!isDragging || !dragStart || !dragEnd) return null;

    const startDay = Math.min(dragStart.dayIndex, dragEnd.dayIndex);
    const endDay = Math.max(dragStart.dayIndex, dragEnd.dayIndex);

    const startTimeInMinutes = dragStart.hourIndex * 60 + dragStart.minutes;
    const endTimeInMinutes = dragEnd.hourIndex * 60 + dragEnd.minutes;
    const startTime = Math.min(startTimeInMinutes, endTimeInMinutes);
    const endTime = Math.max(startTimeInMinutes, endTimeInMinutes);

    const startTop = (startTime / 60) * 48;
    const height = ((endTime - startTime) / 60) * 48;

    const columnWidth = 100 / 8;
    const baseLeft = (startDay + 1) * columnWidth;

    return (
      <div
        className="absolute bg-blue-200 opacity-50 rounded-lg"
        style={{
          left: `calc(${baseLeft}%)`,
          top: `${startTop}px`,
          width: `calc(${(endDay - startDay + 1) * columnWidth - 0.125}%)`,
          height: `${height}px`,
        }}
      />
    );
  };

  return (
    <div className="flex flex-col h-screen">
      {/* ヘッダー（曜日・日付表示） */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="sticky top-0 bg-white z-20 grid grid-cols-8 border-b">
          <div className="border-r" />
          {WEEK_DAYS.map((day, index) => {
            const dayInfo = getDayNumbers(currentDate)[index];
            return (
              <div key={day} className="border-r">
                <div className="h-14 px-1 sm:px-2 flex flex-col items-center justify-center">
                  <div className="text-xs sm:text-sm text-gray-500">{day}</div>
                  <div
                    className={`text-base sm:text-xl ${
                      dayInfo.isToday
                        ? 'bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center'
                        : ''
                    }`}
                  >
                    {dayInfo.number}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* グリッド本体 */}
        <div
          ref={gridRef}
          className="relative flex-1 grid grid-cols-8 overflow-y-auto overflow-x-hidden min-h-0"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 時刻列 */}
          <div className="border-r sticky left-0 bg-white z-10">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-12 text-right pr-2 text-sm text-gray-500"
              >
                {hour}:00
              </div>
            ))}
          </div>

          {/* 日付セル */}
          {WEEK_DAYS.map((day, index) => {
            const weekStart = new Date(currentDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const currentDay = new Date(weekStart);
            currentDay.setDate(weekStart.getDate() + index);

            return (
              <div key={day} className="border-r">
                <div>
                  {HOURS.map((hour) => {
                    const timeSlotDate = new Date(currentDay);
                    timeSlotDate.setHours(hour, 0, 0, 0);
                    const isPastSlot = isPastTime(timeSlotDate);

                    return (
                      <div
                        key={hour}
                        className={`h-12 border-b border-gray-100 ${
                          !isTimeInRange(hour)
                            ? 'bg-gray-50 hidden sm:block'
                            : ''
                        } ${isPastSlot ? 'bg-gray-100' : ''}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 現在時刻ライン */}
          {(() => {
            const now = currentTime;
            const weekStart = new Date(currentDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);

            const daysDiff = Math.floor(
              (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysDiff >= 0 && daysDiff < 7) {
              const hour = now.getHours();
              const minutes = now.getMinutes();
              const top = hour * 48 + (minutes / 60) * 48;

              return (
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: `${top}px` }}
                >
                  <div className="relative">
                    <div className="absolute left-[12.5%] right-0 border-t-2 border-red-500" />
                    <div className="absolute left-[12.5%] w-2 h-2 rounded-full bg-red-500 -translate-x-1 -translate-y-1" />
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* イベントブロック */}
          {renderEvents()}

          {/* ドラッグ中の選択矩形 */}
          {renderDragSelection()}
        </div>
      </div>

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
