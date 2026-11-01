import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { socket } from '@/services/socket'
import { useToastStore } from '@/stores/toastStore'

/**
 * Retorna a data atual no formato YYYY-MM-DD considerando a timezone local.
 * @returns {string}
 */
export function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formata um Date ou string ISO para "HH:mm".
 * @param {string|Date} dateVal
 * @returns {string}
 */
export function formatTimeHHmm(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  return d.toISOString().substring(11, 16)
}

/**
 * Converte data YYYY-MM-DD para DD/MM/YYYY.
 * @param {string} dateString
 * @returns {string}
 */
export function formatDateBR(dateString) {
  if (!dateString) return ''
  const [y, m, d] = dateString.split('-')
  return `${d}/${m}/${y}`
}

export const useAppointmentStore = defineStore('appointment', () => {
  const selectedDate = ref(getTodayDateString())
  const appointments = ref([])
  const allAppointments = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Conjunto de IDs de agendamentos recém-chegados para animação de highlight
  const newlyCreatedIds = ref(new Set())

  let listenersAttached = false

  // Métricas computadas em tempo real para o dia selecionado
  const totalAppointments = computed(() => appointments.value.length)
  const whatsappAppointments = computed(
    () => appointments.value.filter((a) => a.origin === 'WHATSAPP').length
  )
  const manualAppointments = computed(
    () => appointments.value.filter((a) => a.origin === 'DASHBOARD').length
  )
  const completedAppointments = computed(
    () => appointments.value.filter((a) => a.status === 'COMPLETED').length
  )
  const confirmedAppointments = computed(
    () => appointments.value.filter((a) => a.status === 'CONFIRMED').length
  )
  const cancelledAppointments = computed(
    () => appointments.value.filter((a) => a.status === 'CANCELLED').length
  )

  // Lista de outras datas que possuem agendamentos salvos no banco
  const datesWithAppointments = computed(() => {
    const map = {}
    for (const a of allAppointments.value) {
      if (a.date) {
        map[a.date] = (map[a.date] || 0) + 1
      }
    }
    return Object.entries(map)
      .map(([date, count]) => ({
        date,
        count,
        display: formatDateBR(date),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  })

  /**
   * Ordena a lista de agendamentos pelo startTime cronologicamente.
   */
  function sortAppointments() {
    appointments.value.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  }

  /**
   * Busca todos os agendamentos cadastrados (visão geral para calendário).
   */
  async function fetchAllAppointments() {
    try {
      const response = await api.get('/appointments')
      allAppointments.value = response.data || []
    } catch (err) {
      console.warn('⚠️ [Store] Erro ao carregar agendamentos gerais:', err.message)
    }
  }

  /**
   * Busca os agendamentos da data selecionada na API.
   * @param {string} [date] - YYYY-MM-DD
   */
  async function fetchAppointments(date) {
    if (date) {
      selectedDate.value = date
    }

    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/appointments?date=${selectedDate.value}`)
      appointments.value = response.data || []
      sortAppointments()
      // Atualiza também a lista geral de datas com agendamentos
      fetchAllAppointments()
    } catch (err) {
      error.value = err.response?.data?.error || 'Erro ao carregar agendamentos'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Cria um novo agendamento manual via Dashboard.
   * @param {Object} payload
   */
  async function createAppointment(payload) {
    loading.value = true
    try {
      const response = await api.post('/appointments', payload)
      const toast = useToastStore()
      toast.success('Agendamento manual criado com sucesso!')
      fetchAllAppointments()
      return response.data
    } catch (err) {
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Consulta slots livres para uma data e serviço.
   * @param {string} date
   * @param {string} serviceId
   */
  async function fetchAvailableSlots(date, serviceId) {
    const response = await api.get(
      `/appointments/available-slots?date=${date}&serviceId=${serviceId}`
    )
    return response.data.availableSlots || []
  }

  /**
   * Atualiza o status de um agendamento existente.
   * @param {string} id
   * @param {'CONFIRMED'|'CANCELLED'|'COMPLETED'} status
   */
  async function updateStatus(id, status) {
    try {
      const response = await api.patch(`/appointments/${id}/status`, { status })
      const toast = useToastStore()

      if (status === 'COMPLETED') {
        toast.success('Agendamento marcado como concluído!')
      } else if (status === 'CANCELLED') {
        toast.info('Agendamento cancelado.')
      }

      fetchAllAppointments()
      return response.data
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao atualizar status'
      const toast = useToastStore()
      toast.error(message)
      throw err
    }
  }

  /**
   * Inicializa os listeners do Socket.io para tempo real.
   */
  function initSocketListeners() {
    if (listenersAttached) return
    listenersAttached = true

    console.log('⚡ [Real-Time] Registrando ouvintes de eventos de agendamento...')

    // Evento 1: Novo Agendamento Criado
    socket.on('appointment:created', (newAppointment) => {
      console.log('⚡ [Real-Time] Evento appointment:created recebido:', newAppointment)
      const toast = useToastStore()

      const timeFormatted = formatTimeHHmm(newAppointment.startTime)
      const serviceName = newAppointment.serviceId?.name || 'Serviço'

      if (newAppointment.origin === 'WHATSAPP') {
        toast.whatsapp(
          `${newAppointment.customerName} às ${timeFormatted} (${serviceName})`,
          'Novo Agendamento via WhatsApp!'
        )
      } else {
        toast.info(`Novo agendamento criado: ${newAppointment.customerName} às ${timeFormatted}`)
      }

      // Atualiza a lista geral
      allAppointments.value.push(newAppointment)

      // Se o agendamento for para o dia exibido no momento, insere e anima
      if (newAppointment.date === selectedDate.value) {
        const exists = appointments.value.some((a) => a._id === newAppointment._id)
        if (!exists) {
          appointments.value.push(newAppointment)
          sortAppointments()

          newlyCreatedIds.value.add(newAppointment._id)
          setTimeout(() => {
            newlyCreatedIds.value.delete(newAppointment._id)
          }, 4000)
        }
      }
    })

    // Evento 2: Agendamento Atualizado
    socket.on('appointment:updated', (updatedAppointment) => {
      console.log('⚡ [Real-Time] Evento appointment:updated recebido:', updatedAppointment)
      const index = appointments.value.findIndex((a) => a._id === updatedAppointment._id)
      if (index !== -1) {
        appointments.value[index] = updatedAppointment
        sortAppointments()
      }
      const allIndex = allAppointments.value.findIndex((a) => a._id === updatedAppointment._id)
      if (allIndex !== -1) {
        allAppointments.value[allIndex] = updatedAppointment
      }
    })

    // Evento 3: Agendamento Cancelado
    socket.on('appointment:cancelled', ({ id }) => {
      console.log('⚡ [Real-Time] Evento appointment:cancelled recebido para ID:', id)
      const appointment = appointments.value.find((a) => a._id === id)
      if (appointment) {
        appointment.status = 'CANCELLED'
      }
      const allApp = allAppointments.value.find((a) => a._id === id)
      if (allApp) {
        allApp.status = 'CANCELLED'
      }
    })
  }

  return {
    selectedDate,
    appointments,
    allAppointments,
    datesWithAppointments,
    loading,
    error,
    newlyCreatedIds,
    totalAppointments,
    whatsappAppointments,
    manualAppointments,
    completedAppointments,
    confirmedAppointments,
    cancelledAppointments,
    fetchAppointments,
    fetchAllAppointments,
    createAppointment,
    fetchAvailableSlots,
    updateStatus,
    initSocketListeners,
  }
})
