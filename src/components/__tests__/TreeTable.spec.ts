import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { shallowReactive } from 'vue'

import { registerAgGrid } from '@/grid/registerAgGrid'
import { TreeStore } from '@/tree-store/TreeStore'
import type { TreeRow } from '@/types'
import TreeTable from '../TreeTable.vue'
import { readOverlay, readRows, TZ_ROWS } from './agGrid'

registerAgGrid()

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

// AG Grid рисует строки и ячейки дерева не сразу, поэтому проверки повторяются, пока не сойдутся.
const poll = { timeout: 3000 }

// Стор оборачиваем так же, как в App.vue.
const mountTable = ({ loading = false, items = createItems() } = {}) => {
  const store = shallowReactive(new TreeStore(items))
  const wrapper = mount(TreeTable, { props: { store, loading } })
  return { store, wrapper }
}

enableAutoUnmount(afterEach)

describe('TreeTable', () => {
  it('пока идёт загрузка, показывает «Загрузка…», а после убирает', async () => {
    const { wrapper } = mountTable({ loading: true })

    await expect.poll(() => readOverlay(wrapper.element), poll).toBe('Загрузка…')

    await wrapper.setProps({ loading: false })
    await expect.poll(() => readOverlay(wrapper.element), poll).toBe('')
  })

  it('показывает дерево в порядке и с уровнями макета', async () => {
    const { wrapper } = mountTable()

    await expect.poll(() => readRows(wrapper.element), poll).toEqual(TZ_ROWS)
  })

  it('подписывает колонки как в макете', async () => {
    const { wrapper } = mountTable()

    await expect
      .poll(() => wrapper.findAll('.ag-header-cell').map((cell) => cell.text()), poll)
      .toEqual(['№ п\\п', 'Категория', 'Наименование'])
  })

  it('после setItems показывает новые данные, не пересоздавая таблицу', async () => {
    const { store, wrapper } = mountTable()
    await expect.poll(() => readRows(wrapper.element), poll).toEqual(TZ_ROWS)
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
    await expect.poll(() => readRows(wrapper.element), poll).toEqual(TZ_ROWS)

    store.addItem({ id: 9, parent: 3, label: 'Айтем 9' })

    // «Айтем 3» стал группой, новый элемент — под ним.
    await expect
      .poll(() => readRows(wrapper.element), poll)
      .toEqual([...TZ_ROWS.slice(0, -1), '1 | 8 | Группа | Айтем 3', '2 | 9 | Элемент | Айтем 9'])
  })

  it('после removeItem последнего ребёнка строка становится элементом', async () => {
    const { store, wrapper } = mountTable()
    await expect.poll(() => readRows(wrapper.element), poll).toEqual(TZ_ROWS)

    store.removeItem(7)
    store.removeItem(8)

    // У «Айтем 4» детей не осталось, номера строк сомкнулись.
    await expect
      .poll(() => readRows(wrapper.element), poll)
      .toEqual([
        '0 | 1 | Группа | Айтем 1',
        '1 | 2 | Группа | Айтем 2',
        '2 | 3 | Элемент | Айтем 4',
        '2 | 4 | Элемент | Айтем 5',
        '2 | 5 | Элемент | Айтем 6',
        '1 | 6 | Элемент | Айтем 3',
      ])
  })

  it('после updateItem со сменой родителя строка переезжает вместе с детьми', async () => {
    const { store, wrapper } = mountTable()
    await expect.poll(() => readRows(wrapper.element), poll).toEqual(TZ_ROWS)

    store.updateItem({ id: 4, parent: 3, label: 'Айтем 4' })

    // «Айтем 3» стал группой, «Айтем 4» с детьми теперь под ним.
    await expect
      .poll(() => readRows(wrapper.element), poll)
      .toEqual([
        '0 | 1 | Группа | Айтем 1',
        '1 | 2 | Группа | Айтем 2',
        '2 | 3 | Элемент | Айтем 5',
        '2 | 4 | Элемент | Айтем 6',
        '1 | 5 | Группа | Айтем 3',
        '2 | 6 | Группа | Айтем 4',
        '3 | 7 | Элемент | Айтем 7',
        '3 | 8 | Элемент | Айтем 8',
      ])
  })

  it('помечает строки групп классом для жирного начертания', async () => {
    const { wrapper } = mountTable()
    await expect.poll(() => readRows(wrapper.element), poll).toEqual(TZ_ROWS)

    const groups = wrapper.findAll('.ag-row.tree-table__row--group')

    expect(groups.map((row) => row.find('.ag-cell[col-id="label"]').text()).sort()).toEqual([
      'Айтем 1',
      'Айтем 2',
      'Айтем 4',
    ])
  })

  it('после updateItem без смены родителя показывает новое название', async () => {
    const { store, wrapper } = mountTable()
    await expect.poll(() => readRows(wrapper.element), poll).toEqual(TZ_ROWS)

    store.updateItem({ id: 5, parent: '91064cef', label: 'Переименованный' })

    await expect
      .poll(() => readRows(wrapper.element), poll)
      .toEqual(TZ_ROWS.map((row) => row.replace('Айтем 5', 'Переименованный')))
  })

  it('свёрнутая группа скрывает своих потомков, а номера идут подряд', async () => {
    const { wrapper } = mountTable()
    await expect.poll(() => readRows(wrapper.element), poll).toEqual(TZ_ROWS)

    // Шеврон строки «Айтем 2».
    const [, chevron] = wrapper.findAll('.ag-group-expanded')
    await chevron!.trigger('click')

    await expect
      .poll(() => readRows(wrapper.element), poll)
      .toEqual([
        '0 | 1 | Группа | Айтем 1',
        '1 | 2 | Группа | Айтем 2',
        '1 | 3 | Элемент | Айтем 3',
      ])
  })

  it('строит то же дерево, если в данных дети идут раньше родителей', async () => {
    const { wrapper } = mountTable({ items: createItems().reverse() })

    // Строки идут в порядке данных, а связи и категории те же.
    await expect
      .poll(() => readRows(wrapper.element), poll)
      .toEqual([
        '0 | 1 | Группа | Айтем 1',
        '1 | 2 | Элемент | Айтем 3',
        '1 | 3 | Группа | Айтем 2',
        '2 | 4 | Элемент | Айтем 6',
        '2 | 5 | Элемент | Айтем 5',
        '2 | 6 | Группа | Айтем 4',
        '3 | 7 | Элемент | Айтем 8',
        '3 | 8 | Элемент | Айтем 7',
      ])
  })
})
