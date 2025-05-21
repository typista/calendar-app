import { Omit } from 'utility-types'
import { Event } from './event'

// ローカル保存用: Date を ISO 文字列に変換
export interface StoredEvent extends Omit<Event, 'start' | 'end'> {
  start: string  // ISO 文字列
  end: string    // ISO 文字列
  [key: string]: any
}

// 共有履歴
export interface ScheduleHistory {
  events: StoredEvent[]
  sharedAt?: string  // 共有日時 (ISO 文字列)
}
