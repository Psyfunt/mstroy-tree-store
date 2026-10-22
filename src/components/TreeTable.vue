<script setup lang="ts">
import { computed } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import {
  themeQuartz,
  type ColDef,
  type GetRowIdParams,
  type RowClassRules,
  type RowNumbersOptions,
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

const rowNumbers: RowNumbersOptions = { headerComponent: RowNumberHeader, width: 54, minWidth: 54 }

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

const localeText = { loadingOoo: 'Загрузка…' }

const theme = themeQuartz
</script>

<template>
  <AgGridVue
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
    :loading="loading"
    :locale-text="localeText"
    dom-layout="autoHeight"
  />
</template>
