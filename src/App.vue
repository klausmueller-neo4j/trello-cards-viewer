<template>
  <v-app>
    <v-container>
      <v-card class="pa-4" outlined>
        <v-card-title>Your Recent Trello's</v-card-title>
        <v-card-text>
          <v-progress-linear
            v-if="loading"
            indeterminate
            color="primary"
            class="mb-3"
          ></v-progress-linear>

          <v-alert v-if="error" type="error" outlined>
            {{ error }}
          </v-alert>

          <v-row v-if="actions.length" dense>
            <v-col v-for="(action, index) in actions" :key="index" cols="12" md="6">
              <v-card outlined class="equal-cards">
                <v-card-title class="card-title-wrap">
                    <strong>{{ action.data.card.name }}</strong>
                </v-card-title>
                <v-expand-transition>
                  <v-card-text v-if="expanded[index]">
                    <div><strong>Creation Date:</strong>{{ formatDate(action.date) }}</div>
                    <div><strong>Board:</strong> {{ action.data.board.name }}</div>
                    <div>
                      <a :href="'https://trello.com/c/' + action.data.card.shortLink" target="_blank">
                        Trello Link
                      </a>
                    </div>
                    <!-- More detailed info here -->
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
    // Replace these with your actual Trello API key, token, and the member username or id.
    const API_KEY = import.meta.env.VITE_TRELLO_API_KEY
    const TOKEN = import.meta.env.VITE_TRELLO_TOKEN
    const member = 'me'

    const actions = ref([])
    const loading = ref(true)
    const error = ref(null)
    const expanded = ref([])

    const fetchActions = async () => {
      try {
        const apiUrl = `https://api.trello.com/1/members/${member}/actions?filter=createCard&key=${API_KEY}&token=${TOKEN}`
        const response = await fetch(apiUrl)
        if (!response.ok) {
          throw new Error('Error fetching data')
        }
        const data = await response.json()
        actions.value = data
        console.log(data)
      } catch (err) {
        error.value = err.message || 'Unknown error'
      } finally {
        loading.value = false
      }
    }

    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleString()
    }

    onMounted(() => {
      fetchActions()
    })

    const toggle = (index) => {
      expanded.value[index] = !expanded.value[index]
    }

    return { actions, loading, error, formatDate, toggle, expanded}
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

.card-title-wrap {
  white-space: normal !important; 
  overflow: visible !important;    
  text-overflow: unset !important;  
  word-break: break-word;           
  max-width: 100%;                 
}

.equal-cards {
  min-height:200px;
}

</style>
