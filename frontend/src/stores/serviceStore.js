import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { useToastStore } from '@/stores/toastStore'

export const useServiceStore = defineStore('service', () => {
  const services = ref([])
  const loading = ref(false)
  const error = ref(null)

  const activeServices = computed(() => services.value.filter((s) => s.active))

  /**
   * Busca todos os serviços cadastrados na API.
   */
  async function fetchServices() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/services')
      services.value = response.data
    } catch (err) {
      error.value = err.response?.data?.error || 'Erro ao carregar serviços'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Cadastra um novo serviço no sistema.
   * @param {Object} serviceData
   */
  async function createService(serviceData) {
    loading.value = true
    try {
      const response = await api.post('/services', serviceData)
      services.value.unshift(response.data)
      const toast = useToastStore()
      toast.success(`Serviço "${response.data.name}" criado com sucesso!`)
      return response.data
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao criar serviço'
      const toast = useToastStore()
      toast.error(message)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Atualiza um serviço existente.
   * @param {string} id
   * @param {Object} serviceData
   */
  async function updateService(id, serviceData) {
    loading.value = true
    try {
      const response = await api.put(`/services/${id}`, serviceData)
      const updated = response.data
      const index = services.value.findIndex((s) => s._id === id)
      if (index !== -1) {
        services.value[index] = updated
      }
      const toast = useToastStore()
      toast.success(`Serviço "${updated.name}" atualizado!`)
      return updated
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao atualizar serviço'
      const toast = useToastStore()
      toast.error(message)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Realiza soft delete (desativação) do serviço.
   * @param {string} id
   */
  async function deleteService(id) {
    try {
      const response = await api.delete(`/services/${id}`)
      const index = services.value.findIndex((s) => s._id === id)
      if (index !== -1) {
        services.value[index] = response.data.service
      }
      const toast = useToastStore()
      toast.info('Serviço desativado com sucesso.')
      return response.data
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao desativar serviço'
      const toast = useToastStore()
      toast.error(message)
      throw err
    }
  }

  return {
    services,
    activeServices,
    loading,
    error,
    fetchServices,
    createService,
    updateService,
    deleteService,
  }
})

