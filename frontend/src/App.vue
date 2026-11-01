<script setup>
import ToastContainer from '@/components/ui/ToastContainer.vue'
</script>

<template>
  <div id="root" class="min-h-screen bg-slate-50 text-slate-800">
    <router-view />
    <ToastContainer />
  </div>
</template>
