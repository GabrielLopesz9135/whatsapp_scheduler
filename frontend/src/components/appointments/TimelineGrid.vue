<script setup>
import { computed, ref } from 'vue'
import { useAppointmentStore } from '@/stores/appointmentStore'
import AppointmentCard from './AppointmentCard.vue'
import { CalendarX, Loader2, Plus } from 'lucide-vue-next'

const emit = defineEmits(['open-new-appointment'])

const appointmentStore = useAppointmentStore()
const filterStatus = ref('ALL') // 'ALL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

const filteredAppointments = computed(() => {
  if (filterStatus.value === 'ALL') {
    return appointmentStore.appointments
  }
  return appointmentStore.appointments.filter(
    (a) => a.status === filterStatus.value
  )
})
</script>

<template>
  <div class="space-y-4">
    <!-- Barra de Filtros Rápidos -->
    <div
      v-if="appointmentStore.appointments.length > 0"
      class="flex items-center justify-between flex-wrap gap-2 pb-2"
    >
      <div class="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
        <button
          v-for="filter in [
            { label: 'Todos', value: 'ALL', count: appointmentStore.totalAppointments },
            { label: 'Confirmados', value: 'CONFIRMED', count: appointmentStore.confirmedAppointments },
            { label: 'Concluídos', value: 'COMPLETED', count: appointmentStore.completedAppointments },
            { label: 'Cancelados', value: 'CANCELLED', count: appointmentStore.cancelledAppointments },
          ]"
          :key="filter.value"
          @click="filterStatus = filter.value"
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
          :class="[
            filterStatus === filter.value
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900',
          ]"
        >
          <span>{{ filter.label }}</span>
          <span
            class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
            :class="[
              filterStatus === filter.value
                ? 'bg-slate-900 text-white'
                : 'bg-slate-200 text-slate-600',
            ]"
          >
            {{ filter.count }}
          </span>
        </button>
      </div>

      <span class="text-xs font-medium text-slate-500">
        Mostrando {{ filteredAppointments.length }} de {{ appointmentStore.totalAppointments }} agendamentos
      </span>
    </div>

    <!-- Estado de Carregamento -->
    <div
      v-if="appointmentStore.loading && appointmentStore.appointments.length === 0"
      class="py-20 flex flex-col items-center justify-center text-slate-400 gap-3"
    >
      <Loader2 class="w-8 h-8 animate-spin text-blue-600" />
      <p class="text-sm font-medium">Carregando cronograma...</p>
    </div>

    <!-- Estado Vazio (Sem Agendamentos) -->
    <div
      v-else-if="filteredAppointments.length === 0"
      class="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto my-8 shadow-xs"
    >
      <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
        <CalendarX class="w-7 h-7" />
      </div>
      <h3 class="text-base font-bold text-slate-900 mb-1">
        Nenhum agendamento para este dia
      </h3>
      <p class="text-xs text-slate-500 leading-relaxed mb-4">
        Não há horários marcados para a data selecionada no seletor acima.
      </p>

      <!-- Sugestão de datas com agendamentos existentes -->
      <div
        v-if="appointmentStore.datesWithAppointments.length > 0"
        class="mb-6 p-4 bg-blue-50/80 border border-blue-200/80 rounded-2xl w-full text-center"
      >
        <p class="text-xs font-bold text-blue-950 mb-2">
          Existem agendamentos salvos em outras datas:
        </p>
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="d in appointmentStore.datesWithAppointments"
            :key="d.date"
            @click="appointmentStore.fetchAppointments(d.date)"
            type="button"
            class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{{ d.display }}</span>
            <span class="px-1.5 py-0.2 bg-blue-800 text-white rounded-full text-[10px] font-bold">
              {{ d.count }}
            </span>
          </button>
        </div>
      </div>

      <button
        @click="emit('open-new-appointment')"
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all"
      >
        <Plus class="w-4 h-4" />
        <span>Criar Primeiro Agendamento</span>
      </button>
    </div>

    <!-- Lista de Cards -->
    <div v-else class="space-y-3">
      <AppointmentCard
        v-for="appointment in filteredAppointments"
        :key="appointment._id"
        :appointment="appointment"
      />
    </div>
  </div>
</template>

