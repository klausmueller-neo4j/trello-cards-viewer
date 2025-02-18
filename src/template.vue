<template>
  <v-app>
    <v-container>
      <!-- Member selection row -->
      <v-row>
        <v-col cols="12" md="5" offset-md="3">
          <v-select 
            v-model="selectedMember" 
            :items="members" 
            item-text="fullName"
            return-object
            label="Select Member"
            @change="onMemberChange"
            outlined dense>
          </v-select>
        </v-col>
      </v-row>

      <!-- Search input row -->
      <v-row>
        <v-col cols="12" md="5" offset-md="3">
          <v-text-field
            v-model="searchQuery"
            label="Search by title or description"
            outlined
            dense
          ></v-text-field>
        </v-col>
      </v-row>

      <!-- Main Card Section -->
      <v-card class="pa-2" outlined>
        <v-card-title class="title-large">Trello Card Tracking</v-card-title>
        <v-card-text>
          <v-progress-linear 
            v-if="loading" 
            indeterminate 
            color="primary" 
            class="mb-3">
          </v-progress-linear>
          <v-alert v-if="error" type="error" outlined>
            {{ error }}
          </v-alert>
          <v-row v-if="filteredActions.length" dense>
            <v-col 
              v-for="(action, index) in filteredActions" 
              :key="index" 
              cols="12" md="6">
              <v-card 
                outlined 
                class="equal-cards card-title-wrap" 
                :class="getCardStatus(action.data.card.id)">
                <v-card-title class="card-title-wrap">
                  <div v-if="cardDetailsMap[action.data.card.id]">
                    <strong>{{ cardDetailsMap[action.data.card.id].name }}</strong>
                  </div>
                </v-card-title>
                <v-expand-transition>
                  <v-card-text v-if="expanded[index]">
                    <div>
                      <strong>Creation Date:</strong>
                      {{ formatDate(action.date) }}
                    </div>
                    <div>
                      <strong>Board:</strong>
                      {{ action.data.board.name }}
                    </div>
                    <div v-if="cardDetailsMap[action.data.card.id]">
                      <div>
                        <strong>Description:</strong>
                        {{ cardDetailsMap[action.data.card.id].desc }}
                      </div>
                      <div>
                        <strong>Date Last Activity:</strong>
                        {{ formatDate(cardDetailsMap[action.data.card.id].dateLastActivity) }}
                      </div>
                    </div>
                    <div>
                      <a 
                        :href="'https://trello.com/c/' + action.data.card.shortLink" 
                        target="_blank">
                        Trello Link
                      </a>
                    </div>
                  </v-card-text>
                </v-expand-transition>
                <v-card-actions class="justify-center">
                  <v-btn text @click="toggle(index)">
                    {{ expanded[index] ? 'Hide Details' : 'Show Details' }}
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
          <div v-else-if="!loading">No actions found.</div>
        </v-card-text>
      </v-card>
    </v-container>
  </v-app>
</template>

<script>
import { ref, onMounted, computed } from 'vue'

