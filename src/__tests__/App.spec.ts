import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'

import { readOverlay, readRows, TZ_ROWS } from '@/components/__tests__/agGrid'
import { registerAgGrid } from '@/grid/registerAgGrid'
import { TreeStore } from '@/tree-store/TreeStore'
import items from '../../public/items.json'
import App from '../App.vue'

registerAgGrid()
enableAutoUnmount(afterEach)

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(items))))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('пока данные грузятся, показывает «Загрузка…», через 2 секунды — таблицу из items.json', async () => {
    const setItems = vi.spyOn(TreeStore.prototype, 'setItems')
    const wrapper = mount(App)

    // expect.poll при фейковых таймерах сам двигает время, но на доли секунды, до запроса не дойдёт.
    await expect.poll(() => readOverlay(wrapper.element)).toBe('Загрузка…')
    expect(readRows(wrapper.element)).toEqual([])
    expect(fetch).not.toHaveBeenCalled()

    // Через секунду всё ещё ждём.
    await vi.advanceTimersByTimeAsync(1000)
    expect(readOverlay(wrapper.element)).toBe('Загрузка…')
    expect(readRows(wrapper.element)).toEqual([])

    await vi.advanceTimersByTimeAsync(1000)

    expect(fetch).toHaveBeenCalledExactlyOnceWith('/items.json')
    // Данные попадают в стор через setItems, как требует ТЗ (первый вызов — из конструктора, пустой).
    expect(setItems).toHaveBeenLastCalledWith(items)
    await expect.poll(() => readRows(wrapper.element), { timeout: 3000 }).toEqual(TZ_ROWS)
    expect(readOverlay(wrapper.element)).toBe('')
  })
})
