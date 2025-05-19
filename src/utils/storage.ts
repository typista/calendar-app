/**
 * localStorage から JSON をパースして取得する
 * @param key - localStorage のキー
 * @param defaultValue - 値が null の場合に返すデフォルト値
 * @returns 取得した値または defaultValue
 */
export function getJsonItem<T>(key: string, defaultValue: T | null = null): T | null {
  const raw = localStorage.getItem(key)
  if (raw === null) {
    return defaultValue
  }
  try {
    return JSON.parse(raw) as T
  } catch (e) {
    console.error(`getJsonItem: key="${key}" の JSON 解析に失敗`, e)
    return defaultValue
  }
}

/**
 * 値を JSON に変換して localStorage に保存する
 * @param key - localStorage のキー
 * @param value - 保存したい値
 */
export function setJsonItem<T>(key: string, value: T): void {
  try {
    const raw = JSON.stringify(value)
    localStorage.setItem(key, raw)
  } catch (e) {
    console.error(`setJsonItem: key="${key}" の JSON 変換に失敗`, e)
  }
}

/**
 * localStorage から削除する
 * @param key - localStorage のキー
 */
export function removeJsonItem(key: string): void {
  localStorage.removeItem(key)
}