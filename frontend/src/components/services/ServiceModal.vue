<script setup>
import { ref, watch } from 'vue'
import { useServiceStore } from '@/stores/serviceStore'
import { X, Sparkles, Clock, DollarSign, AlignLeft, CheckCircle, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  serviceToEdit: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'saved'])

const serviceStore = useServiceStore()

const name = ref('')
const description = ref('')
const durationMinutes = ref(30)
const price = ref(50)
const active = ref(true)

const submitting = ref(false)
const errorMessage = ref('')

watch(
  () => props.serviceToEdit,
  (srv) => {
    if (srv) {
      name.value = srv.name || ''
      description.value = srv.description || ''
      durationMinutes.value = srv.durationMinutes || 30
      price.value = srv.price || 0
      active.value = srv.active !== undefined ? srv.active : true
    } else {
      name.value = ''
      description.value = ''
      durationMinutes.value = 30
      price.value = 50
      active.value = true
    }
    errorMessage.value = ''
  },
  { immediate: true }
)

async function handleSubmit() {
  errorMessage.value = ''

  if (!name.value.trim()) {
    errorMessage.value = 'Nome do serviço é obrigatório.'
    return
  }
  if (!durationMinutes.value || durationMinutes.value <= 0) {
    errorMessage.value = 'Duração deve ser maior que zero minutos.'
    return
  }
  if (price.value === undefined || price.value < 0) {
    errorMessage.value = 'Preço não pode ser negativo.'
    return
  }

  submitting.value = true

  try {
    const payload = {
      name: name.value.trim(),
      description: description.value.trim(),
      durationMinutes: Number(durationMinutes.value),
      price: Number(price.value),
      active: active.value,
    }

    if (props.serviceToEdit?._id) {
      await serviceStore.updateService(props.serviceToEdit._id, payload)
    } else {
      await serviceStore.createService(payload)
    }

    emit('saved')
    emit('close')
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Erro ao salvar o serviço.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
  >
    <div
      class="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all"
    >
      <!-- Cabeçalho -->
      <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 class="text-lg font-bold text-slate-900">
            {{ serviceToEdit ? 'Editar Serviço' : 'Novo Serviço' }}
          </h2>
          <p class="text-xs text-slate-500">Defina o nome, duração e valor do serviço</p>
        </div>
        <button
          @click="emit('close')"
          type="button"
          class="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Alerta de Erro -->
      <div
        v-if="errorMessage"
        class="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
      >
        {{ errorMessage }}
      </div>

      <!-- Formulário -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <!-- Nome -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Nome do Serviço
          </label>
          <div class="relative">
            <Sparkles class="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              v-model="name"
              type="text"
              required
              placeholder="Ex: Corte Masculino Degradê"
              class="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <!-- Descrição -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Descrição (Opcional)
          </label>
          <div class="relative">
            <AlignLeft class="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <textarea
              v-model="description"
              rows="2"
              placeholder="Breve resumo do que está incluído no serviço..."
              class="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            ></textarea>
          </div>
        </div>

        <!-- Linha: Duração e Preço -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Duração em minutos -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Duração (minutos)
            </label>
            <div class="relative">
              <Clock class="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                v-model="durationMinutes"
                type="number"
                min="5"
                max="480"
                step="5"
                required
                class="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <!-- Preço em Reais -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Preço (R$)
            </label>
            <div class="relative">
              <DollarSign class="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                v-model="price"
                type="number"
                min="0"
                step="0.5"
                required
                class="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        <!-- Status Ativo / Inativo -->
        <div class="flex items-center gap-3 pt-2">
          <input
            id="service-active-toggle"
            v-model="active"
            type="checkbox"
            class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
          <label for="service-active-toggle" class="text-xs font-semibold text-slate-700 cursor-pointer">
            Serviço ativo para agendamento (WhatsApp e Dashboard)
          </label>
        </div>

        <!-- Rodapé do Modal -->
        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            @click="emit('close')"
            type="button"
            class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            :disabled="submitting"
            class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all"
          >
            <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
            <CheckCircle v-else class="w-4 h-4" />
            <span>{{ serviceToEdit ? 'Salvar Alterações' : 'Criar Serviço' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

