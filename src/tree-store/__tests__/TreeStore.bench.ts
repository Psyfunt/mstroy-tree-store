// @vitest-environment node
import { bench, describe } from 'vitest'

import { TreeStore, type TreeItemId } from '../TreeStore'
import {
  createRandom,
  generateRandomTree,
  generateWideTree,
  makeId,
  type TestItem,
} from './fixtures'

const SHAPES: Record<string, (size: number) => TestItem[]> = {
  случайное: (size) => generateRandomTree(size, createRandom(42)),
  широкое: generateWideTree,
}

for (const size of [10_000, 100_000]) {
  for (const [shape, generate] of Object.entries(SHAPES)) {
    describe(`${shape} дерево, ${size} элементов`, () => {
      const items = generate(size)
      const store = new TreeStore(items)
      const ids = items.map((item) => item.id)
      let cursor = 0
      // Идём по id по кругу, чтобы каждый вызов спрашивал другой элемент.
      const nextId = (): TreeItemId => ids[cursor++ % ids.length] ?? 0

      bench('конструктор', () => {
        new TreeStore(items)
      })
      bench('getAll', () => {
        store.getAll()
      })
      bench('getItem', () => {
        store.getItem(nextId())
      })
      bench('getChildren', () => {
        store.getChildren(nextId())
      })
      bench('getAllChildren (корень)', () => {
        store.getAllChildren(makeId(0))
      })
      bench('getAllParents', () => {
        store.getAllParents(nextId())
      })
      // id каждый раз новый: если в большом Map раз за разом добавлять и удалять один и тот же ключ,
      // V8 уходит на медленный путь (около 24 мкс на пару даже у голого Map на 100 тысяч ключей),
      // и замер показывал бы его, а не стор.
      let leafCounter = 0
      bench('addItem + removeItem (лист)', () => {
        const id = `bench-leaf-${leafCounter++}`
        store.addItem({ id, parent: nextId(), label: 'Лист' })
        store.removeItem(id)
      })
      bench('updateItem (тот же родитель)', () => {
        const item = store.getItem(nextId())
        if (item) store.updateItem({ ...item, label: 'Обновлённый' })
      })
    })
  }
}

describe('случайное дерево, 1 млн элементов', () => {
  const items = generateRandomTree(1_000_000, createRandom(42))

  bench(
    'конструктор + первый getAll',
    () => {
      new TreeStore(items).getAll()
    },
    { iterations: 5, warmupIterations: 1 },
  )
})
