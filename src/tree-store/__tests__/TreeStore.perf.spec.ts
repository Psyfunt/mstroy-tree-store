// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { TreeStore } from '../TreeStore'
import {
  createRandom,
  generateChain,
  generateRandomTree,
  generateWideTree,
  makeId,
} from './fixtures'

// Потолок взят с большим запасом: всё, что ниже, укладывается в малую его часть. А случайный
// квадратичный проход по 100 тысячам элементов (перебор на каждом вызове, shift() в очереди) его пробьёт.
const SIZE = 100_000
const BUDGET_MS = 2_000

/**
 * Возвращает проверку, которую вызываем в циклах: как только сценарий вышел за бюджет, она бросает
 * ошибку. Таймаут теста синхронный цикл не прерывает, и без неё регрессия просто подвесила бы прогон.
 */
function startBudget(): () => void {
  const deadline = performance.now() + BUDGET_MS
  return () => {
    if (performance.now() > deadline) throw new Error(`Сценарий не уложился в ${BUDGET_MS} мс`)
  }
}

describe(`Потолок производительности TreeStore: ${SIZE} элементов, ${BUDGET_MS} мс на сценарий`, () => {
  it('случайное дерево: построение, все запросы по каждому id, по 10 тысяч изменений каждого вида', () => {
    const items = generateRandomTree(SIZE, createRandom(1))
    const ids = items.map((item) => item.id)
    const withinBudget = startBudget()

    const store = new TreeStore(items)
    for (let i = 0; i < 1_000; i++) store.getAll()
    withinBudget()
    for (const id of ids) {
      store.getItem(id)
      store.getChildren(id)
      store.getAllParents(id)
      withinBudget()
    }
    const descendants = store.getAllChildren(makeId(0)).length
    for (let i = 0; i < 10_000; i++) {
      store.addItem({ id: `extra-${i}`, parent: ids[i] ?? null, label: `Добавленный ${i}` })
      withinBudget()
    }
    for (const id of ids.slice(0, 10_000)) {
      const item = store.getItem(id)
      if (item) store.updateItem({ ...item, label: 'Обновлённый' })
      withinBudget()
    }
    for (const id of ids.slice(-10_000)) {
      store.removeItem(id)
      withinBudget()
    }
    withinBudget()

    expect(descendants).toBe(SIZE - 1)
    expect(store.getAll().length).toBeLessThan(SIZE)
  })

  it('широкое дерево: один корень, все остальные — его дети', () => {
    const store = new TreeStore(generateWideTree(SIZE))
    const withinBudget = startBudget()

    for (let i = 0; i < 100; i++) {
      store.getChildren(makeId(0))
      withinBudget()
    }
    const descendants = store.getAllChildren(makeId(0)).length
    for (let i = 0; i < 1_000; i++) {
      store.getAllParents(makeId(SIZE - 1 - i))
      withinBudget()
    }
    withinBudget()

    expect(descendants).toBe(SIZE - 1)
  })

  it('цепочка в 100 тысяч уровней обходится без рекурсии', () => {
    const store = new TreeStore(generateChain(SIZE))
    const withinBudget = startBudget()

    const parents = store.getAllParents(makeId(SIZE - 1)).length
    const descendants = store.getAllChildren(makeId(0)).length
    store.removeItem(makeId(0))
    withinBudget()

    expect(parents).toBe(SIZE)
    expect(descendants).toBe(SIZE - 1)
    expect(store.getAll()).toEqual([])
  })
})
