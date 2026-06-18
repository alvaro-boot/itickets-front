import { reactive, readonly } from 'vue';
import { catalogsService } from '../../modules/catalogs/services/catalogsService';

const state = reactive({
  bundle: null,
  fetchedAt: 0,
});

const CACHE_TTL_MS = 60_000;

async function fetchCatalogBundle(force = false) {
  if (state.bundle && !force && Date.now() - state.fetchedAt < CACHE_TTL_MS) {
    return state.bundle;
  }
  try {
    state.bundle = await catalogsService.bundle();
  } catch {
    const [statuses, priorities, products, types, areas] = await Promise.all([
      catalogsService.statuses(),
      catalogsService.priorities(),
      catalogsService.products(),
      catalogsService.types(),
      catalogsService.areas(),
    ]);
    state.bundle = {
      statuses,
      priorities,
      products: products?.items || products || [],
      types: types?.items || types || [],
      areas: areas?.items || areas || [],
    };
  }
  state.fetchedAt = Date.now();
  return state.bundle;
}

function invalidateCatalogBundle() {
  state.bundle = null;
  state.fetchedAt = 0;
}

export function useCatalogs() {
  return {
    state: readonly(state),
    fetchCatalogBundle,
    invalidateCatalogBundle,
  };
}
