import { registerAgGrid } from '@/grid/registerAgGrid'

// В jsdom нет innerText, а групповая ячейка AG Grid пишет «Группа/Элемент» именно в него.
// Без подмены колонка «Категория» в тестах пустая.
Object.defineProperty(HTMLElement.prototype, 'innerText', {
  configurable: true,
  get(this: HTMLElement) {
    return this.textContent
  },
  set(this: HTMLElement, value: string) {
    this.textContent = value
  },
})

registerAgGrid()

/**
 * Текст оверлея таблицы. Текст всей таблицы для этого не годится: AG Grid дублирует его
 * для экранных дикторов в aria-live и не стирает, когда оверлей уже скрыт.
 */
export const readOverlay = (root: Element): string =>
  root.querySelector('.ag-overlay')?.textContent.trim() ?? ''

const byAttribute = (name: string) => (a: Element, b: Element) =>
  Number(a.getAttribute(name)) - Number(b.getAttribute(name))

/**
 * Строки таблицы так, как их видит пользователь: уровень вложенности, затем текст ячеек слева
 * направо. Новую строку AG Grid дописывает в конец контейнера, поэтому порядок берём из aria-атрибутов.
 */
export function readRows(root: Element): string[] {
  return [...root.querySelectorAll<HTMLElement>('.ag-row')]
    .sort(byAttribute('aria-rowindex'))
    .map((row) => {
      const cells = [...row.querySelectorAll('.ag-cell')]
        .sort(byAttribute('aria-colindex'))
        .map((cell) => cell.textContent.trim())
      return [row.style.getPropertyValue('--tree-level'), ...cells].join(' | ')
    })
}
