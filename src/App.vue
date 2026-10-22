<script setup lang="ts">
import { onMounted, ref, shallowReactive } from 'vue'

import { fetchItems } from '@/api/fetchItems'
import TreeTable from '@/components/TreeTable.vue'
import { TreeStore } from '@/tree-store/TreeStore'
import type { TreeRow } from '@/types'

// Стор создаётся пустым, загруженные данные попадают в него через setItems. shallowReactive
// следит за присваиваниями полей стора, а каждый изменяющий метод сбрасывает кэш getAll
// присваиванием — так таблица узнаёт о новых данных, а TreeStore остаётся обычным TS-классом.
const store = shallowReactive(new TreeStore<TreeRow>([]))
const loading = ref(true)

onMounted(async () => {
  store.setItems(await fetchItems())
  loading.value = false
})
</script>

<template>
  <main>
    <TreeTable :store="store" :loading="loading" />
  </main>
</template>

<style>
body {
  margin: 0;
  padding: 16px;
  background: #f3f2f1;
}
</style>
