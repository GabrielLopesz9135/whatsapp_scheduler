<script setup>
import { ref, onMounted, computed } from 'vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import api from '@/services/api'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  MessageSquare,
  Clock,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Award,
  Layers,
} from 'lucide-vue-next'

const loading = ref(false)
const selectedFilterType = ref('all') // 'all' | 'today' | 'custom'
const customDate = ref(new Date().toISOString().substring(0, 10))

const metrics = ref({
  totals: {
    totalAppointments: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
    activeCount: 0,
  },
  financial: {
    totalRevenue: 0,
    averageTicket: 0,
  },
  channel: {
    whatsapp: 0,
    dashboard: 0,
    whatsappRate: 0,
  },
  efficiency: {
    occupancyRate: 0,
    cancellationRate: 0,
    totalOccupiedMinutes: 0,
  },
  topServices: [],
})

async function fetchMetrics() {
  loading.value = true
  try {
    const params = {}

    if (selectedFilterType.value === 'today') {
      params.date = new Date().toISOString().substring(0, 10)
    } else if (selectedFilterType.value === 'custom') {
      params.date = customDate.value
    }

    const response = await api.get('/appointments/metrics', { params })
    metrics.value = response.data
  } catch (error) {
    console.error('Falha ao carregar métricas:', error)
  } finally {
    loading.value = false
  }
}

function selectFilter(type) {
  selectedFilterType.value = type
  fetchMetrics()
}

function onCustomDateChange(e) {
  customDate.value = e.target.value
  selectedFilterType.value = 'custom'
  fetchMetrics()
}

onMounted(() => {
  fetchMetrics()
})

