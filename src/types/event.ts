
import { CalendarEvent } from './calendar'

// EventPosition: 描画のための位置情報
export interface EventPosition {
  left: number   // 左位置の割合（0〜1）
  width: number  // 幅の割合（0〜1）
}

// 画面描画用に CalendarEvent と位置情報を結合
export type Event = CalendarEvent & EventPosition