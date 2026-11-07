<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import {
  Calendar,
  ClipboardList,
  BarChart3,
  LogOut,
  MessageSquare,
  ShieldCheck,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentPath = computed(() => route.path)

const navigation = [
  {
    name: 'Agenda do Dia',
    path: '/',
    icon: Calendar,
  },
  {
    name: 'Serviços & Procedimentos',
    path: '/services',
    icon: ClipboardList,
  },
  {
    name: 'Métricas & Indicadores',
    path: '/metrics',
    icon: BarChart3,
  },
]

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <aside
    class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-screen text-slate-300 transition-all select-none"
  >
    <!-- Topo: Marca / Logo -->
    <div>
      <div class="p-6 border-b border-slate-800/80 flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20"
        >
          <MessageSquare class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            AutoScheduler
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          </h1>
          <p class="text-[11px] font-medium text-slate-400">WhatsApp & Real-Time</p>
        </div>
      </div>

      <!-- Navegação Principal -->
      <nav class="p-4 space-y-1.5">
        <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Menu Principal
        </p>

        <router-link
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group"
          :class="[
            currentPath === item.path
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/70',
          ]"
        >
          <component
            :is="item.icon"
            class="w-4 h-4 transition-transform group-hover:scale-110"
            :class="currentPath === item.path ? 'text-white' : 'text-slate-400 group-hover:text-white'"
          />
          <span>{{ item.name }}</span>
        </router-link>
      </nav>
    </div>

    <!-- Rodapé da Sidebar: Usuário & Sair -->
    <div class="p-4 border-t border-slate-800/80 bg-slate-950/40">
      <div class="flex items-center justify-between mb-3 px-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs"
          >
            <ShieldCheck class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-white truncate">
              {{ authStore.user?.name || 'Administrador' }}
            </p>
            <p class="text-[11px] text-slate-400 truncate">
              {{ authStore.user?.email || 'admin@scheduler.com' }}
            </p>
          </div>
        </div>
      </div>

      <button
        @click="handleLogout"
        type="button"
        class="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
      >
        <LogOut class="w-4 h-4" />
        <span>Encerrar Sessão</span>
      </button>
    </div>
  </aside>
</template>

