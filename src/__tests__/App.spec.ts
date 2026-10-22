import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'

import { readOverlay, readRows } from '@/components/__tests__/agGrid'
import items from '../../public/items.json'
import App from '../App.vue'

enableAutoUnmount(afterEach)

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(items))))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('пока данные грузятся, показывает «Загрузка…», через 2 секунды — таблицу из items.json', async () => {
    const wrapper = mount(App)

    // expect.poll при фейковых таймерах сам двигает время, но на доли секунды, до запроса не дойдёт.
    await expect.poll(() => readOverlay(wrapper.element)).toBe('Загрузка…')
    expect(readRows(wrapper.element)).toEqual([])
    expect(fetch).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2000)

    expect(fetch).toHaveBeenCalledExactlyOnceWith('/items.json')
    await expect.poll(() => readRows(wrapper.element), { timeout: 3000 }).toHaveLength(items.length)
    expect(readOverlay(wrapper.element)).toBe('')
  })
})