function formatCurrency(val) {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formattedMinutes = computed(() => {
  const mins = metrics.value?.efficiency?.totalOccupiedMinutes || 0
  const hours = Math.floor(mins / 60)
  const remaining = mins % 60
  if (hours === 0) return `${remaining} min`
  return `${hours}h ${remaining > 0 ? remaining + 'min' : ''}`
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Menu Lateral Fixo -->
    <Sidebar />

    <!-- Conteúdo Principal -->
    <div class="flex-1 flex flex-col min-w-0">
      <header
        class="bg-white border-b border-slate-200/80 px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-30 shadow-xs"
      >
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 class="w-6 h-6 text-blue-600" />
              Métricas & Indicadores de Performance
            </h1>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Ao Vivo
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            Indicadores executivos, faturamento e eficiência de automação do negócio
          </p>
        </div>

        <!-- Filtros Rápidos de Período -->
        <div class="flex items-center flex-wrap gap-2">
          <div class="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs font-medium">
            <button
              @click="selectFilter('all')"
              type="button"
              class="px-3 py-1.5 rounded-lg transition-all"
              :class="selectedFilterType === 'all' ? 'bg-white text-blue-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            >
              Histórico Geral
            </button>
            <button
              @click="selectFilter('today')"
              type="button"
              class="px-3 py-1.5 rounded-lg transition-all"
              :class="selectedFilterType === 'today' ? 'bg-white text-blue-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            >
              Hoje
            </button>
          </div>

          <input
            type="date"
            :value="customDate"
            @change="onCustomDateChange"
            class="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
          />

          <button
            @click="fetchMetrics"
            :disabled="loading"
            type="button"
            title="Atualizar dados"
            class="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </header>

      <!-- Painel de Métricas -->
      <main class="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        <!-- 4 Cards Principais (KPIs) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <!-- Card 1: Faturamento Estimado -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Faturamento Estimado
              </span>
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                <DollarSign class="w-5 h-5" />
              </div>
            </div>
            <div class="space-y-1">
              <p class="text-2xl font-black text-slate-900 tracking-tight">
                {{ formatCurrency(metrics.financial.totalRevenue) }}
              </p>
              <p class="text-xs text-slate-500 flex items-center gap-1">
                <span>Ticket Médio:</span>
                <strong class="text-slate-700 font-bold">{{ formatCurrency(metrics.financial.averageTicket) }}</strong>
              </p>
            </div>
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
          </div>

          <!-- Card 2: Total de Consultas -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Consultas no Período
              </span>
              <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                <Calendar class="w-5 h-5" />
              </div>
            </div>
            <div class="space-y-1">
              <p class="text-2xl font-black text-slate-900 tracking-tight">
                {{ metrics.totals.totalAppointments }}
                <span class="text-sm font-semibold text-slate-400">agendamentos</span>
              </p>
              <p class="text-xs text-slate-500 flex items-center gap-2">
                <span class="text-emerald-600 font-semibold flex items-center gap-0.5">
                  <CheckCircle2 class="w-3.5 h-3.5" /> {{ metrics.totals.confirmed }} confirmados
                </span>
                <span v-if="metrics.totals.cancelled > 0" class="text-rose-500 font-semibold flex items-center gap-0.5">
                  <XCircle class="w-3.5 h-3.5" /> {{ metrics.totals.cancelled }} cancelados
                </span>
              </p>
            </div>
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-500"></div>
          </div>

          <!-- Card 3: Automação WhatsApp -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Automação WhatsApp
              </span>
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                <MessageSquare class="w-5 h-5" />
              </div>
            </div>
            <div class="space-y-1">
              <p class="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
                {{ metrics.channel.whatsappRate }}%
                <span class="text-xs font-medium text-emerald-600 font-sans">pelo Bot Meta</span>
              </p>
              <p class="text-xs text-slate-500">
                <strong class="text-slate-800">{{ metrics.channel.whatsapp }}</strong> via WhatsApp •
                <strong class="text-slate-800">{{ metrics.channel.dashboard }}</strong> manual
              </p>
            </div>
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-green-600"></div>
          </div>

          <!-- Card 4: Taxa de Ocupação -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ocupação da Agenda
              </span>
              <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform">
                <Clock class="w-5 h-5" />
              </div>
            </div>
            <div class="space-y-1">
              <p class="text-2xl font-black text-slate-900 tracking-tight">
                {{ metrics.efficiency.occupancyRate }}%
                <span class="text-xs font-medium text-slate-400">da grade</span>
              </p>
              <p class="text-xs text-slate-500">
                <strong class="text-slate-800">{{ formattedMinutes }}</strong> em atendimento
              </p>
            </div>
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
          </div>
        </div>

        <!-- Seção de Canais e Eficiência -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Canal de Agendamento: WhatsApp vs Recepção -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-blue-600" />
              Canal de Aquisição de Clientes
            </h3>

            <div class="space-y-4">
              <div>
                <div class="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
                  <span class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    WhatsApp Cloud API (Bot Automatizado)
                  </span>
                  <strong>{{ metrics.channel.whatsapp }} agendamentos ({{ metrics.channel.whatsappRate }}%)</strong>
                </div>
                <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                    :style="{ width: `${metrics.channel.whatsappRate}%` }"
                  ></div>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
                  <span class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    Recepção / Dashboard Manual
                  </span>
                  <strong>{{ metrics.channel.dashboard }} agendamentos ({{ 100 - metrics.channel.whatsappRate }}%)</strong>
                </div>
                <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                    :style="{ width: `${100 - metrics.channel.whatsappRate}%` }"
                  ></div>
                </div>
              </div>

              <div class="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
                <Sparkles class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  O bot do WhatsApp reduziu o trabalho manual da recepção em <strong>{{ metrics.channel.whatsappRate }}%</strong> dos agendamentos no período selecionado.
                </span>
              </div>
            </div>
          </div>

          <!-- Eficiência Operacional e Status -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layers class="w-4 h-4 text-blue-600" />
              Taxa de Efetivação vs Cancelamentos
            </h3>

            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span class="text-xs font-semibold text-emerald-800">Efetivação</span>
                <p class="text-2xl font-black text-emerald-700 mt-1">
                  {{ metrics.totals.totalAppointments > 0 ? Math.round((metrics.totals.activeCount / metrics.totals.totalAppointments) * 100) : 100 }}%
                </p>
                <span class="text-[11px] text-emerald-600 mt-0.5 block">
                  {{ metrics.totals.activeCount }} clientes atendidos/confirmados
                </span>
              </div>

              <div class="p-4 rounded-xl bg-rose-50/60 border border-rose-100">
                <span class="text-xs font-semibold text-rose-800">Taxa de Cancelamento</span>
                <p class="text-2xl font-black text-rose-700 mt-1">
                  {{ metrics.efficiency.cancellationRate }}%
                </p>
                <span class="text-[11px] text-rose-600 mt-0.5 block">
                  {{ metrics.totals.cancelled }} desistências registradas
                </span>
              </div>
            </div>

            <div class="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <p class="font-medium text-slate-800 mb-0.5">Expediente de Atendimento Base:</p>
              <span>09:00 às 18:00 (Segunda a Sábado) com intervalos de 30 minutos por slot.</span>
            </div>
          </div>
        </div>

        <!-- Ranking dos Serviços Mais Populares e Lucrativos -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award class="w-5 h-5 text-amber-500" />
                Serviços Mais Realizados / Populares
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Classificação por volume de agendamentos e faturamento gerado para o estabelecimento
              </p>
            </div>
          </div>

          <div v-if="metrics.topServices.length === 0" class="text-center py-8 text-slate-400 text-xs">
            Nenhum serviço agendado para o período selecionado.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th class="pb-3 pl-2">Serviço</th>
                  <th class="pb-3 text-center">Agendamentos</th>
                  <th class="pb-3 text-right">Faturamento Gerado</th>
                  <th class="pb-3 text-right pr-2">Participação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="(service, idx) in metrics.topServices"
                  :key="service.name"
                  class="hover:bg-slate-50/70 transition-colors"
                >
                  <td class="py-3 pl-2 font-semibold text-slate-800 flex items-center gap-2">
                    <span
                      class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]"
                      :class="[
                        idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-500'
                      ]"
                    >
                      {{ idx + 1 }}
                    </span>
                    {{ service.name }}
                  </td>
                  <td class="py-3 text-center font-bold text-slate-700">
                    {{ service.count }}
                  </td>
                  <td class="py-3 text-right font-black text-slate-900">
                    {{ formatCurrency(service.revenue) }}
                  </td>
                  <td class="py-3 text-right pr-2 font-medium text-slate-500">
                    {{ metrics.financial.totalRevenue > 0 ? Math.round((service.revenue / metrics.financial.totalRevenue) * 100) : 0 }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

