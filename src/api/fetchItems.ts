import type { TreeRow } from '@/types'

/** Искусственная задержка «ответа сервера», её требует ТЗ. */
export const LOADING_DELAY_MS = 2000

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Загружает элементы в рантайме, как будто с сервера. Файл лежит в public/, поэтому Vite
 * кладёт его в сборку как есть, а не встраивает в бандл.
 * Ошибки загрузки не обрабатываем: по ТЗ это не требуется.
 */
export async function fetchItems(): Promise<TreeRow[]> {
  await delay(LOADING_DELAY_MS)
  const response = await fetch(`${import.meta.env.BASE_URL}items.json`)
  return response.json()
}
