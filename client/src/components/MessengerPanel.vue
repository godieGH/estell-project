<template>
  <div class="row main-layout-row">
    <div
      class="col-12 col-md-4 conversation-list-column"
      :class="{ 'hidden-on-mobile-chat': showChatOnMobile && $q.screen.lt.md }"
    >
      <ConversationList @selectConversation="selectConversation" />

      <div class="native-fab-container">
        <div class="native-fab-main-button" @click="toggleFabActions">
          <q-icon name="add" />
        </div>

        <div class="native-fab-actions" :class="{ open: fabActionsOpen }">
          <div class="native-fab-action primary" @click="createGroupChat">
            <q-icon name="group_add" /><span class="q-ml-sm">Create Group</span>
          </div>
          <div class="native-fab-action accent" @click="createPrivateChat">
            <q-icon name="person_add" /><span class="q-ml-sm">Create Private</span>
          </div>
        </div>
      </div>
    </div>

    <transition name="slide-left-mobile">
      <div
        class="col-12 col-md-8 chat-column"
        :style="$q.screen.lt.md ? 'height: 100dvh;' : ''"
        :class="{ 'full-screen-on-mobile': showChatOnMobile }"
        v-show="$q.screen.gt.sm || showChatOnMobile"
      >
        <div v-if="showThreads">
          <div
            class="q-pa-sm"
            :style="$q.dark.isActive ? 'background: grey;' : 'background: white;'"
            v-if="$q.screen.lt.md && showChatOnMobile"
          >
            <div style="display: flex; align-items: center">
              <i @click="hideChat()" class="q-pr-sm fas fa-chevron-left"></i>
              <q-skeleton v-if="!currentUserToDisplay" type="circle" size="45px" />
              <q-avatar v-else size="45px">
                <img :src="getAvatarSrc(currentUserToDisplay.avatar)" />
              </q-avatar>
              <q-skeleton
                v-if="!currentUserToDisplay"
                class="q-ml-sm"
                type="text"
                height="20px"
                width="100px"
              />
              <span v-else class="q-ml-sm text-grey">
                <span v-if="currentConversation.type === 'private'"
                  >@{{ currentUserToDisplay.username }}</span
                >
                <span v-else>{{ currentUserToDisplay.groupName }}</span>
              </span>
            </div>
          </div>
          <div class="q-pa-sm" v-else>
            <div style="display: flex; align-items: center">
              <q-skeleton v-if="!currentUserToDisplay" type="circle" size="45px" />
              <q-avatar v-else size="45px">
                <img :src="getAvatarSrc(currentUserToDisplay.avatar)" />
              </q-avatar>
              <q-skeleton
                v-if="!currentUserToDisplay"
                class="q-ml-sm"
                type="text"
                height="20px"
                width="100px"
              />
              <span v-else class="q-ml-sm text-grey">
                <span v-if="currentConversation.type === 'private'"
                  >@{{ currentUserToDisplay.username }}</span
                >
                <span v-else>{{ currentUserToDisplay.groupName }}</span>
              </span>
            </div>
          </div>

          <div style="position: relative">
            <ConvoThreads :currentConversation="currentConversation" />
            <div style="position: absolute; bottom: 0; right: 0; width: 100%">
              <MessengerInput :currentConversation="currentConversation" />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>

  <q-dialog v-model="showUserSelectionModal" persistent>
    <q-card style="max-width: 600px" class="user-selection-modal-card">
      <q-card-section style="overflow: visible" class="row items-center q-pb-none">
        <div class="text-h6">{{ modalTitle }}</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="showUserSelectionModal = false" />
        <div
          class="q-my-sm q-pa-sm"
          style="display: flex; gap: 0; width: 100%; border: 1px solid grey; border-radius: 20px"
        >
          <input
            type="search"
            v-model="searchQuery"
            placeholder="Search users..."
            style="background: transparent; outline: none; border: none; flex-grow: 1"
            :style="$q.dark.isActive ? 'color: white;' : 'color: #131313;'"
            @input="searchPeopleToDm"
          />
          <span style="font-size: 20px; flex-grow: 0; flex-shrink: 0" class="material-icons">
            search
          </span>
        </div>
      </q-card-section>

      <q-card-section id="people-to-dm-scroll-area">
        <div v-if="!noSearchItem">
          <q-list v-if="people.length === 0">
            <q-item v-for="i in 10" :key="i">
              <q-item-section avatar>
                <q-skeleton type="QAvatar" />
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  <q-skeleton type="text" width="80px" />
                </q-item-label>
                <q-item-label caption/>
                  <q-skeleton type="text" width="120px" />
                </q-item-section>
              <q-item-section side>
                <q-btn
                  v-if="modalTitle === 'Create Group Chat'"
                  flat
                  round
                  icon="add_circle_outline"
                  color="primary"
                />
                <q-btn v-else flat round icon="chat" color="primary" />
              </q-item-section>
            </q-item>
          </q-list>

          <q-virtual-scroll
            v-else
            scroll-target="#people-to-dm-scroll-area"
            :items="people"
            v-slot="{ item: person }"
            virtual-scroll-item-size="50"
          >
            <q-item :key="person.id">
              <q-item-section avatar>
                <q-avatar>
                  <img :src="getAvatarSrc(person.avatar)" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  <div>{{ person.name }}</div>
                </q-item-label>
                <q-item-label caption>
                  <div>@{{ person.username }}</div>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  v-if="modalTitle === 'Create Group Chat'"
                  flat
                  round
                  :icon="person.selected ? 'remove_circle_outline' : 'add_circle'"
                  @click="addMembers(person.id)"
                  :color="!person.selected ? 'grey' : 'green'"
                />
                <q-btn
                  v-else
                  flat
                  round
                  icon="chat"
                  color="primary"
                  @click="
                    () => {
                      selectedUsers = []
                      selectedUsers.push(person.id)
                      startChat('private')
                    }
                  "
                />
              </q-item-section>
            </q-item>
          </q-virtual-scroll>
        </div>
        <div class="q-pa-md text-grey" style="display: flex; justify-content: center" v-else>
          No One To send Message
        </div>
      </q-card-section>

      <q-card-actions
        v-if="modalTitle === 'Create Group Chat'"
        style="overflow: visible"
        align="right"
        class="q-pt-md"
      >
        <div class="q-pr-sm text-grey" style="font-size: 13px">
          {{ selectedUsers.length }} of {{ AllPeopleToDM.length }} users selected
        </div>
        <q-btn
          label="Start"
          :loading="loadingStartMsg"
          color="primary"
          icon="chat"
          @click="
            () => {
              loadingStartMsg = true
              startChat('group')
            }
          "
          :disable="selectedUsers.length === 0"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import ConversationList from './ConversationList.vue'
