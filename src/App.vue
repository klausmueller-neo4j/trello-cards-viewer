<template>
  <v-app>
    <v-container>
      <v-card class="pa-2" outlined>
        <v-card-title>Trello Card Tracking</v-card-title>
        <v-card-text>
          <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-3"></v-progress-linear>
          <v-alert v-if="error" type="error" outlined>
            {{ error }}
          </v-alert>

          <v-row v-if="actions.length" dense>
            <v-col v-for="(action, index) in actions" :key="index" cols="12" md="6">
              <v-card
                outlined
                class="equal-cards card-title-wrap"
                :class="getCardClass(action.data.card.id)"
              >
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
                      <!-- You can display more detailed info from the batch data -->
                      <div>
                        <strong>Description:</strong>
                        {{ cardDetailsMap[action.data.card.id].desc }}
                      </div>
                    </div>
                    <div>
                      <a :href="'https://trello.com/c/' + action.data.card.shortLink" target="_blank">
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
import { ref, onMounted } from 'vue'

export default {
  name: 'App',
  setup() {
    // Get credentials from environment variables.
    const API_KEY = import.meta.env.VITE_TRELLO_API_KEY
    const TOKEN = import.meta.env.VITE_TRELLO_TOKEN
    const member = 'frankyao18'

    // Reactive state
    const actions = ref([])
    const loading = ref(true)
    const error = ref(null)
    const expanded = ref([])
    // Object to store card details keyed by card id.
    const cardDetailsMap = ref({})

    // Helper function: group an array into chunks.
    function groupArray(array, chunkSize) {
      const groups = []
      for (let i = 0; i < array.length; i += chunkSize) {
        groups.push(array.slice(i, i + chunkSize))
      }
      return groups
    }

    // Fetch card details in batches.
    async function fetchCardDetails(cardIds) {
      const groups = groupArray(cardIds, 10)
      const detailsMap = {}

      for (const group of groups) {
        const endpoints = group.map(id => `/cards/${id}`)
        const urlsParam = endpoints.join(',')
        const batchUrl = `https://api.trello.com/1/batch?urls=${encodeURIComponent(
          urlsParam
        )}&key=${API_KEY}&token=${TOKEN}`
        console.log(batchUrl)
        const response = await fetch(batchUrl)
        if (!response.ok) {
          console.error('Error fetching card details for group', group)
          continue
        }
        const batchData = await response.json()
        // Process each result from the batch response.
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
        // Fetch actions (card creation events)
        const actionsUrl = `https://api.trello.com/1/members/${member}/actions?filter=createCard&key=${API_KEY}&token=${TOKEN}`
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

        // Batch-fetch card details.
        cardDetailsMap.value = await fetchCardDetails(cardIds)
      } catch (err) {
        error.value = err.message || 'Unknown error'
      } finally {
        loading.value = false
      }
    }

    // Format date strings.
    const formatDate = dateString => {
      const date = new Date(dateString)
      return date.toLocaleString()
    }

    // Toggle the expanded state for a given card.
    const toggle = index => {
      expanded.value[index] = !expanded.value[index]
    }

    onMounted(() => {
      fetchActionsAndCardDetails()
    })

    // Determine the CSS class based on card closed status.
    const getCardClass = cardId => {
      const card = cardDetailsMap.value[cardId]
      if (card) {
        return card.closed ? 'closed-card' : 'open-card'
      }
      return ''
    }

    return {
      actions,
      loading,
      error,
      expanded,
      formatDate,
      toggle,
      cardDetailsMap,
      getCardClass
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
  min-height: 200px;
}

.closed-card {
  background-color: lightgreen !important;
}

.open-card {
  background-color: lightcoral !important;
}

</style>
