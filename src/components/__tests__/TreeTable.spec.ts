import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { shallowReactive } from 'vue'

import { TreeStore } from '@/tree-store/TreeStore'
import type { TreeRow } from '@/types'
import TreeTable from '../TreeTable.vue'
import { readOverlay, readRows } from './agGrid'

// Элементы из ТЗ
const createItems = (): TreeRow[] => [
  { id: 1, parent: null, label: 'Айтем 1' },
  { id: '91064cef', parent: 1, label: 'Айтем 2' },
  { id: 3, parent: 1, label: 'Айтем 3' },
  { id: 4, parent: '91064cef', label: 'Айтем 4' },
  { id: 5, parent: '91064cef', label: 'Айтем 5' },
  { id: 6, parent: '91064cef', label: 'Айтем 6' },
  { id: 7, parent: 4, label: 'Айтем 7' },
  { id: 8, parent: 4, label: 'Айтем 8' },
]

// Как в макете: уровень | № п\п | Категория | Наименование
const tzRows = [
  '0 | 1 | Группа | Айтем 1',
  '1 | 2 | Группа | Айтем 2',
  '2 | 3 | Группа | Айтем 4',
  '3 | 4 | Элемент | Айтем 7',
  '3 | 5 | Элемент | Айтем 8',
  '2 | 6 | Элемент | Айтем 5',
  '2 | 7 | Элемент | Айтем 6',
  '1 | 8 | Элемент | Айтем 3',
]

// AG Grid рисует строки и ячейки дерева не сразу, поэтому проверки повторяются, пока не сойдутся.
const poll = { timeout: 3000 }

// Стор оборачиваем так же, как в App.vue.
const mountTable = (loading = false) => {
  const store = shallowReactive(new TreeStore(createItems()))
  const wrapper = mount(TreeTable, { props: { store, loading } })
  return { store, wrapper }
}

enableAutoUnmount(afterEach)

describe('TreeTable', () => {
  it('пока идёт загрузка, показывает «Загрузка…», а после убирает', async () => {
    const { wrapper } = mountTable(true)

    await expect.poll(() => readOverlay(wrapper.element), poll).toBe('Загрузка…')

    await wrapper.setProps({ loading: false })
    await expect.poll(() => readOverlay(wrapper.element), poll).toBe('')
  })

  it('показывает дерево в порядке и с уровнями макета', async () => {
    const { wrapper } = mountTable()

    await expect.poll(() => readRows(wrapper.element), poll).toEqual(tzRows)
  })

  it('подписывает колонки как в макете', async () => {
    const { wrapper } = mountTable()

    await expect
      .poll(() => wrapper.findAll('.ag-header-cell').map((cell) => cell.text()), poll)
      .toEqual(['№ п\\п', 'Категория', 'Наименование'])
  })

  it('после setItems показывает новые данные, не пересоздавая таблицу', async () => {
    const { store, wrapper } = mountTable()
    await expect.poll(() => readRows(wrapper.element), poll).toEqual(tzRows)
    const grid = wrapper.find('.ag-root-wrapper').element

    store.setItems([
      { id: 'a', parent: null, label: 'Новый' },
      { id: 'b', parent: 'a', label: 'Дочерний' },
    ])

    await expect
      .poll(() => readRows(wrapper.element), poll)
      .toEqual(['0 | 1 | Группа | Новый', '1 | 2 | Элемент | Дочерний'])
    expect(wrapper.find('.ag-root-wrapper').element).toBe(grid)
  })

  it('показывает элемент, добавленный через addItem', async () => {
    const { store, wrapper } = mountTable()
    await expect.poll(() => readRows(wrapper.element), poll).toEqual(tzRows)

    store.addItem({ id: 9, parent: 3, label: 'Айтем 9' })

    // «Айтем 3» стал группой, новый элемент — под ним.
    await expect
      .poll(() => readRows(wrapper.element), poll)
      .toEqual([...tzRows.slice(0, -1), '1 | 8 | Группа | Айтем 3', '2 | 9 | Элемент | Айтем 9'])
  })
})
