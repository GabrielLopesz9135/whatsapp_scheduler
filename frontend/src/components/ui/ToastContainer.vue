<script setup>
import { useToastStore } from '@/stores/toastStore'
import {
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  MessageSquare,
} from 'lucide-vue-next'

const toastStore = useToastStore()
</script>

<template>
  <div
    class="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="pointer-events-auto rounded-xl p-4 shadow-xl border backdrop-blur-md transition-all flex items-start gap-3.5"
        :class="{
          'bg-white/95 border-emerald-200 text-slate-800 shadow-emerald-500/10':
            toast.type === 'success',
          'bg-white/95 border-rose-200 text-slate-800 shadow-rose-500/10':
            toast.type === 'error',
          'bg-white/95 border-blue-200 text-slate-800 shadow-blue-500/10':
            toast.type === 'info',
          'bg-slate-900 border-emerald-500/50 text-white shadow-2xl ring-2 ring-emerald-500/20':
            toast.type === 'whatsapp',
        }"
      >
        <!-- Ícone do Toast -->
        <div class="mt-0.5 shrink-0">
          <div
            v-if="toast.type === 'whatsapp'"
            class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse"
          >
            <MessageSquare class="w-4 h-4" />
          </div>
          <CheckCircle2
            v-else-if="toast.type === 'success'"
            class="w-5 h-5 text-emerald-600"
          />
          <AlertCircle
            v-else-if="toast.type === 'error'"
            class="w-5 h-5 text-rose-600"
          />
          <Info v-else class="w-5 h-5 text-blue-600" />
        </div>

        <!-- Conteúdo -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h4
              class="text-sm font-semibold truncate"
              :class="toast.type === 'whatsapp' ? 'text-white' : 'text-slate-900'"
            >
              {{ toast.title }}
            </h4>
            <span
              v-if="toast.type === 'whatsapp'"
              class="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500 text-slate-950"
            >
              Real-Time
            </span>
          </div>
          <p
            class="text-xs mt-0.5 leading-relaxed"
            :class="toast.type === 'whatsapp' ? 'text-slate-300' : 'text-slate-600'"
          >
            {{ toast.message }}
          </p>
        </div>

        <!-- Botão Fechar -->
        <button
          @click="toastStore.removeToast(toast.id)"
          type="button"
          class="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          :class="{ 'hover:bg-slate-800 hover:text-white': toast.type === 'whatsapp' }"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

