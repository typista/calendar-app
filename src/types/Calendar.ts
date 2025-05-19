import React, { FormEvent, Dispatch, SetStateAction } from 'react'

// イベントの型定義
export interface CalendarEvent {
  id: string;             // イベント固有ID
  title: string;          // イベントのタイトル
  start: Date;            // 開始日時
  end: Date;              // 終了日時
  color: string;          // 表示色
  notes?: string;         // メモ
  createdBy?: string;     // 作成者名
  approvals?: { [key: string]: boolean }; // 承認状況マップ
  approvedBy?: string[];  // 承認済みユーザーリスト
}

// イベント描画位置情報の型
export interface EventPosition {
  left: number;           // 左位置の割合
  width: number;          // 幅の割合
}

// モーダル表示用の型定義
export interface EventData {
  show: boolean;          // モーダル表示フラグ
  start: Date;            // 編集対象開始日時
  end: Date;              // 編集対象終了日時
  event?: Event;          // 編集対象イベント（新規なら undefined）
}

// ローカル保存用のイベント型（Date を ISO 文字列に変換）
export interface StoredEvent extends Omit<Event, 'start' | 'end'> {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  notes?: string;
  createdBy?: string;
  approvals?: Record<string, boolean>;
  approvedBy?: string[];
  [key: string]: any;
}

// 表示時間帯の型
export interface TimeRange {
  start: number;          // 開始時刻 (hour)
  end: number;            // 終了時刻 (hour)
}

export interface ApprovalInfo {
  approved: boolean;
  slot: { start: string; end: string };
  color: string;
  title: string;
  notes: string;
}

// 承認レスポンス型
export interface ApprovalResponse {
  [eventId: string]: boolean;
}

// スケジュール履歴用
export interface ScheduleHistory {
  events: StoredEvent[];
  sharedAt?: string;      // 共有日時
}

export interface UseCalendarDataResult {
  events: Event[];
  setEvents: Dispatch<SetStateAction<Event[]>>;
  scheduleTitle: string;
  setScheduleTitle: Dispatch<SetStateAction<string>>;
  displayTitle: string;
  setDisplayTitle: Dispatch<SetStateAction<string>>;
  showAnsweredButton: boolean;
  effectiveCreator: boolean;
}