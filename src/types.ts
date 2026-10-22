import type { TreeItem } from './tree-store/TreeStore'

/** Элемент из public/items.json: связи дерева и название для колонки «Наименование». */
export interface TreeRow extends TreeItem {
  label: string
}
