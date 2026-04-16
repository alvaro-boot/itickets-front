<template>
  <section class="stack">
    <div class="page-header">
      <div class="page-title">
        <h2>Catálogos</h2>
        <p>Administra productos y tipos con una experiencia más clara y consistente.</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3 style="margin-top: 0">Registrar producto</h3>
        <form class="field-stack" @submit.prevent="createProduct">
          <label for="productName">Nombre</label>
          <input id="productName" v-model.trim="productForm.name" minlength="2" required />
          <label for="productCode">Codigo (opcional)</label>
          <input id="productCode" v-model.trim="productForm.code" placeholder="Se genera automáticamente si lo dejas vacío" />
          <div style="margin-top: 0.7rem">
            <button class="btn btn-primary" type="submit" :disabled="isSavingProduct || isLoading">
              {{ isSavingProduct ? 'Guardando...' : 'Guardar producto' }}
            </button>
          </div>
        </form>
      </div>

      <div class="panel">
        <h3 style="margin-top: 0">Registrar tipo</h3>
        <form class="field-stack" @submit.prevent="createType">
          <label for="typeName">Nombre</label>
          <input id="typeName" v-model.trim="typeForm.name" minlength="2" required />
          <label for="typeCode">Codigo (opcional)</label>
          <input id="typeCode" v-model.trim="typeForm.code" placeholder="Se genera automáticamente si lo dejas vacío" />
          <div style="margin-top: 0.7rem">
            <button class="btn btn-primary" type="submit" :disabled="isSavingType || isLoading">
              {{ isSavingType ? 'Guardando...' : 'Guardar tipo' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="isLoading" class="panel">
      <p class="meta">Cargando catálogos...</p>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3 style="margin-top: 0">Productos registrados</h3>
        <DataTable :rows="products" :columns="catalogColumns" row-key="id" empty-text="Sin productos" :initial-page-size="10" />
      </div>

      <div class="panel">
        <h3 style="margin-top: 0">Tipos registrados</h3>
        <DataTable :rows="types" :columns="catalogColumns" row-key="id" empty-text="Sin tipos" :initial-page-size="10" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { catalogsService } from '../services/catalogsService';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { useUi } from '../../../shared/composables/useUi';
import { slugifyCode } from '../../../shared/utils/format';
import DataTable from '../../../shared/components/DataTable.vue';

const ui = useUi();
const { invalidateCatalogBundle } = useCatalogs();

const products = ref([]);
const types = ref([]);
const isLoading = ref(false);
const isSavingProduct = ref(false);
const isSavingType = ref(false);
const productForm = ref({ name: '', code: '' });
const typeForm = ref({ name: '', code: '' });
const catalogColumns = [
  { key: 'code', label: 'Codigo' },
  { key: 'name', label: 'Nombre' },
];

async function loadCatalogs() {
  isLoading.value = true;
  try {
    const [productRows, typeRows] = await Promise.all([catalogsService.products(), catalogsService.types()]);
    products.value = productRows || [];
    types.value = typeRows || [];
  } catch (error) {
    ui.showToast(error.message || 'No se pudieron cargar catalogos.', true);
  } finally {
    isLoading.value = false;
  }
}

async function createProduct() {
  if (isSavingProduct.value) return;
  isSavingProduct.value = true;
  try {
    await catalogsService.createProduct({
      name: productForm.value.name,
      code: productForm.value.code || slugifyCode(productForm.value.name) || undefined,
    });
    productForm.value = { name: '', code: '' };
    invalidateCatalogBundle();
    ui.showToast('Producto registrado', false);
    await loadCatalogs();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo registrar el producto.', true);
  } finally {
    isSavingProduct.value = false;
  }
}

async function createType() {
  if (isSavingType.value) return;
  isSavingType.value = true;
  try {
    await catalogsService.createType({
      name: typeForm.value.name,
      code: typeForm.value.code || slugifyCode(typeForm.value.name) || undefined,
    });
    typeForm.value = { name: '', code: '' };
    invalidateCatalogBundle();
    ui.showToast('Tipo registrado', false);
    await loadCatalogs();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo registrar el tipo.', true);
  } finally {
    isSavingType.value = false;
  }
}

onMounted(loadCatalogs);
</script>
