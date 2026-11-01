<script setup>
import { computed } from 'vue'
import { useAppointmentStore, formatTimeHHmm } from '@/stores/appointmentStore'
import {
  Clock,
  Phone,
  MessageSquare,
  Check,
  X,
  Sparkles,
  User,
  Laptop,
} from 'lucide-vue-next'

const props = defineProps({
  appointment: {
    type: Object,
    required: true,
  },
})

const appointmentStore = useAppointmentStore()

const isNew = computed(() =>
  appointmentStore.newlyCreatedIds.has(props.appointment._id)
)

const startTimeFormatted = computed(() =>
  formatTimeHHmm(props.appointment.startTime)
)
const endTimeFormatted = computed(() =>
  formatTimeHHmm(props.appointment.endTime)
)

const serviceName = computed(
  () => props.appointment.serviceId?.name || 'Serviço Personalizado'
)
const serviceDuration = computed(
  () => props.appointment.serviceId?.durationMinutes || 30
)
const servicePrice = computed(() => {
  const price = props.appointment.serviceId?.price
  return price !== undefined ? `R$ ${Number(price).toFixed(2).replace('.', ',')}` : 'R$ 0,00'
})

function formatPhoneDisplay(raw) {
  if (!raw) return ''
  // Se for celular brasileiro (ex: 5511999998888)
  if (raw.length === 13 && raw.startsWith('55')) {
    const ddd = raw.substring(2, 4)
    const part1 = raw.substring(4, 9)
    const part2 = raw.substring(9)
    return `(${ddd}) ${part1}-${part2}`
  }
  return raw
}

async function markCompleted() {
  await appointmentStore.updateStatus(props.appointment._id, 'COMPLETED')
}

async function markCancelled() {
  if (confirm(`Deseja realmente cancelar o agendamento de ${props.appointment.customerName}?`)) {
    await appointmentStore.updateStatus(props.appointment._id, 'CANCELLED')
  }
}
</script>

<template>
  <div
    class="bg-white rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden group"
    :class="[
      isNew
        ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10 animate-highlight'
        : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md shadow-xs',
      props.appointment.status === 'CANCELLED' ? 'opacity-60 bg-slate-50/80' : '',
    ]"
  >
    <!-- Tarja lateral de status -->
    <div
      class="absolute left-0 top-0 bottom-0 w-1.5"
      :class="{
        'bg-blue-600': props.appointment.status === 'CONFIRMED',
        'bg-emerald-500': props.appointment.status === 'COMPLETED',
        'bg-rose-400': props.appointment.status === 'CANCELLED',
      }"
    ></div>

    <div class="pl-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <!-- Bloco Principal: Horário e Informações do Cliente -->
      <div class="flex items-start gap-4">
        <!-- Caixa de Horário -->
        <div
          class="shrink-0 w-24 px-2 py-3 rounded-xl flex flex-col items-center justify-center text-center border"
          :class="[
            props.appointment.status === 'CONFIRMED'
              ? 'bg-blue-50/80 border-blue-100 text-blue-900'
              : props.appointment.status === 'COMPLETED'
              ? 'bg-emerald-50/80 border-emerald-100 text-emerald-900'
              : 'bg-slate-100 border-slate-200 text-slate-500',
          ]"
        >
          <span class="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <Clock class="w-3 h-3" />
            Início
          </span>
          <span class="text-base font-extrabold tracking-tight">
            {{ startTimeFormatted }}
          </span>
          <span class="text-[11px] font-medium opacity-70">
            até {{ endTimeFormatted }}
          </span>
        </div>

        <!-- Detalhes do Cliente e Serviço -->
        <div class="min-w-0">
          <div class="flex items-center flex-wrap gap-2 mb-1">
            <h3 class="text-base font-bold text-slate-900 truncate">
              {{ props.appointment.customerName }}
            </h3>

            <!-- Badge de Origem (WhatsApp vs Manual) -->
            <span
              v-if="props.appointment.origin === 'WHATSAPP'"
              class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 select-none"
            >
              <MessageSquare class="w-3 h-3 fill-emerald-500 text-emerald-500" />
              WhatsApp
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 text-white select-none shadow-xs"
            >
              <Laptop class="w-3 h-3" />
              Manual
            </span>

            <!-- Badge de Status -->
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border select-none"
              :class="{
                'bg-blue-50 text-blue-700 border-blue-200': props.appointment.status === 'CONFIRMED',
                'bg-emerald-50 text-emerald-700 border-emerald-200':
                  props.appointment.status === 'COMPLETED',
                'bg-rose-50 text-rose-700 border-rose-200': props.appointment.status === 'CANCELLED',
              }"
            >
              {{
                props.appointment.status === 'CONFIRMED'
                  ? 'Confirmado'
                  : props.appointment.status === 'COMPLETED'
                  ? 'Concluído'
                  : 'Cancelado'
              }}
            </span>
          </div>

          <!-- Informações de Contato e Serviço -->
          <div class="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
            <a
              :href="`https://wa.me/${props.appointment.customerPhone}`"
              target="_blank"
              class="flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-medium transition-colors"
              title="Abrir no WhatsApp Web"
            >
              <Phone class="w-3.5 h-3.5 text-emerald-600" />
              <span>{{ formatPhoneDisplay(props.appointment.customerPhone) }}</span>
            </a>

            <span class="flex items-center gap-1 font-medium text-slate-700">
              <Sparkles class="w-3.5 h-3.5 text-blue-600" />
              <span>{{ serviceName }} ({{ serviceDuration }} min)</span>
            </span>

            <span class="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
              {{ servicePrice }}
            </span>
          </div>
        </div>
      </div>

      <!-- Bloco de Ações Rápidas -->
      <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <template v-if="props.appointment.status === 'CONFIRMED'">
          <button
            @click="markCompleted"
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all shadow-xs"
            title="Marcar como Concluído"
          >
            <Check class="w-3.5 h-3.5" />
            <span>Concluir</span>
          </button>

          <button
            @click="markCancelled"
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all"
            title="Cancelar Agendamento"
          >
            <X class="w-3.5 h-3.5" />
            <span>Cancelar</span>
          </button>
        </template>

        <span
          v-else-if="props.appointment.status === 'COMPLETED'"
          class="text-xs font-semibold text-emerald-600 flex items-center gap-1"
        >
          <Check class="w-4 h-4" /> Atendimento Finalizado
        </span>

        <span
          v-else-if="props.appointment.status === 'CANCELLED'"
          class="text-xs font-semibold text-rose-500 flex items-center gap-1"
        >
          <X class="w-4 h-4" /> Agendamento Cancelado
        </span>
      </div>
    </div>
  </div>
</template>

