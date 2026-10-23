import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readOverlay, readRows, TZ_ROWS } from '@/components/__tests__/agGrid'
import items from '../../public/items.json'

// Модули AG Grid здесь не регистрируем: это обязанность точки входа, её и проверяем.
describe('main', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(items))))
    document.body.innerHTML = '<div id="app"></div>'
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('монтирует приложение в #app и показывает дерево из items.json', async () => {
    await import('@/main')

    await expect.poll(() => readOverlay(document.body)).toBe('Загрузка…')
    await vi.advanceTimersByTimeAsync(2000)
    await expect.poll(() => readRows(document.body), { timeout: 3000 }).toEqual(TZ_ROWS)
  })
})
