export const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;
export type WeekDay = typeof WEEK_DAYS[number];
