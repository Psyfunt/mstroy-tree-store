import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { RowNumbersModule, TreeDataModule } from 'ag-grid-enterprise'

/**
 * Подключает модули AG Grid, которые нужны таблице: все community-модули и из Enterprise —
 * дерево и номера строк. Вызывается из main.ts и из тестов компонентов, чтобы грид был один и тот же.
 */
export function registerAgGrid(): void {
  ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule, RowNumbersModule])
}
