/** id элемента: по ТЗ это число или строка. */
export type TreeItemId = string | number

/** Минимум, который нужен хранилищу: свой id и id родителя (у корня — null). */
export interface TreeItem {
  id: TreeItemId
  parent: TreeItemId | null
}

/**
 * Дерево из плоского списка элементов, связанных через `parent`.
 *
 * Держим два индекса: элементы по id и детей по id родителя. Оба строятся за один проход,
 * поэтому методы не перебирают весь массив, а трогают только то, что возвращают или меняют.
 */
export class TreeStore<T extends TreeItem = TreeItem> {
  // private, а не #private: в приложении стор оборачивается в прокси Vue,
  // а #-поля через прокси не читаются.
  private readonly itemsById = new Map<TreeItemId, T>()
  private readonly childrenByParentId = new Map<TreeItemId | null, T[]>()
  // Собирается лениво в getAll(). Любое изменение сбрасывает его присваиванием: уже отданный
  // массив стор больше не трогает, а shallowReactive в приложении замечает изменение.
  private allItemsCache: readonly T[] | null = null

  // Отдельная сигнатура для пустого старта, иначе new TreeStore([]) выведет T = never.
  constructor(items: readonly [])
  constructor(items: readonly T[])
  constructor(items: readonly T[]) {
    this.setItems(items)
  }

  getAll(): readonly T[] {
    return (this.allItemsCache ??= Array.from(this.itemsById.values()))
  }

  getItem(id: TreeItemId): T | undefined {
    return this.itemsById.get(id)
  }

  getChildren(id: TreeItemId): T[] {
    // Копия: внутренний список потом меняется на месте.
    return this.childrenByParentId.get(id)?.slice() ?? []
  }

  getAllChildren(id: TreeItemId): T[] {
    const result = this.getChildren(id)
    // Обход в ширину, очередью служит сам result: итератор массива перечитывает длину
    // на каждом шаге, поэтому добавленные по ходу элементы тоже обойдутся, и shift() не нужен.
    for (const item of result) {
      const children = this.childrenByParentId.get(item.id)
      if (children) {
        // Циклом, а не push(...children): на больших массивах spread упирается в лимит аргументов.
        for (const child of children) result.push(child)
      }
    }
    return result
  }

  getAllParents(id: TreeItemId): T[] {
    const result: T[] = []
    let item = this.itemsById.get(id)
    while (item) {
      result.push(item)
      item = item.parent === null ? undefined : this.itemsById.get(item.parent)
    }
    return result
  }

  setItems(items: readonly T[]): void {
    this.itemsById.clear()
    this.childrenByParentId.clear()
    for (const item of items) this.link(item)
    this.allItemsCache = null
  }

  addItem(item: T): void {
    this.link(item)
    this.allItemsCache = null
  }

  removeItem(id: TreeItemId): void {
    const item = this.itemsById.get(id)
    if (!item) return

    this.unlinkFromParent(item)
    // Без рекурсии, чтобы длинная цепочка не упёрлась в стек вызовов.
    const pending = [item]
    for (let current = pending.pop(); current; current = pending.pop()) {
      this.itemsById.delete(current.id)
      const children = this.childrenByParentId.get(current.id)
      if (children) {
        this.childrenByParentId.delete(current.id)
        for (const child of children) pending.push(child)
      }
    }
    this.allItemsCache = null
  }

  updateItem(item: T): void {
    const previous = this.itemsById.get(item.id)
    if (!previous) return

    if (previous.parent === item.parent) {
      // Родитель тот же: новый объект встаёт на место старого.
      this.itemsById.set(item.id, item)
      const siblings = this.childrenByParentId.get(item.parent)
      if (siblings) siblings[siblings.indexOf(previous)] = item
    } else {
      // Родитель сменился: элемент уходит в конец getAll() и в конец детей нового родителя,
      // так порядок детей всегда совпадает с порядком getAll().
      this.unlinkFromParent(previous)
      this.itemsById.delete(item.id)
      this.link(item)
    }
    this.allItemsCache = null
  }

  private link(item: T): void {
    this.itemsById.set(item.id, item)
    const siblings = this.childrenByParentId.get(item.parent)
    if (siblings) siblings.push(item)
    else this.childrenByParentId.set(item.parent, [item])
  }

  private unlinkFromParent(item: T): void {
    const siblings = this.childrenByParentId.get(item.parent)
    if (siblings) siblings.splice(siblings.indexOf(item), 1)
  }
}

export default TreeStore