import ConvoThreads from './ConvoThreads.vue'
import MessengerInput from './MessengerInput.vue'
import { getAvatarSrc } from 'src/composables/formater'
import { ref, watch, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
//import { socket } from "boot/socket"

const $q = useQuasar()
const showChatOnMobile = ref(false)
const fabActionsOpen = ref(false)
const showUserSelectionModal = ref(false)
const modalTitle = ref('')
const searchQuery = ref('')
const selectedUsers = ref([]) // To store selected user IDs

const noSearchItem = ref(false)
const loadingStartMsg = ref(false)

const currentConversation = ref({})
const currentUserToDisplay = ref(null)
const showThreads = ref(false)

watch(currentConversation, async (newConvo) => {
  if (newConvo.type === 'private') {
    try {
      const { data } = await api.get(`/api/get/current/convo/${newConvo.id}/user/to/display`)
      currentUserToDisplay.value = { ...data }
    } catch (err) {
      console.log(err.message)
    }
  }

  if (newConvo.type === 'group') {
    currentUserToDisplay.value = {
      avatar: null,
      groupName: newConvo.name,
    }
  }
})

watch(
  () => $q.screen.gt.sm,
  (isDesktop) => {
    if (isDesktop) {
      showChatOnMobile.value = false
    }
  },
  { immediate: true },
)

async function selectConversation(conversationId, type) {
  showThreads.value = false
  currentConversation.value = {}
  $q.loading.show({
    delay: 400,
    spinnerSize: 80,
    spinnerColor: 'white',
    backgroundColor: 'blue-grey-10',
  })
  if (type === 'private') {
    try {
      const { data } = await api.post('api/open/chart', { conversationId, type })
      //console.log(data)
      if (data) {
        currentConversation.value = { ...data }
      }
      try {
        const { data } = await api.get(`/api/get/current/convo/${conversationId}/user/to/display`)
        //console.log(currentConversation.value, data)
        currentUserToDisplay.value = { ...data }
        $q.loading.hide()
        showThreads.value = true
        // Only trigger the animation on mobile screens
        if ($q.screen.lt.md) {
          showChatOnMobile.value = true
        } else {
          showChatOnMobile.value = false
        }
      } catch (err) {
        console.log(err.message)
      }
    } catch (err) {
      console.log(err.message)
    }
  }
}

function hideChat() {
  showChatOnMobile.value = false
  showThreads.value = false
}

function toggleFabActions() {
  fabActionsOpen.value = !fabActionsOpen.value
}

function createGroupChat() {
  fetchAllPeopleToDM()
  fabActionsOpen.value = false
  modalTitle.value = 'Create Group Chat'
  showUserSelectionModal.value = true
  selectedUsers.value = [] // Reset selected users
}

function createPrivateChat() {
  fetchAllPeopleToDM()
  fabActionsOpen.value = false
  modalTitle.value = 'Create Private Chat'
  showUserSelectionModal.value = true
  selectedUsers.value = [] // Reset selected users
}

const AllPeopleToDM = ref([])
const people = ref([])

async function fetchAllPeopleToDM() {
  searchQuery.value = ''
  noSearchItem.value = false
  people.value = []
  AllPeopleToDM.value = []

  try {
    const { data } = await api.get('/api/all/people/to/dm')
    if (data.length === 0) {
      noSearchItem.value = true
      return
    }

    const refineData = data.map((p) => {
      return {
        ...p,
        selected: false,
      }
    })

    AllPeopleToDM.value = refineData

    if (searchQuery.value === '') {
      people.value = [...AllPeopleToDM.value]
    }
  } catch (err) {
    console.log(err.message)
  }
}

let searchTimeId
function searchPeopleToDm(e) {
  clearTimeout(searchTimeId)
  const q = e.target.value.toLowerCase() // Convert query to lowercase for case-insensitive search
  people.value = [] // Clear current people list
  noSearchItem.value = false

  searchTimeId = setTimeout(() => {
    if (q.trim() === '') {
      // If the search query is empty, show all people
      people.value = [...AllPeopleToDM.value]
    } else {
      const filteredPeople = AllPeopleToDM.value.filter((person) => {
        const username = person.username ? person.username.toLowerCase() : ''
        const name = person.name ? person.name.toLowerCase() : ''
        return username.includes(q) || name.includes(q)
      })

      // Sort the filtered results based on proximity to the query
      filteredPeople.sort((a, b) => {
        const aUsername = a.username ? a.username.toLowerCase() : ''
        const aName = a.name ? a.name.toLowerCase() : ''
        const bUsername = b.username ? b.username.toLowerCase() : ''
        const bName = b.name ? b.name.toLowerCase() : ''

        // Prioritize exact matches at the beginning
        if (aUsername === q || aName === q) return -1
        if (bUsername === q || bName === q) return 1

        // Then prioritize matches where the query is at the start of the username/name
        if (aUsername.startsWith(q) && !bUsername.startsWith(q)) return -1
        if (bUsername.startsWith(q) && !aUsername.startsWith(q)) return 1
        if (aName.startsWith(q) && !bName.startsWith(q)) return -1
        if (bName.startsWith(q) && !aName.startsWith(q)) return 1

        // Finally, sort by the index of the query in username or name
        const aIndexUsername = aUsername.indexOf(q)
        const aIndexName = aName.indexOf(q)
        const bIndexUsername = bUsername.indexOf(q)
        const bIndexName = bName.indexOf(q)

        const aMinIndex = Math.min(
          aIndexUsername !== -1 ? aIndexUsername : Infinity,
          aIndexName !== -1 ? aIndexName : Infinity,
        )
        const bMinIndex = Math.min(
          bIndexUsername !== -1 ? bIndexUsername : Infinity,
          bIndexName !== -1 ? bIndexName : Infinity,
        )

        return aMinIndex - bMinIndex
      })

      if (filteredPeople.length === 0) {
        noSearchItem.value = true
        return
      }
      people.value = filteredPeople
    }
  }, 200)
}

function addMembers(id) {
  const updatedPeople = people.value.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))

  people.value = updatedPeople

  const selectedStatusMap = new Map(people.value.map((p) => [p.id, p.selected]))

  AllPeopleToDM.value = AllPeopleToDM.value.map((dmPerson) =>
    selectedStatusMap.has(dmPerson.id)
      ? { ...dmPerson, selected: selectedStatusMap.get(dmPerson.id) }
      : dmPerson,
  )

  selectedUsers.value = people.value.filter((p) => p.selected).map((p) => p.id)
}

