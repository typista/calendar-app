import React, { useState, useRef, MouseEvent, KeyboardEvent, useEffect, TouchEvent } from 'react';
import { WEEK_DAYS, HOURS, COLORS } from '../../constants/calendar';
import { formatDate, formatEventTime, formatEventDate, getDayNumbers } from '../../utils/dateUtils';
import { CalendarGridProps } from './CalendarGrid.types';
import { Calendar, ChevronLeft, ChevronRight, Copy, List, Settings, Plus, PenSquare } from 'lucide-react';

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  gridRef,
  timeRange,
  currentTime,
  events,
  effectiveCreator,
  currentDate,
  setEventData,
  setNewEventTitle,
  setNewEventColor,
  setNewEventNotes
}) => {
  // ドラッグ選択関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ dayIndex: number; hourIndex: number; minutes: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ dayIndex: number; hourIndex: number; minutes: number } | null>(null);

  // 確定済みイベントドラッグ移動用
  const [draggingEvent, setDraggingEvent] = useState<{ event: Event, offsetY: number } | null>(null);

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
    const x = e.clientX - rect.left - timeColumnWidth;
    const y = e.clientY - rect.top + scrollOffset;
    
    const dayIndex = Math.floor((x / (rect.width - timeColumnWidth)) * 7);
    const hourIndex = Math.floor(y / 48);
    const minutes = Math.floor((y % 48) / 24) * 30;
    
    if (dayIndex < 0 || dayIndex >= 7 || hourIndex < 0 || hourIndex >= 24 || !isTimeInRange(hourIndex)) return null;
    
    return { dayIndex, hourIndex, minutes };
  };

  const calculateOverlappingGroups = (events: Event[], dayEvents: Event[]): Map<string, EventPosition> => {
    const positions = new Map<string, EventPosition>();
    
    const groups: Event[][] = [];
    for (const event of dayEvents) {
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

  const handleMouseDown = (e: MouseEvent) => {
    if (draggingEvent || !effectiveCreator) return;
    
    const position = getEventPosition(e);
    console.log(position);
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
      const position = getEventPosition(touch);
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
    const position = getEventPosition(touch);
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
  
    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  
    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + dragStart.dayIndex);
    startDate.setHours(dragStart.hourIndex, dragStart.minutes, 0, 0);
  
    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + dragEnd.dayIndex);
    endDate.setHours(dragEnd.hourIndex, dragEnd.minutes, 0, 0);
  
    const start = new Date(Math.min(startDate.getTime(), endDate.getTime()));
    const end = new Date(Math.max(startDate.getTime(), endDate.getTime()));
  
    if (start.getTime() !== end.getTime()) {
      setEventData({ show: true, start, end });
      setNewEventTitle('');
      setNewEventColor('#4285f4');
      setNewEventNotes('');
    }
  
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };
  
  const handleEventMouseDown = (e: MouseEvent, event: Event) => {
    if (!effectiveCreator) return;
    
    e.stopPropagation();
    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    
    setDraggingEvent({ event, offsetY });
  };
  
  const handleEventTouchStart = (e: TouchEvent, event: Event) => {
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
  
      setEvents(events.map(e => 
        e.id === draggingEvent.event.id 
          ? { ...e, start: newStart, end: newEnd }
          : e
      ));
      return;
    }
  
    if (!isDragging) return;
  
    const position = getEventPosition(e);
    if (!position) return;
  
    setDragEnd(position);
  };
  
  const handleMouseUp = () => {
    if (draggingEvent) {
      setDraggingEvent(null);
      return;
    }
  
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }
  
    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  
    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + dragStart.dayIndex);
    startDate.setHours(dragStart.hourIndex, dragStart.minutes, 0, 0);
  
    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + dragEnd.dayIndex);
    endDate.setHours(dragEnd.hourIndex, dragEnd.minutes, 0, 0);
  
    const start = new Date(Math.min(startDate.getTime(), endDate.getTime()));
    const end = new Date(Math.max(startDate.getTime(), endDate.getTime()));
  
    if (start.getTime() !== end.getTime()) {
      setEventData({ show: true, start, end });
      setNewEventTitle('');
      setNewEventColor('#4285f4');
      setNewEventNotes('');
    }
  
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const renderEvents = () => {
    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const eventsByDay = new Map<number, Event[]>();
    events.forEach(event => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
        (eventStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (!eventsByDay.has(daysDiff)) {
        eventsByDay.set(daysDiff, []);
      }
      eventsByDay.get(daysDiff)?.push(event);
    });

    return events.map((event) => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
        (eventStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const startHour = event.start.getHours();
      const startMinutes = event.start.getMinutes();
      const endHour = event.end.getHours();
      const endMinutes = event.end.getMinutes();
      
      const durationInMinutes = 
        (endHour * 60 + endMinutes) - (startHour * 60 + startMinutes);
      
      const height = (durationInMinutes / 60) * 48;

      const dayEvents = eventsByDay.get(daysDiff) || [];
      const positions = calculateOverlappingGroups(events, dayEvents);
      const position = positions.get(event.id);

      const columnWidth = 100 / 8;
      const baseLeft = (daysDiff + 1) * columnWidth;
      const left = position
        ? `calc(${baseLeft}% + ${position.left * (columnWidth - 1)}%)`
        : `calc(${baseLeft}%)`;
      const width = position
        ? `calc(${position.width * (columnWidth - 1)}%)`
        : `calc(${columnWidth - 1}%)`;

      return (
        <div
          key={event.id}
          className={`absolute rounded-lg px-2 py-1 text-white text-sm ${effectiveCreator ? 'cursor-move' : ''} flex flex-col`}
          style={{
            left,
            top: `${startHour * 48 + (startMinutes / 60) * 48}px`,
            width,
            height: `${height - 4}px`,
            backgroundColor: event.color,
          }}
          onMouseDown={(e) => handleEventMouseDown(e, event)}
          onTouchStart={(e) => handleEventTouchStart(e, event)}
          onDoubleClick={(e) => handleEventDoubleClick(e, event)}
        >
          <div className="text-xs font-medium">
            {formatEventTime(event.start)} 〜 {formatEventTime(event.end)}
          </div>
          
          <div className="font-medium">{event.title}</div>
          {event.notes && (
            <div className="text-xs opacity-90 mt-1 line-clamp-2">{event.notes}</div>
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
          width: `calc(${(endDay - startDay + 1) * columnWidth - 1}%)`,
          height: `${height}px`,
        }}
      />
    );
  };

  return (
  <div className="flex flex-col h-screen">
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="sticky top-0 bg-white z-20 grid grid-cols-8 border-b">
        <div className="border-r" />
        {WEEK_DAYS.map((day, index) => {
          const dayInfo = getDayNumbers(currentDate)[index];
          return (
            <div key={day} className="border-r">
              <div className="h-14 px-1 sm:px-2 flex flex-col items-center justify-center">
                <div className="text-xs sm:text-sm text-gray-500">{day}</div>
                <div className={`text-base sm:text-xl ${dayInfo.isToday ? 'bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center' : ''}`}>
                  {dayInfo.number}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div ref={gridRef}
        className="relative flex-1 grid grid-cols-8 overflow-y-auto overflow-x-hidden min-h-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="border-r sticky left-0 bg-white z-10">
          {HOURS.map((hour) => (
            <div key={hour} className="h-12 text-right pr-2 text-sm text-gray-500">
              {hour}:00
            </div>
          ))}
        </div>
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
                        !isTimeInRange(hour) ? 'bg-gray-50 hidden sm:block' : ''
                      } ${isPastSlot ? 'bg-gray-100' : ''}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

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

        {renderEvents()}
        {renderDragSelection()}
      </div>
    </div>
  </div>
  );
};
