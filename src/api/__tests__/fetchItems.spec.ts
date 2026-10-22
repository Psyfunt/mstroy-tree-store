// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchItems } from '../fetchItems'

const items = [
  { id: 1, parent: null, label: 'Айтем 1' },
  { id: '91064cef', parent: 1, label: 'Айтем 2' },
]

describe('fetchItems', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(items))))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('запрашивает items.json только через 2 секунды', async () => {
    const pending = fetchItems()

    await vi.advanceTimersByTimeAsync(1999)
    expect(fetch).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/items.json')
    await expect(pending).resolves.toEqual(items)
  })
})
