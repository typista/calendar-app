export const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;
export type WeekDay = typeof WEEK_DAYS[number];
// 時間ラベル（0〜23）
export const HOURS = Array.from({ length: 24 }, (_, i) => i);