async function startChat(type) {
  showThreads.value = false

  try {
    const { data } = await api.post('api/start/a/chart', {
      participants: selectedUsers.value,
      type,
    })
    //console.log(data)
    if (data) {
      currentConversation.value = { ...data }
      showUserSelectionModal.value = false
      // Only trigger the animation on mobile screens
      if ($q.screen.lt.md) {
        showChatOnMobile.value = true
      } else {
        showChatOnMobile.value = false
      }
      showThreads.value = true
    }
  } catch (err) {
    console.log(err.message)
    $q.notify({
      type: 'negative',
      message: 'Something went wrong, Server not Responding...',
    })
  } finally {
    loadingStartMsg.value = false
  }
}
onUnmounted(() => {
  clearTimeout(searchTimeId)
})
</script>

<style scoped lang="scss">
/* Conversation List Column Styling */
.conversation-list-column {
  position: relative; /* Essential for FAB positioning */
  display: flex; /* Use flexbox to manage internal height */
  flex-direction: column; /* Stack children vertically */
  height: calc(100dvh - 70px);
}

/* Your existing mobile hiding logic for the conversation list */
@media (max-width: 1023.98px) {
  .hidden-on-mobile-chat {
    display: none !important;
  }
}

/* Chat Column (right side) */
.chat-column {
  position: relative; /* Reset these if they were causing issues */
  z-index: auto;
  overflow: hidden;
  height: calc(100dvh - 70px);
}

