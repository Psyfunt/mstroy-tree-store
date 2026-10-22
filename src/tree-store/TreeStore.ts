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
  // Дети — Map по id, а не массив: удаление и замена не ищут элемент среди соседей
  // (на 100 тысячах соседей это секунды), а порядок вставки Map сохраняет.
  private readonly childrenByParentId = new Map<TreeItemId | null, Map<TreeItemId, T>>()
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
    const children = this.childrenByParentId.get(id)
    return children ? Array.from(children.values()) : []
  }

  getAllChildren(id: TreeItemId): T[] {
    const result = this.getChildren(id)
    // Обход в ширину, очередью служит сам result: итератор массива перечитывает длину
    // на каждом шаге, поэтому добавленные по ходу элементы тоже обойдутся, и shift() не нужен.
    for (const item of result) {
      const children = this.childrenByParentId.get(item.id)
      if (children) {
        // Циклом, а не push(...children): на больших списках spread упирается в лимит аргументов.
        for (const child of children.values()) result.push(child)
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

  // Методы записи обобщённые: элемент проверяется по форме (нужны id и parent), а не по списку
  // полей T. Иначе после new TreeStore([]) TypeScript отвергнет литерал с лишним полем, например label.
  setItems<U extends T>(items: readonly U[]): void {
    this.itemsById.clear()
    this.childrenByParentId.clear()
    for (const item of items) this.link(item)
    this.allItemsCache = null
  }

  addItem<U extends T>(item: U): void {
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
        for (const child of children.values()) pending.push(child)
      }
    }
    this.allItemsCache = null
  }

  updateItem<U extends T>(item: U): void {
    const previous = this.itemsById.get(item.id)
    if (!previous) return

    if (previous.parent === item.parent) {
      // Родитель тот же: новый объект встаёт на место старого, set по знакомому ключу позицию не меняет.
      this.itemsById.set(item.id, item)
      this.childrenByParentId.get(item.parent)?.set(item.id, item)
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
    if (siblings) siblings.set(item.id, item)
    else this.childrenByParentId.set(item.parent, new Map([[item.id, item]]))
  }

  private unlinkFromParent(item: T): void {
    this.childrenByParentId.get(item.parent)?.delete(item.id)
  }
}

export default TreeStore
