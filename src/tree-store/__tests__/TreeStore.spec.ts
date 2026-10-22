// @vitest-environment node
import { describe, expect, expectTypeOf, it } from 'vitest'

import DefaultExportedTreeStore, { TreeStore, type TreeItem, type TreeItemId } from '../TreeStore'

interface Row extends TreeItem {
  label: string
}

// Элементы из ТЗ
const createItems = (): Row[] => [
  { id: 1, parent: null, label: 'Айтем 1' },
  { id: '91064cef', parent: 1, label: 'Айтем 2' },
  { id: 3, parent: 1, label: 'Айтем 3' },
  { id: 4, parent: '91064cef', label: 'Айтем 4' },
  { id: 5, parent: '91064cef', label: 'Айтем 5' },
  { id: 6, parent: '91064cef', label: 'Айтем 6' },
  { id: 7, parent: 4, label: 'Айтем 7' },
  { id: 8, parent: 4, label: 'Айтем 8' },
]

const idsOf = (items: readonly TreeItem[]): TreeItemId[] => items.map((item) => item.id)

describe('TreeStore', () => {
  it('экспортируется и по имени, и по умолчанию', () => {
    expect(DefaultExportedTreeStore).toBe(TreeStore)
  })

  describe('getAll', () => {
    it('возвращает все элементы в исходном порядке', () => {
      const items = createItems()

      expect(new TreeStore(items).getAll()).toEqual(items)
    })

    it('для пустого хранилища возвращает пустой массив', () => {
      expect(new TreeStore([]).getAll()).toEqual([])
    })
  })

  describe('getItem', () => {
    it('возвращает сам объект элемента по числовому и строковому id', () => {
      const items = createItems()
      const store = new TreeStore(items)

      expect(store.getItem(1)).toBe(items[0])
      expect(store.getItem('91064cef')).toBe(items[1])
    })

    it('для неизвестного id возвращает undefined', () => {
      expect(new TreeStore(createItems()).getItem(100)).toBeUndefined()
    })

    it('не путает числовой id с его строковой записью', () => {
      expect(new TreeStore(createItems()).getItem('1')).toBeUndefined()
    })
  })

  describe('getChildren', () => {
    it('возвращает прямых детей в исходном порядке', () => {
      const store = new TreeStore(createItems())

      expect(idsOf(store.getChildren('91064cef'))).toEqual([4, 5, 6])
      expect(idsOf(store.getChildren(4))).toEqual([7, 8])
    })

    it('для листа и для неизвестного id возвращает пустой массив', () => {
      const store = new TreeStore(createItems())

      expect(store.getChildren(5)).toEqual([])
      expect(store.getChildren(100)).toEqual([])
    })

    it('возвращает копию: если её изменить, хранилище не меняется', () => {
      const store = new TreeStore(createItems())

      store.getChildren('91064cef').reverse()

      expect(idsOf(store.getChildren('91064cef'))).toEqual([4, 5, 6])
    })
  })

  describe('getAllChildren', () => {
    it('возвращает всех потомков по уровням', () => {
      const store = new TreeStore(createItems())

      expect(idsOf(store.getAllChildren(1))).toEqual(['91064cef', 3, 4, 5, 6, 7, 8])
      expect(idsOf(store.getAllChildren('91064cef'))).toEqual([4, 5, 6, 7, 8])
    })

    it('для листа и для неизвестного id возвращает пустой массив', () => {
      const store = new TreeStore(createItems())

      expect(store.getAllChildren(8)).toEqual([])
      expect(store.getAllChildren(100)).toEqual([])
    })
  })

  describe('getAllParents', () => {
    it('возвращает цепочку от самого элемента до корня', () => {
      const store = new TreeStore(createItems())

      expect(idsOf(store.getAllParents(7))).toEqual([7, 4, '91064cef', 1])
    })

    it('для корня возвращает только сам элемент', () => {
      expect(idsOf(new TreeStore(createItems()).getAllParents(1))).toEqual([1])
    })

    it('для неизвестного id возвращает пустой массив', () => {
      expect(new TreeStore(createItems()).getAllParents(100)).toEqual([])
    })
  })

  describe('setItems', () => {
    it('заполняет хранилище, созданное с пустым массивом', () => {
      const items = createItems()
      const store = new TreeStore<Row>([])

      store.setItems(items)

      expect(store.getAll()).toEqual(items)
      expect(idsOf(store.getAllChildren(1))).toEqual(['91064cef', 3, 4, 5, 6, 7, 8])
    })

    it('полностью заменяет прежние элементы', () => {
      const store = new TreeStore(createItems())

      store.setItems([
        { id: 'a', parent: null, label: 'A' },
        { id: 'b', parent: 'a', label: 'B' },
      ])

      expect(idsOf(store.getAll())).toEqual(['a', 'b'])
      expect(store.getItem(1)).toBeUndefined()
      expect(store.getChildren(1)).toEqual([])
      expect(idsOf(store.getChildren('a'))).toEqual(['b'])
    })
  })

  describe('addItem', () => {
    it('добавляет элемент в конец и привязывает к родителю', () => {
      const store = new TreeStore(createItems())

      store.addItem({ id: 9, parent: 8, label: 'Айтем 9' })

      expect(idsOf(store.getAll())).toEqual([1, '91064cef', 3, 4, 5, 6, 7, 8, 9])
      expect(idsOf(store.getChildren(8))).toEqual([9])
      expect(idsOf(store.getAllParents(9))).toEqual([9, 8, 4, '91064cef', 1])
    })

    it('привязывает ребёнка, добавленного раньше родителя', () => {
      const store = new TreeStore<Row>([])

      store.addItem({ id: 'child', parent: 'root', label: 'Ребёнок' })
      store.addItem({ id: 'root', parent: null, label: 'Корень' })

      expect(idsOf(store.getChildren('root'))).toEqual(['child'])
      expect(idsOf(store.getAllParents('child'))).toEqual(['child', 'root'])
    })
  })

  describe('removeItem', () => {
    it('удаляет элемент вместе со всеми потомками', () => {
      const store = new TreeStore(createItems())

      store.removeItem('91064cef')

      expect(idsOf(store.getAll())).toEqual([1, 3])
      expect(idsOf(store.getChildren(1))).toEqual([3])
      expect(store.getItem(7)).toBeUndefined()
      expect(store.getChildren(4)).toEqual([])
    })

    it('удаляет лист и не трогает соседей', () => {
      const store = new TreeStore(createItems())

      store.removeItem(7)

      expect(idsOf(store.getChildren(4))).toEqual([8])
      expect(store.getAll()).toHaveLength(7)
    })

    it('неизвестный id ничего не меняет', () => {
      const items = createItems()
      const store = new TreeStore(items)

      store.removeItem(100)

      expect(store.getAll()).toEqual(items)
    })
  })

  describe('updateItem', () => {
    it('заменяет объект элемента и сохраняет его место', () => {
      const store = new TreeStore(createItems())
      const updated = { id: 5, parent: '91064cef', label: 'Обновлённый' }

      store.updateItem(updated)

      expect(store.getItem(5)).toBe(updated)
      expect(store.getChildren('91064cef')[1]).toBe(updated)
      expect(idsOf(store.getAll())).toEqual([1, '91064cef', 3, 4, 5, 6, 7, 8])
    })

    it('при смене родителя ставит элемент в конец детей нового родителя и в конец getAll', () => {
      const store = new TreeStore(createItems())

      store.updateItem({ id: 4, parent: 3, label: 'Айтем 4' })

      expect(idsOf(store.getChildren('91064cef'))).toEqual([5, 6])
      expect(idsOf(store.getChildren(3))).toEqual([4])
      expect(idsOf(store.getAllParents(7))).toEqual([7, 4, 3, 1])
      expect(idsOf(store.getAll())).toEqual([1, '91064cef', 3, 5, 6, 7, 8, 4])
    })

    it('неизвестный id ничего не меняет', () => {
      const items = createItems()
      const store = new TreeStore(items)

      store.updateItem({ id: 100, parent: 1, label: 'Нет такого' })

      expect(store.getAll()).toEqual(items)
    })
  })

  describe('возвращаемые массивы', () => {
    it('полученный раньше массив getAll не меняется после изменения хранилища', () => {
      const store = new TreeStore(createItems())
      const before = store.getAll()

      store.addItem({ id: 9, parent: 8, label: 'Айтем 9' })

      expect(before).toHaveLength(8)
      expect(store.getAll()).toHaveLength(9)
    })

    it('полученный раньше массив getChildren не меняется после изменения хранилища', () => {
      const store = new TreeStore(createItems())
      const before = store.getChildren(4)

      store.addItem({ id: 9, parent: 4, label: 'Айтем 9' })

      expect(idsOf(before)).toEqual([7, 8])
      expect(idsOf(store.getChildren(4))).toEqual([7, 8, 9])
    })
  })

  describe('типы', () => {
    it('после пустого старта из ТЗ принимает элементы без явного указания типа', () => {
      const store = new TreeStore([])

      store.setItems(createItems())

      expect(store.getAll()).toHaveLength(8)
    })

    it('после пустого старта принимает литералы с любыми полями', () => {
      const store = new TreeStore([])

      store.setItems([{ id: 1, parent: null, label: 'Айтем 1' }])
      store.addItem({ id: 2, parent: 1, label: 'Айтем 2' })
      store.updateItem({ id: 2, parent: null, label: 'Айтем 2' })

      expect(store.getAll()).toHaveLength(2)
    })

    it('после пустого старта не даёт добавить элемент без parent', () => {
      const store = new TreeStore([])
      // @ts-expect-error parent обязателен
      const addWithoutParent = () => store.addItem({ id: 9, label: 'Без родителя' })

      expectTypeOf(addWithoutParent).toBeFunction()
    })

    it('сохраняет тип элементов у явно типизированного хранилища', () => {
      const store = new TreeStore<Row>([])

      expectTypeOf(store.getItem(1)).toEqualTypeOf<Row | undefined>()
      expectTypeOf(store.getAllChildren(1)).toEqualTypeOf<Row[]>()
    })

    it('не даёт добавить элемент без parent', () => {
      const store = new TreeStore<Row>([])
      // @ts-expect-error parent обязателен
      const addWithoutParent = () => store.addItem({ id: 9, label: 'Без родителя' })

      expectTypeOf(addWithoutParent).toBeFunction()
    })
  })
})
