# 🦷 AutoScheduler — Front-end Dashboard Administrativo (Vue 3 + Vite)

<div align="center">

[![CI/CD Pipeline](https://github.com/GabrielLopesz9135/whatsapp_scheduler/actions/workflows/ci.yml/badge.svg)](https://github.com/GabrielLopesz9135/whatsapp_scheduler/actions/workflows/ci.yml)
![Vue.js](https://img.shields.io/badge/Vue.js-3.5-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Pinia](https://img.shields.io/badge/Pinia-4.1-FFD859?style=for-the-badge&logo=vuedotjs&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Socket.io Client](https://img.shields.io/badge/Socket.io_Client-4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Lucide Icons](https://img.shields.io/badge/Lucide_Icons-1.0-F56565?style=for-the-badge&logo=feather&logoColor=white)

<br />

**Dashboard Single Page Application (SPA) reativo para gestão de agendamentos em tempo real, sincronizado via WebSockets com o fluxo oficial da WhatsApp Cloud API (Meta).**

</div>

---

## 📌 Visão Geral da Interface

O **Front-end do AutoScheduler** foi desenvolvido com as práticas mais modernas do ecossistema **Vue 3**, proporcionando uma experiência de recepção clínica instantânea:

- **Sincronização em Tempo Real (WebSockets):** Conexão persistente com o back-end via `socket.io-client`. Qualquer agendamento realizado ou cancelado pelo cliente no WhatsApp surge na tela imediatamente sem requisições periódicas (*polling*) ou recarregamento (*F5*).
- **Feedback Visual e Sonoro:** Sistema integrado de notificações *Toast* que alerta o operador no canto superior da tela com detalhes da ação (`🎉 Novo Agendamento pelo WhatsApp!` ou `⚠️ Agendamento Cancelado`).
- **Seletor Global de Datas:** Navegação intuitiva entre dias anteriores, dia atual (*Hoje*) e dias futuros, com atalhos inteligentes que destacam dias com agendamentos cadastrados.
- **Linha do Tempo Visual (Timeline Grid):** Grade visual baseada nos horários de funcionamento do consultório (09:00 às 18:00), identificando slots livres, ocupados, duração do procedimento e origem do agendamento (WhatsApp ou Manual).
- **Gestão de Procedimentos Odontológicos:** Painel dedicado para criação, edição e inativação de procedimentos com cálculo dinâmico de duração (30m ou 60m) e precificação.

---

## 🏛 Arquitetura do Front-end

A estrutura do projeto segue os princípios de separação de responsabilidades e componentização atômica:

```text
frontend/src/
├── assets/
│   └── main.css               # Diretivas do Tailwind CSS e estilos globais
├── components/
│   ├── appointments/
│   │   ├── TimelineGrid.vue       # Grade de horários do dia selecionado com status em tempo real
│   │   └── NewAppointmentModal.vue# Modal para inserção manual de agendamento na recepção
│   ├── layout/
│   │   ├── Header.vue             # Barra superior com seletor de data e indicador "Ao Vivo"
│   │   └── Sidebar.vue            # Menu lateral persistente com perfil autenticado
│   └── services/
│       └── ServiceModal.vue       # Modal de cadastro/edição de procedimentos e preços
├── router/
│   └── index.js                   # Rotas da SPA com Navigation Guards para proteção JWT
├── services/
│   ├── api.js                     # Instância Axios com Interceptors de Bearer Token e erro 401
│   └── socket.js                  # Conexão singleton com Socket.io e reconexão automática
├── stores/
│   ├── appointmentStore.js        # Estado reativo dos agendamentos do dia e listeners do Socket
│   ├── authStore.js               # Gestão de token JWT, dados do profissional e logout
│   └── serviceStore.js            # Estado da lista de procedimentos e ações CRUD
├── views/
│   ├── DashboardView.vue          # Visão geral da agenda diária e métricas rápidas
│   ├── LoginView.vue              # Tela de autenticação segura do profissional
│   └── ServicesView.vue           # Catálogo de procedimentos com busca e filtros
├── App.vue                        # Shell da aplicação com container global de Toasts
└── main.js                        # Inicialização do Vue 3, Pinia e Vue Router
```

---

## ⚡ Destaques Técnicos

### 1. Reatividade e Estado com Pinia
- Separação em stores independentes: `useAuthStore`, `useAppointmentStore` e `useServiceStore`.
- A store de agendamentos (`appointmentStore`) atua como ouvinte dos eventos do Socket.io:
  ```javascript
  socket.on('appointment:created', (newAppointment) => {
    // Insere o novo agendamento reativamente se pertencer à data exibida
    if (newAppointment.date === selectedDate.value) {
      appointments.value.push(newAppointment);
      sortAppointments();
    }
    // Dispara notificação visual na tela
    showToast(`Novo agendamento: ${newAppointment.customerName}`, 'success');
  });
  ```

### 2. Comunicação HTTP Resiliente (Axios Interceptors)
- Anexa automaticamente o cabeçalho `Authorization: Bearer <token>` em todas as requisições autenticadas.
- Intercepta respostas com status `401 Unauthorized` (token expirado ou inválido) e redireciona o usuário de forma limpa para a tela de login, limpando o `localStorage`.

### 3. Design System com Tailwind CSS
- Paleta profissional em tons sóbrios (**Slate 900 / Blue 900**) para alta legibilidade clínica.
- Layout 100% responsivo para desktops, tablets e smartphones.
- Microinterações com transições suaves e badges de status contextuais.

---

## 🚀 Como Executar o Front-end

### 1. Instalar as Dependências

```bash
npm install
```

### 2. Iniciar o Servidor de Desenvolvimento (Vite)

```bash
npm run dev
```

A aplicação estará acessível em: **`http://localhost:5173`**

### 3. Credenciais Padrão de Acesso

- **E-mail:** `admin@scheduler.com`
- **Senha:** `admin123`

### 4. Build para Produção

```bash
npm run build
```

Gera os assets otimizados para deploy em `/dist` com *treeshaking*, minificação e *code-splitting*.

---

## 🔗 Integração com o Back-end

O front-end se comunica com a API REST e com o servidor WebSocket rodando por padrão em `http://localhost:3333`.  
Para a documentação completa da arquitetura do servidor, modelo do banco e webhook oficial da Meta, consulte o [README principal da raiz do projeto](../README.md).
