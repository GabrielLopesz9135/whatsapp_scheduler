<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAppointmentStore } from '@/stores/appointmentStore'
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'
import TimelineGrid from '@/components/appointments/TimelineGrid.vue'
import NewAppointmentModal from '@/components/appointments/NewAppointmentModal.vue'
import {
  Calendar,
  MessageSquare,
  Laptop,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-vue-next'

const appointmentStore = useAppointmentStore()
const isNewAppointmentModalOpen = ref(false)

onMounted(async () => {
  await appointmentStore.fetchAppointments()
})

const formattedDisplayDate = computed(() => {
  if (!appointmentStore.selectedDate) return ''
  const [y, m, d] = appointmentStore.selectedDate.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Menu Lateral Fixo -->
    <Sidebar />

    <!-- Conteúdo Principal -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Cabeçalho com Seletor de Data e Status Real-Time -->
      <Header @open-new-appointment="isNewAppointmentModalOpen = true" />

      <!-- Área de Rolagem do Dashboard -->
      <main class="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        <!-- Título da Página e Data -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-6">
          <div>
            <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
              Cronograma Diário
            </h2>
            <p class="text-xs text-slate-500 font-medium capitalize mt-0.5">
              {{ formattedDisplayDate }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200">
              <Sparkles class="w-3.5 h-3.5 text-blue-600" />
              Sincronização em Tempo Real Ativa
            </span>
          </div>
        </div>

        <!-- Atalhos rápidos para datas que possuem agendamentos no banco -->
        <div
          v-if="appointmentStore.datesWithAppointments.length > 0"
          class="flex items-center gap-2.5 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex-wrap"
        >
          <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5 pl-1">
            <Calendar class="w-4 h-4 text-blue-600" />
            <span>Dias com agendamentos salvos:</span>
          </span>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="d in appointmentStore.datesWithAppointments"
              :key="d.date"
              @click="appointmentStore.fetchAppointments(d.date)"
              type="button"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              :class="[
                appointmentStore.selectedDate === d.date
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
              ]"
            >
              <span>{{ d.display }}</span>
              <span
                class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                :class="[
                  appointmentStore.selectedDate === d.date
                    ? 'bg-blue-800 text-white'
                    : 'bg-slate-200 text-slate-600',
                ]"
              >
                {{ d.count }}
              </span>
            </button>
          </div>
        </div>

        <!-- Cards de Resumo e Métricas Rápidas -->
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Total do Dia</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1">
                {{ appointmentStore.totalAppointments }}
              </h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Agendamentos no sistema</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar class="w-6 h-6" />
            </div>
          </div>

          <!-- WhatsApp -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-emerald-600">Via WhatsApp</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1">
                {{ appointmentStore.whatsappAppointments }}
              </h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Captados pelo Bot da Meta</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageSquare class="w-6 h-6" />
            </div>
          </div>

          <!-- Manual / Dashboard -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-600">Agendamentos Manuais</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1">
                {{ appointmentStore.manualAppointments }}
              </h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Criados pelo Dashboard</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Laptop class="w-6 h-6" />
            </div>
          </div>

          <!-- Concluídos vs Pendentes -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Concluídos / Pendentes</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1">
                {{ appointmentStore.completedAppointments }}
                <span class="text-base font-semibold text-slate-400">/ {{ appointmentStore.confirmedAppointments }}</span>
              </h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Atendimentos finalizados</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 class="w-6 h-6" />
            </div>
          </div>
        </section>

        <!-- Cronograma / Linha do Tempo de Agendamentos -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock class="w-4 h-4 text-blue-600" />
              <span>Horários Agendados</span>
            </h3>
          </div>

          <TimelineGrid @open-new-appointment="isNewAppointmentModalOpen = true" />
        </section>
      </main>
    </div>

    <!-- Modal de Novo Agendamento Manual -->
    <NewAppointmentModal
      :is-open="isNewAppointmentModalOpen"
      @close="isNewAppointmentModalOpen = false"
      @created="appointmentStore.fetchAppointments()"
    />
  </div>
</template>