export default {
  name: 'App',
  setup() {
    // Get credentials and board ID from environment variables.
    const API_KEY = import.meta.env.VITE_TRELLO_API_KEY
    const TOKEN = import.meta.env.VITE_TRELLO_TOKEN
    const boardId = import.meta.env.VITE_TRELLO_BOARD_ID

    const actions = ref([])
    const loading = ref(true)
    const error = ref(null)
    const expanded = ref([])
    const cardDetailsMap = ref({})
    const members = ref([])
    const selectedMember = ref({})

    // New reactive variable for search query.
    const searchQuery = ref('')

    // Helper: group an array into chunks.
    function groupArray(array, chunkSize) {
      const groups = []
      for (let i = 0; i < array.length; i += chunkSize) {
        groups.push(array.slice(i, i + chunkSize))
      }
      return groups
    }

    // Batch fetch card details.
    async function fetchCardDetails(cardIds) {
      const groups = groupArray(cardIds, 10)
      const detailsMap = {}
      for (const group of groups) {
        const endpoints = group.map(id => `/cards/${id}`)
        const urlsParam = endpoints.join(',')
        const batchUrl = `https://api.trello.com/1/batch?urls=${encodeURIComponent(urlsParam)}&key=${API_KEY}&token=${TOKEN}`
        console.log(batchUrl)
        const response = await fetch(batchUrl)
        if (!response.ok) {
          console.error('Error fetching card details for group', group)
          continue
        }
        const batchData = await response.json()
        batchData.forEach(result => {
          const cardData = result['200'] || result
          if (cardData && cardData.id) {
            detailsMap[cardData.id] = cardData
          }
        })
      }
      return detailsMap
    }

    // Fetch actions and then fetch card details.
    async function fetchActionsAndCardDetails() {
      try {
        // Use selectedMember.value.username
        const actionsUrl = `https://api.trello.com/1/members/${selectedMember.value.username}/actions?filter=createCard,copyCard&key=${API_KEY}&token=${TOKEN}`
        const response = await fetch(actionsUrl)
        if (!response.ok) {
          throw new Error('Error fetching actions')
        }
        const actionsData = await response.json()
        actions.value = actionsData
        expanded.value = Array(actionsData.length).fill(false)
        const cardIds = [
          ...new Set(actionsData.map(action => action.data.card.id))
        ]
        cardDetailsMap.value = await fetchCardDetails(cardIds)
      } catch (err) {
        error.value = err.message || 'Unknown error'
      } finally {
        loading.value = false
      }
    }

    // Computed property: sort actions by dateLastActivity.
    const sortedActions = computed(() => {
      return actions.value.slice().sort((a, b) => {
        const cardA = cardDetailsMap.value[a.data.card.id]
        const cardB = cardDetailsMap.value[b.data.card.id]
        if (cardA && cardB && cardA.dateLastActivity && cardB.dateLastActivity) {
          return new Date(cardB.dateLastActivity) - new Date(cardA.dateLastActivity)
        }
        return 0
      })
    })

    // New computed property: filter sortedActions based on searchQuery.
    const filteredActions = computed(() => {
      if (!searchQuery.value) {
        return sortedActions.value
      }
      const query = searchQuery.value.toLowerCase()
      return sortedActions.value.filter(action => {
        const card = cardDetailsMap.value[action.data.card.id]
        if (!card) return false
        // Check if the card's name or description includes the search query.
        const name = card.name ? card.name.toLowerCase() : ''
        const desc = card.desc ? card.desc.toLowerCase() : ''
        return name.includes(query) || desc.includes(query)
      })
    })

    // Format date strings.
    const formatDate = dateString => {
      const date = new Date(dateString)
      return date.toLocaleString()
    }

    // Toggle the expanded state for a given card.
    const toggle = index => {
      expanded.value[index] = !expanded.value[index]
    }

    // Determine the CSS class based on card closed status.
    const getCardStatus = cardId => {
      const card = cardDetailsMap.value[cardId]
      if (card) {
        return card.closed ? 'closed-card' : 'open-card'
      }
      return ''
    }

    // Fetch members for the board.
    async function fetchMembers() {
      try {
        const membersUrl = `https://api.trello.com/1/boards/${boardId}/members?key=${API_KEY}&token=${TOKEN}`
        const response = await fetch(membersUrl)
        if (!response.ok) {
          throw new Error('Error fetching members')
        }
        const membersData = await response.json()
        members.value = membersData
        console.log('Members:', members.value)
        if (membersData.length > 0) {
          selectedMember.value = membersData[0]
          fetchActionsAndCardDetails()
        }
      } catch (err) {
        error.value = err.message || 'Unknown error'
      }
    }

    // Delay API calls until after the user has finalized their selection.
    let fetchTimeout = null
    function onMemberChange() {
      if (fetchTimeout) {
        clearTimeout(fetchTimeout)
      }
      fetchTimeout = setTimeout(() => {
        fetchActionsAndCardDetails()
      }, 300)
    }

    onMounted(() => {
      fetchMembers()
    })

    return {
      actions,
      sortedActions,
      filteredActions,
      loading,
      error,
      expanded,
      formatDate,
      toggle,
      cardDetailsMap,
      getCardStatus,
      onMemberChange,
      members,
      selectedMember,
      searchQuery
    }
  }
}
</script>

<style>
.container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
  font-family: Arial, sans-serif;
}

.error {
  color: red;
  font-weight: bold;
}

/* Allow long titles to wrap */
.card-title-wrap {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: unset !important;
  word-break: break-word;
  max-width: 100%;
}

/* Set a minimum height for cards */
.equal-cards {
  min-height: 190px;
}

/* Background color based on closed status */
.closed-card {
  background-color: lightgreen !important;
}

.open-card {
  background-color: lightcoral !important;
}

.title-large {
  font-size: 2rem !important;
  font-weight: bold !important;
  text-align: center !important;
  padding: 0.5rem 0 !important;
}
</style>
