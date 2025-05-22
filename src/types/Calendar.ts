// イベントの型定義
export interface CalendarEvent {
  id: string             // イベント固有ID
  title: string          // イベントのタイトル
  start: Date            // 開始日時
  end: Date              // 終了日時
  color: string          // 表示色
  notes?: string         // メモ
  createdBy?: string     // 作成者名
  approvals?: Record<string, boolean>  // 承認状況マップ
  approvedBy?: string[]  // 承認済みユーザーリスト
}
