import { reactive, readonly } from 'vue';
import { catalogsService } from '../../modules/catalogs/services/catalogsService';

const state = reactive({
  bundle: null,
});

async function fetchCatalogBundle(force = false) {
  if (state.bundle && !force) return state.bundle;
  const [statuses, priorities, products, types, areas] = await Promise.all([
    catalogsService.statuses(),
    catalogsService.priorities(),
    catalogsService.products(),
    catalogsService.types(),
    catalogsService.areas(),
  ]);
  state.bundle = { statuses, priorities, products, types, areas };
  return state.bundle;
}

function invalidateCatalogBundle() {
  state.bundle = null;
}

export function useCatalogs() {
  return {
    state: readonly(state),
    fetchCatalogBundle,
    invalidateCatalogBundle,
  };
}
