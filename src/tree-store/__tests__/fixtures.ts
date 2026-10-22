import type { TreeItem, TreeItemId } from '../TreeStore'

export interface TestItem extends TreeItem {
  label: string
}

/** Генератор псевдослучайных чисел (mulberry32): один seed — одни и те же деревья и операции. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** id чередуются: число, строка — по ТЗ допустимы оба варианта. */
export const makeId = (index: number): TreeItemId => (index % 2 === 0 ? index : `id-${index}`)

const makeItem = (index: number, parent: TreeItemId | null): TestItem => ({
  id: makeId(index),
  parent,
  label: `Айтем ${index}`,
})

/**
 * Каждый элемент вешается на случайный элемент из созданных раньше. Потом список
 * перемешивается, так что дети часто идут раньше родителей — порядок по ТЗ не гарантирован.
 */
export function generateRandomTree(size: number, random: () => number): TestItem[] {
  return Array.from({ length: size }, (_, index) =>
    makeItem(index, index === 0 ? null : makeId(Math.floor(random() * index))),
  )
    .map((item) => ({ item, order: random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item)
}

/** Один корень, все остальные — его прямые дети. */
export function generateWideTree(size: number): TestItem[] {
  return Array.from({ length: size }, (_, index) => makeItem(index, index === 0 ? null : makeId(0)))
}

/** Цепочка: каждый элемент — единственный ребёнок предыдущего. */
export function generateChain(size: number): TestItem[] {
  return Array.from({ length: size }, (_, index) =>
    makeItem(index, index === 0 ? null : makeId(index - 1)),
  )
}