.full-screen-on-mobile {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  z-index: 999;
  overflow: hidden; /* Ensure chat column content doesn't scroll past its bounds */
}

@media (max-width: 1023.98px) {
  .full-screen-on-mobile {
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
    flex: none !important;
  }
}

/* --- Native HTML FAB Styles --- */
.native-fab-container {
  position: absolute; /* Position relative to the .conversation-list-column */
  bottom: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 8px;
  /* Add some padding-bottom if needed to ensure actions don't get clipped by screen edge */
  // padding-bottom: 16px; /* Example: adjust if fab actions are too close to bottom edge */
}

.native-fab-main-button {
  background-color: var(--q-secondary);
  color: white;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: transform 0.3s ease-in-out;
  font-size: 24px;
}

.native-fab-actions {
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 8px;
  max-height: 0;
  overflow: hidden; /* Crucial: Hides content that exceeds max-height */
  transition:
    max-height 0.3s ease-in-out,
    opacity 0.3s ease-in-out;
  opacity: 0;
  pointer-events: none;
}

.native-fab-actions.open {
  max-height: 300px; /* Sufficient height to reveal actions */
  opacity: 1;
  pointer-events: auto;
}

.native-fab-action {
  color: white;
  padding: 8px 16px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  cursor: pointer;
  box-shadow:
    0 2px 4px -1px rgba(0, 0, 0, 0.2),
    0 4px 5px 0 rgba(0, 0, 0, 0.14),
    0 1px 10px 0 rgba(0, 0, 0, 0.12);
  white-space: nowrap;
  transform: translateY(20px);
  opacity: 0;
  transition:
    transform 0.3s ease-out,
    opacity 0.3s ease-out;
}

.native-fab-actions.open .native-fab-action {
  transform: translateY(0);
  opacity: 1;
}

.native-fab-actions.open .native-fab-action:nth-child(1) {
  transition-delay: 0.1s;
}
.native-fab-actions.open .native-fab-action:nth-child(2) {
  transition-delay: 0.05s;
}

.native-fab-action.primary {
  background-color: var(--q-secondary);
}

.native-fab-action.accent {
  background-color: var(--q-primary);
}

/* Modal specific styles */
.user-selection-modal-card {
  width: 100%;
  max-width: 600px; /* Adjust as needed */
  max-height: 80vh; /* Make it responsive */
  display: flex;
  flex-direction: column;
}

/* New CSS for slide-left-mobile transition */
.slide-left-mobile-enter-active,
.slide-left-mobile-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-left-mobile-enter-from {
  transform: translateX(100%);
}

.slide-left-mobile-leave-to {
  transform: translateX(100%);
}

@media (min-width: 1024px) {
  .slide-left-mobile-enter-active,
  .slide-left-mobile-leave-active {
    transition: none; /* Disable transition on desktop */
  }

  .slide-left-mobile-enter-from,
  .slide-left-mobile-leave-to {
    transform: translateX(0) !important; /* Ensure no transform on desktop */
  }
}
</style>
