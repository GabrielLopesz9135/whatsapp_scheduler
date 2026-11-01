<script setup>
import { ref, watch, onMounted } from 'vue'
import { useAppointmentStore } from '@/stores/appointmentStore'
import { useServiceStore } from '@/stores/serviceStore'
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Sparkles,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'created'])

const appointmentStore = useAppointmentStore()
const serviceStore = useServiceStore()

const customerName = ref('')
const customerPhone = ref('')
const serviceId = ref('')
const date = ref(appointmentStore.selectedDate)
const selectedStartTime = ref('')

const availableSlots = ref([])
const loadingSlots = ref(false)
const submitting = ref(false)
const concurrencyError = ref('')
const generalError = ref('')

// Carrega os serviços ativos caso ainda não estejam na store
onMounted(async () => {
  if (serviceStore.services.length === 0) {
    await serviceStore.fetchServices()
  }
  if (serviceStore.activeServices.length > 0 && !serviceId.value) {
    serviceId.value = serviceStore.activeServices[0]._id
  }
})

// Busca dinâmica de slots sempre que o serviço ou a data mudar
watch(
  [serviceId, date],
  async ([newServiceId, newDate]) => {
    concurrencyError.value = ''
    generalError.value = ''
    selectedStartTime.value = ''

    if (!newServiceId || !newDate) {
      availableSlots.value = []
      return
    }

    loadingSlots.value = true
    try {
      const slots = await appointmentStore.fetchAvailableSlots(newDate, newServiceId)
      availableSlots.value = slots
    } catch (err) {
      availableSlots.value = []
      generalError.value = err.response?.data?.error || 'Erro ao consultar horários livres'
    } finally {
      loadingSlots.value = false
    }
  },
  { immediate: true }
)

// Atualiza a data padrão quando o modal for aberto
watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      date.value = appointmentStore.selectedDate
      concurrencyError.value = ''
      generalError.value = ''
      if (serviceStore.activeServices.length > 0 && !serviceId.value) {
        serviceId.value = serviceStore.activeServices[0]._id
      }
    }
  }
)

async function handleSubmit() {
  concurrencyError.value = ''
  generalError.value = ''

  if (!customerName.value.trim()) {
    generalError.value = 'Nome do cliente é obrigatório.'
    return
  }
  if (!customerPhone.value.trim()) {
    generalError.value = 'Telefone do cliente é obrigatório.'
    return
  }
  if (!serviceId.value) {
    generalError.value = 'Selecione um serviço.'
    return
  }
  if (!selectedStartTime.value) {
    generalError.value = 'Selecione um horário disponível.'
    return
  }

  submitting.value = true

  try {
    await appointmentStore.createAppointment({
      customerName: customerName.value.trim(),
      customerPhone: customerPhone.value.trim().replace(/\D/g, ''),
      serviceId: serviceId.value,
      date: date.value,
      startTime: selectedStartTime.value,
      origin: 'DASHBOARD',
    })

    // Limpa formulário e fecha modal
    customerName.value = ''
    customerPhone.value = ''
    selectedStartTime.value = ''
    emit('created')
    emit('close')
  } catch (error) {
    // Tratamento de Concorrência (Race Condition 409 Conflict)
    if (error.response?.status === 409) {
      concurrencyError.value =
        '⚠️ Atenção: Este horário acabou de ser preenchido por outro cliente via WhatsApp! A lista de horários foi atualizada automaticamente. Por favor, escolha outro horário.'

      // Recarrega os slots disponíveis imediatamente
      loadingSlots.value = true
      selectedStartTime.value = ''
      try {
        const slots = await appointmentStore.fetchAvailableSlots(date.value, serviceId.value)
        availableSlots.value = slots
      } finally {
        loadingSlots.value = false
      }
    } else {
      generalError.value =
        error.response?.data?.error || 'Ocorreu um erro ao salvar o agendamento.'
    }
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
      class="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all"
    >
      <!-- Cabeçalho do Modal -->
      <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Novo Agendamento Manual</h2>
          <p class="text-xs text-slate-500">Agende para o cliente com trava em tempo real</p>
        </div>
        <button
          @click="emit('close')"
          type="button"
          class="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Alerta de Concorrência (HTTP 409 Conflict) -->
      <div
        v-if="concurrencyError"
        class="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs leading-relaxed"
      >
        <AlertTriangle class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span class="font-bold block mb-0.5">Conflito de Horário Detectado</span>
          {{ concurrencyError }}
        </div>
      </div>

      <!-- Alerta de Erro Genérico -->
      <div
        v-if="generalError"
        class="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
      >
        {{ generalError }}
      </div>

      <!-- Formulário -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <!-- Nome do Cliente -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Nome do Cliente
          </label>
          <div class="relative">
            <User class="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              v-model="customerName"
              type="text"
              required
              placeholder="Ex: João da Silva"
              class="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <!-- Telefone (WhatsApp) -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Telefone / WhatsApp
          </label>
          <div class="relative">
            <Phone class="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              v-model="customerPhone"
              type="text"
              required
              placeholder="Ex: 5511999998888 (com DDD)"
              class="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <!-- Linha com Serviço e Data -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Serviço -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Serviço
            </label>
            <div class="relative">
              <Sparkles class="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <select
                v-model="serviceId"
                class="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option
                  v-for="srv in serviceStore.activeServices"
                  :key="srv._id"
                  :value="srv._id"
                >
                  {{ srv.name }} ({{ srv.durationMinutes }}m - R$ {{ srv.price.toFixed(2) }})
                </option>
              </select>
            </div>
          </div>

          <!-- Data -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Data do Agendamento
            </label>
            <div class="relative">
              <Calendar class="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                v-model="date"
                type="date"
                required
                class="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>

        <!-- Seção de Horários Livres (Pílulas / Chips) -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Horários Livres Disponíveis
            </label>
            <span v-if="loadingSlots" class="text-xs text-blue-600 flex items-center gap-1 font-medium">
              <Loader2 class="w-3.5 h-3.5 animate-spin" /> Verificando vagas...
            </span>
          </div>

          <!-- Loading Skeleton -->
          <div v-if="loadingSlots" class="grid grid-cols-4 gap-2 py-3">
            <div
              v-for="i in 8"
              :key="i"
              class="h-9 bg-slate-100 rounded-xl animate-pulse"
            ></div>
          </div>

          <!-- Grade de Pílulas -->
          <div
            v-else-if="availableSlots.length > 0"
            class="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1"
          >
            <button
              v-for="slot in availableSlots"
              :key="slot"
              type="button"
              @click="selectedStartTime = slot"
              class="py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center flex items-center justify-center gap-1"
              :class="[
                selectedStartTime === slot
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30 ring-2 ring-blue-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50',
              ]"
            >
              <Clock class="w-3 h-3 opacity-60" />
              <span>{{ slot }}</span>
            </button>
          </div>

          <!-- Sem Horários Livres -->
          <div
            v-else
            class="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500 font-medium"
          >
            Não há horários disponíveis para este serviço na data selecionada.
          </div>
        </div>

        <!-- Botões de Ação do Rodapé -->
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
            :disabled="submitting || !selectedStartTime"
            class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all"
          >
            <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
            <CheckCircle v-else class="w-4 h-4" />
            <span>Confirmar Agendamento</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

