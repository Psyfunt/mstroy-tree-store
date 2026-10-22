// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { TreeStore, type TreeItemId } from '../TreeStore'
import { createRandom, generateRandomTree, makeId, type TestItem } from './fixtures'

/** Медленная, но очевидно правильная модель: любой ответ — перебор обычного массива. */
class NaiveTreeModel {
  private items: TestItem[]

  constructor(items: readonly TestItem[]) {
    this.items = [...items]
  }

  getAll(): readonly TestItem[] {
    return this.items
  }

  getItem(id: TreeItemId): TestItem | undefined {
    return this.items.find((item) => item.id === id)
  }

  getChildren(id: TreeItemId): TestItem[] {
    return this.items.filter((item) => item.parent === id)
  }

  getAllChildren(id: TreeItemId): TestItem[] {
    const result: TestItem[] = []
    let level = this.getChildren(id)
    while (level.length > 0) {
      result.push(...level)
      level = level.flatMap((item) => this.getChildren(item.id))
    }
    return result
  }

  getAllParents(id: TreeItemId): TestItem[] {
    const result: TestItem[] = []
    let item = this.getItem(id)
    while (item) {
      result.push(item)
      item = item.parent === null ? undefined : this.getItem(item.parent)
    }
    return result
  }

  setItems(items: readonly TestItem[]): void {
    this.items = [...items]
  }

  addItem(item: TestItem): void {
    this.items.push(item)
  }

  removeItem(id: TreeItemId): void {
    const item = this.getItem(id)
    if (!item) return
    const removed = new Set([item, ...this.getAllChildren(id)])
    this.items = this.items.filter((candidate) => !removed.has(candidate))
  }

  updateItem(item: TestItem): void {
    const index = this.items.findIndex((candidate) => candidate.id === item.id)
    const previous = this.items[index]
    if (!previous) return
    if (previous.parent === item.parent) {
      this.items[index] = item
    } else {
      this.items.splice(index, 1)
      this.items.push(item)
    }
  }
}

type TreeApi = Pick<
  NaiveTreeModel,
  'getAll' | 'getItem' | 'getChildren' | 'getAllChildren' | 'getAllParents'
>

const idsOf = (items: readonly TestItem[]): TreeItemId[] => items.map((item) => item.id)

/** Ответы на все запросы по всем проверяемым id — обычными данными, чтобы сравнить через toEqual. */
function snapshot(tree: TreeApi, probeIds: readonly TreeItemId[]) {
  return {
    all: idsOf(tree.getAll()),
    byId: probeIds.map((id) => ({
      id,
      item: tree.getItem(id),
      children: idsOf(tree.getChildren(id)),
      allChildren: idsOf(tree.getAllChildren(id)),
      parents: idsOf(tree.getAllParents(id)),
    })),
  }
}

function runScenario(seed: number, steps: number): void {
  const random = createRandom(seed)
  const pick = <V>(values: readonly V[]): V | undefined =>
    values[Math.floor(random() * values.length)]

  const initial = generateRandomTree(20 + Math.floor(random() * 20), random)
  const store = new TreeStore(initial)
  const model = new NaiveTreeModel(initial)
  // id только уникальные (это контракт): новые берём из счётчика, далеко от начальных.
  let nextIndex = 1000
  // Родители, на которых сослались до их появления. Часть из них потом создаётся.
  const missingParents: string[] = []

  for (let step = 0; step < steps; step++) {
    const existing = model.getAll()
    const target = pick(existing)
    const roll = random()
    let operation: string

    if (roll < 0.25) {
      const parentRoll = random()
      let parent: TreeItemId | null = target?.id ?? null
      if (parentRoll < 0.1) parent = null
      else if (parentRoll < 0.2) {
        parent = `missing-${nextIndex}`
        missingParents.push(parent)
      }
      const item = { id: makeId(nextIndex++), parent, label: `добавлен на шаге ${step}` }
      operation = `addItem ${JSON.stringify(item)}`
      store.addItem(item)
      model.addItem(item)
    } else if (roll < 0.3 && missingParents.length > 0) {
      const id = missingParents.splice(0, 1)[0] ?? 'never'
      // Сироты, которые ждали этот id, станут его поддеревом, поэтому родителя ему берём снаружи.
      const subtree = new Set(model.getAllChildren(id))
      const parent = pick(existing.filter((candidate) => !subtree.has(candidate)))?.id ?? null
      const item = { id, parent, label: `поздний родитель, шаг ${step}` }
      operation = `addItem (поздний родитель) ${JSON.stringify(item)}`
      store.addItem(item)
      model.addItem(item)
    } else if (roll < 0.45) {
      const id = random() < 0.9 && target ? target.id : 'unknown'
      operation = `removeItem ${id}`
      store.removeItem(id)
      model.removeItem(id)
    } else if (roll < 0.6 && target) {
      const item = { ...target, label: `обновлён на шаге ${step}` }
      operation = `updateItem (тот же родитель) ${JSON.stringify(item)}`
      store.updateItem(item)
      model.updateItem(item)
    } else if (roll < 0.8 && target) {
      // Переносим только без циклов: новый родитель — не сам элемент и не его потомок.
      const subtree = new Set([target, ...model.getAllChildren(target.id)])
      const parent =
        random() < 0.15 ? null : (pick(existing.filter((c) => !subtree.has(c)))?.id ?? null)
      const item = { ...target, parent }
      operation = `updateItem (перенос) ${JSON.stringify(item)}`
      store.updateItem(item)
      model.updateItem(item)
    } else if (roll < 0.85) {
      const item = { id: 'unknown', parent: null, label: 'нет такого' }
      operation = 'updateItem (неизвестный id)'
      store.updateItem(item)
      model.updateItem(item)
    } else if (roll < 0.88) {
      const items = generateRandomTree(10 + Math.floor(random() * 30), random)
      operation = `setItems (${items.length} элементов)`
      missingParents.length = 0
      store.setItems(items)
      model.setItems(items)
    } else {
      operation = 'без изменений'
    }

    const probeIds = [...idsOf(model.getAll()), ...missingParents, 'unknown']
    expect(snapshot(store, probeIds), `seed ${seed}, шаг ${step}: ${operation}`).toEqual(
      snapshot(model, probeIds),
    )
  }
}

const SEEDS = Array.from({ length: 50 }, (_, index) => index + 1)

describe('TreeStore против наивной модели', () => {
  it.each(SEEDS)('отвечает так же, как модель, после 300 случайных операций (seed %i)', (seed) => {
    // Все сравнения внутри runScenario — тест упадёт, если их там не окажется.
    expect.hasAssertions()
    runScenario(seed, 300)
  })
})
