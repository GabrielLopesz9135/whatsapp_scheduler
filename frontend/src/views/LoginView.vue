<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import {
  MessageSquare,
  Lock,
  Mail,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('admin@scheduler.com')
const password = ref('admin123')
const loading = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  errorMessage.value = ''
  loading.value = true

  try {
    await authStore.login(email.value.trim(), password.value)
    router.push('/')
  } catch (err) {
    errorMessage.value =
      err.response?.data?.error || 'Falha ao autenticar. Verifique o e-mail e a senha.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
    <!-- Efeito de Luz / Gradiente de Fundo -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
      <!-- Ícone e Título -->
      <div class="flex justify-center mb-3">
        <div
          class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25"
        >
          <MessageSquare class="w-7 h-7" />
        </div>
      </div>

      <h2 class="text-center text-2xl font-extrabold text-white tracking-tight">
        Painel Administrativo
      </h2>
      <p class="mt-1 text-center text-xs text-slate-400">
        Gerenciamento de Agendamentos & WhatsApp Cloud API em Tempo Real
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
      <div class="bg-slate-800/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-700/80">
        <!-- Alerta de Erro -->
        <div
          v-if="errorMessage"
          class="mb-6 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium"
        >
          {{ errorMessage }}
        </div>

        <form class="space-y-5" @submit.prevent="handleLogin">
          <!-- Campo E-mail -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              E-mail do Administrador
            </label>
            <div class="relative">
              <Mail class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                v-model="email"
                type="email"
                required
                autocomplete="email"
                placeholder="admin@scheduler.com"
                class="w-full pl-10 pr-3.5 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <!-- Campo Senha -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Senha
            </label>
            <div class="relative">
              <Lock class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                v-model="password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full pl-10 pr-3.5 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <!-- Botão Entrar -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            <template v-else>
              <span>Acessar Dashboard</span>
              <ArrowRight class="w-4 h-4" />
            </template>
          </button>
        </form>

        <!-- Dica de Credenciais do Seed -->
        <div class="mt-6 pt-5 border-t border-slate-700/60 text-center">
          <p class="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck class="w-3.5 h-3.5 text-emerald-400" />
            Acesso padrão do seed: <span class="font-mono text-slate-300">admin@scheduler.com</span> / <span class="font-mono text-slate-300">admin123</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

