<script setup>
import { computed } from 'vue'
import { isConnected } from '@/services/socket'
import { useAppointmentStore, getTodayDateString } from '@/stores/appointmentStore'
import {
  Calendar as CalendarIcon,
  Plus,
  Radio,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'

const emit = defineEmits(['open-new-appointment'])

const appointmentStore = useAppointmentStore()

const isToday = computed(() => appointmentStore.selectedDate === getTodayDateString())

function changeDate(delta) {
  const [year, month, day] = appointmentStore.selectedDate.split('-').map(Number)
  const currentDate = new Date(year, month - 1, day)
  currentDate.setDate(currentDate.getDate() + delta)

  const y = currentDate.getFullYear()
  const m = String(currentDate.getMonth() + 1).padStart(2, '0')
  const d = String(currentDate.getDate()).padStart(2, '0')
  const newDateString = `${y}-${m}-${d}`

  appointmentStore.selectedDate = newDateString
  appointmentStore.fetchAppointments(newDateString)
}

function setToday() {
  const today = getTodayDateString()
  appointmentStore.selectedDate = today
  appointmentStore.fetchAppointments(today)
}

function onDateInputChange(e) {
  const val = e.target.value
  if (val) {
    appointmentStore.fetchAppointments(val)
  }
}
</script>

<template>
  <header
    class="bg-white border-b border-slate-200/80 px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-30 shadow-xs"
  >
    <!-- Lado Esquerdo: Seletor de Data Global -->
    <div class="flex items-center flex-wrap gap-3">
      <div class="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
        <button
          @click="changeDate(-1)"
          type="button"
          title="Dia anterior"
          class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white transition-all shadow-xs"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <div class="relative flex items-center px-2">
          <CalendarIcon class="w-4 h-4 text-slate-400 pointer-events-none absolute left-3" />
          <input
            type="date"
            :value="appointmentStore.selectedDate"
            @change="onDateInputChange"
            class="pl-7 pr-2 py-1 bg-transparent text-sm font-semibold text-slate-800 border-none focus:outline-none focus:ring-0 cursor-pointer"
          />
        </div>

        <button
          @click="changeDate(1)"
          type="button"
          title="Próximo dia"
          class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white transition-all shadow-xs"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <button
        v-if="!isToday"
        @click="setToday"
        type="button"
        class="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
      >
        Ir para Hoje
      </button>
    </div>

    <!-- Lado Direito: Status do Socket.io + Ação Rápida -->
    <div class="flex items-center gap-4">
      <!-- Indicador Real-Time WebSocket -->
      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors select-none"
        :class="[
          isConnected
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-200',
        ]"
      >
        <span class="relative flex h-2 w-2">
          <span
            v-if="isConnected"
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
          ></span>
          <span
            class="relative inline-flex rounded-full h-2 w-2"
            :class="isConnected ? 'bg-emerald-500' : 'bg-amber-500'"
          ></span>
        </span>
        <span class="font-semibold">
          {{ isConnected ? 'Tempo Real Ativo' : 'Reconectando...' }}
        </span>
      </div>

      <!-- Botão Novo Agendamento -->
      <button
        @click="emit('open-new-appointment')"
        type="button"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-all"
      >
        <Plus class="w-4 h-4" />
        <span>Novo Agendamento</span>
      </button>
    </div>
  </header>
</template>

