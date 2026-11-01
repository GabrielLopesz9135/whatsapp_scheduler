<script setup>
import { ref, onMounted, computed } from 'vue'
import { useServiceStore } from '@/stores/serviceStore'
import Sidebar from '@/components/layout/Sidebar.vue'
import ServiceModal from '@/components/services/ServiceModal.vue'
import {
  Scissors,
  Plus,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-vue-next'

const serviceStore = useServiceStore()

const isModalOpen = ref(false)
const serviceToEdit = ref(null)
const searchQuery = ref('')

onMounted(async () => {
  await serviceStore.fetchServices()
})

const filteredServices = computed(() => {
  if (!searchQuery.value.trim()) {
    return serviceStore.services
  }
  const q = searchQuery.value.toLowerCase()
  return serviceStore.services.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
  )
})

function openCreateModal() {
  serviceToEdit.value = null
  isModalOpen.value = true
}

function openEditModal(service) {
  serviceToEdit.value = { ...service }
  isModalOpen.value = true
}

async function toggleActive(service) {
  await serviceStore.updateService(service._id, {
    active: !service.active,
  })
}

async function handleDeactivate(service) {
  if (confirm(`Deseja desativar o serviço "${service.name}"?`)) {
    await serviceStore.deleteService(service._id)
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Menu Lateral Fixo -->
    <Sidebar />

    <!-- Conteúdo Principal -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Cabeçalho Simples da Página -->
      <header class="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Scissors class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-lg font-bold text-slate-900">Serviços & Durações</h1>
            <p class="text-xs text-slate-500">Configuração de catálogo e slots de atendimento</p>
          </div>
        </div>

        <button
          @click="openCreateModal"
          type="button"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Novo Serviço</span>
        </button>
      </header>

      <main class="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        <!-- Barra de Busca e Filtro -->
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="relative max-w-sm w-full">
            <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar serviço por nome..."
              class="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
            />
          </div>

          <div class="text-xs font-medium text-slate-500">
            Total de {{ serviceStore.services.length }} serviços cadastrados ({{ serviceStore.activeServices.length }} ativos)
          </div>
        </div>

        <!-- Estado de Carregamento -->
        <div
          v-if="serviceStore.loading && serviceStore.services.length === 0"
          class="py-20 flex flex-col items-center justify-center text-slate-400 gap-3"
        >
          <Loader2 class="w-8 h-8 animate-spin text-blue-600" />
          <p class="text-sm font-medium">Carregando serviços...</p>
        </div>

        <!-- Grade de Cards de Serviços -->
        <div
          v-else-if="filteredServices.length > 0"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <div
            v-for="service in filteredServices"
            :key="service._id"
            class="bg-white rounded-2xl p-6 border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md"
            :class="[
              service.active
                ? 'border-slate-200/90'
                : 'border-slate-200 bg-slate-50/70 opacity-75',
            ]"
          >
            <!-- Topo do Card -->
            <div>
              <div class="flex items-start justify-between gap-3 mb-2">
                <h3 class="text-base font-bold text-slate-900 tracking-tight">
                  {{ service.name }}
                </h3>

                <!-- Badge Ativo / Inativo -->
                <button
                  @click="toggleActive(service)"
                  type="button"
                  title="Clique para alternar status"
                  class="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border cursor-pointer"
                  :class="[
                    service.active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200',
                  ]"
                >
                  {{ service.active ? 'Ativo' : 'Inativo' }}
                </button>
              </div>

              <p class="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                {{ service.description || 'Sem descrição cadastrada.' }}
              </p>
            </div>

            <!-- Dados Críticos: Duração e Preço -->
            <div class="pt-5 mt-4 border-t border-slate-100">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-blue-50/70 text-blue-900 px-2.5 py-1 rounded-lg border border-blue-100">
                  <Clock class="w-3.5 h-3.5 text-blue-600" />
                  <span>{{ service.durationMinutes }} minutos</span>
                </div>

                <div class="text-base font-extrabold text-slate-900">
                  R$ {{ Number(service.price).toFixed(2).replace('.', ',') }}
                </div>
              </div>

              <!-- Ações: Editar e Excluir -->
              <div class="flex items-center justify-end gap-2 pt-2">
                <button
                  @click="openEditModal(service)"
                  type="button"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <Edit2 class="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  v-if="service.active"
                  @click="handleDeactivate(service)"
                  type="button"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Desativar Serviço"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  <span>Desativar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Estado Vazio -->
        <div
          v-else
          class="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto my-12"
        >
          <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Sparkles class="w-7 h-7" />
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-1">
            Nenhum serviço encontrado
          </h3>
          <p class="text-xs text-slate-500 leading-relaxed mb-6">
            Cadastre os serviços oferecidos para alimentar a máquina de estados do WhatsApp e os agendamentos manuais.
          </p>
          <button
            @click="openCreateModal"
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>Cadastrar Primeiro Serviço</span>
          </button>
        </div>
      </main>
    </div>

    <!-- Modal de Criação / Edição de Serviço -->
    <ServiceModal
      :is-open="isModalOpen"
      :service-to-edit="serviceToEdit"
      @close="isModalOpen = false"
      @saved="serviceStore.fetchServices()"
    />
  </div>
</template>

