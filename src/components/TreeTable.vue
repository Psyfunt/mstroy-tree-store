<script setup lang="ts">
import { computed } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import {
  themeQuartz,
  type ColDef,
  type GetRowIdParams,
  type RowClassParams,
  type RowClassRules,
  type RowNumbersOptions,
  type RowStyle,
} from 'ag-grid-community'

import type { TreeStore } from '@/tree-store/TreeStore'
import type { TreeRow } from '@/types'
import RowNumberHeader from './RowNumberHeader.vue'

const props = defineProps<{
  store: TreeStore<TreeRow>
  loading: boolean
}>()

// Через getAll() таблица подписывается на стор: любое его изменение сбрасывает кэш присваиванием,
// и computed пересчитывается. Копия нужна, потому что rowData в AG Grid — изменяемый массив.
const rows = computed(() => [...props.store.getAll()])

const hasChildren = (row: TreeRow | undefined): boolean =>
  row !== undefined && props.store.getChildren(row.id).length > 0

const columnDefs: ColDef<TreeRow>[] = [{ field: 'label', headerName: 'Наименование', flex: 1 }]

// В колонке дерева вместо ключа строки показываем категорию.
const autoGroupColumnDef: ColDef<TreeRow> = {
  headerName: 'Категория',
  width: 245,
  valueGetter: ({ data }) => (hasChildren(data) ? 'Группа' : 'Элемент'),
  cellRendererParams: { suppressCount: true },
}

const rowNumbers: RowNumbersOptions = { headerComponent: RowNumberHeader, width: 55, minWidth: 55 }

// Сортировка, ресайз и меню колонок в AG Grid включены по умолчанию, а в ТЗ и макете их нет.
const defaultColDef: ColDef<TreeRow> = {
  sortable: false,
  resizable: false,
  suppressHeaderMenuButton: true,
}

// Без getRowId не работает treeDataParentIdField; id строк AG Grid сравнивает как строки.
const getRowId = ({ data }: GetRowIdParams<TreeRow>): string => String(data.id)

const rowClassRules: RowClassRules<TreeRow> = {
  'tree-table__row--group': ({ data }) => hasChildren(data),
}

// Уровень вложенности для отступа текста категории в стилях ниже.
const getRowStyle = ({ node }: RowClassParams<TreeRow>): RowStyle => ({
  '--tree-level': String(node.level),
})

const localeText = { loadingOoo: 'Загрузка…' }

// Цвета и размеры сняты с макета из ТЗ.
const theme = themeQuartz.withParams({
  fontFamily: ['Open Sans', 'Segoe UI', 'Arial', 'sans-serif'],
  fontSize: 11,
  headerFontSize: 10,
  headerFontWeight: 600,
  foregroundColor: '#494949',
  headerTextColor: '#494949',
  backgroundColor: '#FFFFFF',
  headerBackgroundColor: '#FDFDFD',
  borderColor: '#C4C4C4',
  rowBorder: true,
  columnBorder: false,
  // Колонку номеров AG Grid закрепляет слева и отделяет линией, в макете её нет.
  pinnedColumnBorder: false,
  headerRowBorder: true,
  headerColumnBorder: true,
  headerColumnBorderHeight: '100%',
  wrapperBorder: false,
  wrapperBorderRadius: 2,
  rowHeight: 40,
  headerHeight: 40,
  cellHorizontalPadding: 16,
  iconSize: 18,
  cellWidgetSpacing: 9,
  // Шеврон на любом уровне стоит на месте, сдвигается только текст категории.
  rowGroupIndentSize: 0,
})
</script>

<template>
  <AgGridVue
    class="tree-table"
    :theme="theme"
    :row-data="rows"
    :column-defs="columnDefs"
    :auto-group-column-def="autoGroupColumnDef"
    :default-col-def="defaultColDef"
    :row-numbers="rowNumbers"
    :tree-data="true"
    tree-data-parent-id-field="parent"
    :get-row-id="getRowId"
    :group-default-expanded="-1"
    :row-class-rules="rowClassRules"
    :get-row-style="getRowStyle"
    :loading="loading"
    :locale-text="localeText"
    dom-layout="autoHeight"
  />
</template>

<style scoped>
/* Чего нет в параметрах темы: отступы и начертания по макету. */
.tree-table :deep(.ag-header-cell[col-id='ag-Grid-RowNumbersColumn']) {
  padding-left: 8px;
}

.tree-table :deep(.ag-header-cell[col-id='ag-Grid-AutoColumn']) {
  padding-left: 7px;
}

.tree-table :deep(.ag-cell[col-id='ag-Grid-AutoColumn']) {
  padding-left: 5px;
}

.tree-table :deep(.ag-row-number-cell) {
  padding-left: 15px;
  font-size: 11px;
  text-align: left;
  background-color: transparent;
  border-right: none;
}

.tree-table :deep(.ag-group-value) {
  padding-left: calc(var(--tree-level, 0) * 10px);
}

.tree-table :deep(.tree-table__row--group .ag-cell) {
  font-weight: 600;
}
</style>
