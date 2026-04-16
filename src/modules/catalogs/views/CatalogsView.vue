<template>
  <section class="stack">
    <div class="grid-2">
      <div class="panel">
        <h3 style="margin-top: 0">Registrar producto</h3>
        <form class="field-stack" @submit.prevent="createProduct">
          <label for="productName">Nombre</label>
          <input id="productName" v-model.trim="productForm.name" minlength="2" required />
          <label for="productCode">Codigo (opcional)</label>
          <input id="productCode" v-model.trim="productForm.code" placeholder="Se genera automáticamente si lo dejas vacío" />
          <div style="margin-top: 0.7rem">
            <button class="btn btn-primary" type="submit">Guardar producto</button>
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
            <button class="btn btn-primary" type="submit">Guardar tipo</button>
          </div>
        </form>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3 style="margin-top: 0">Productos registrados</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Codigo</th><th>Nombre</th></tr>
            </thead>
            <tbody>
              <tr v-if="products.length === 0">
                <td colspan="2" class="meta">Sin productos</td>
              </tr>
              <tr v-for="product in products" :key="product.id">
                <td>{{ product.code }}</td>
                <td>{{ product.name }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3 style="margin-top: 0">Tipos registrados</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Codigo</th><th>Nombre</th></tr>
            </thead>
            <tbody>
              <tr v-if="types.length === 0">
                <td colspan="2" class="meta">Sin tipos</td>
              </tr>
              <tr v-for="type in types" :key="type.id">
                <td>{{ type.code }}</td>
                <td>{{ type.name }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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

const ui = useUi();
const { invalidateCatalogBundle } = useCatalogs();

const products = ref([]);
const types = ref([]);
const productForm = ref({ name: '', code: '' });
const typeForm = ref({ name: '', code: '' });

async function loadCatalogs() {
  try {
    const [productRows, typeRows] = await Promise.all([catalogsService.products(), catalogsService.types()]);
    products.value = productRows || [];
    types.value = typeRows || [];
  } catch (error) {
    ui.showToast(error.message || 'No se pudieron cargar catalogos.', true);
  }
}

async function createProduct() {
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
  }
}

async function createType() {
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
  }
}

onMounted(loadCatalogs);
</script>
