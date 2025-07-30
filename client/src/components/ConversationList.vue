<template>
  <div class="conversation-list">
    <div class="q-pa-sm conversation-list-header">
      <div v-if="initialLoading" style="display: flex">
        <q-skeleton
          v-for="n in 3"
          :key="n"
          type="rect"
          width="80px"
          height="32px"
          style="border-radius: 20px"
          class="q-mx-xs"
        />
      </div>
      <div v-else style="display: flex; gap: 5px">
        <div
          class="filter-btn"
          :style="activeTab == f ? 'background: var(--q-secondary); color: #fff;' : ''"
          v-for="f in filters"
          @click="fetchTabData(f)"
          :key="f"
        >
          {{ f }}
        </div>
      </div>
    </div>
    <div class="conversation-list-content-area">
      <div v-if="initialLoading"></div>
      <div v-else>
        <q-card
          v-for="convo in myConversations"
          :key="convo.id"
          flat
          class="q-mb-sm q-hoverable"
          style="cursor: pointer"
          @click="selectConversation(convo.id, convo.type)"
        >
          <q-card-section
            v-if="convo.participants.length > 0"
            class="row items-center no-wrap q-py-sm"
          >
            <q-item-section avatar>
              <q-avatar v-if="convo.type === 'private'" size="48px">
                <img :src="getAvatarSrc(convo.participants?.[0]?.user?.avatar)" />
              </q-avatar>
              <q-avatar v-else-if="convo.type === 'group'" size="48px">
                <img :src="getAvatarSrc(convo.groupAvatar)" />
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <q-item-label>
                <span
                v-if="convo.type === 'private'"
                  class="text-grey"
                  style="white-space: nowrap; overflow-x: hidden; text-overflow: ellipsis"
                >
                  {{ convo.participants?.[0]?.user?.name || 'Unknown User' }}
                </span>
                <span
                v-else-if="convo.type === 'group'"
                  class="text-grey"
                  style="white-space: nowrap; overflow-x: hidden; text-overflow: ellipsis"
                >
                  {{ convo.name || 'Unknown User' }}
                </span>
              </q-item-label>
              <q-item-label class="q-mt-xs">
                <div
                  v-if="convo.messages.length > 0"
                  style="white-space: nowrap; overflow-x: hidden; text-overflow: ellipsis"
                >
                  <span v-if="convo.messages?.[0]?.content?.voice_note">
                    <i class="material-icons">mic</i>
                    <span class="q-ml-xs text-grey" style="font-size: 11px">{{
                      convo.messages?.[0]?.content?.voice_note_duration
                    }}</span>
                  </span>

                  <span v-else-if="convo.messages?.[0]?.content?.attachment">
                    <span v-if="convo.messages?.[0]?.content?.attachment_type === 'image'">
                      <i class="material-icons">image</i>
                    </span>
                    <span v-else-if="convo.messages?.[0]?.content?.attachment_type === 'video'">
                      <i class="material-icons">videocam</i>
                    </span>
                    <span v-else-if="convo.messages?.[0]?.content?.attachment_type === 'file'">
                      <i class="material-icons">insert_drive_file</i>
                    </span>
                    <span v-else-if="convo.messages?.[0]?.content?.attachment_type === 'link'">
                      <i class="material-icons">link</i>
                    </span>
                    <span v-else-if="convo.messages?.[0]?.content?.attachment_type === 'location'">
                      <i class="material-icons">location</i>
                    </span>
                    <span v-else></span>
                    <span class="q-ml-xs" style="font-size: 13px">
                      {{ convo.messages?.[0]?.content?.text }}
                    </span>
                    <i
                      class="text-grey"
                      style="font-size: 12px"
                      v-if="!convo.messages?.[0]?.content?.text"
                    >
                      Sent at {{ date.formatDate(convo.messages?.[0]?.sent_at, 'HH:mm DD/MM/YY') }}
                    </i>
                  </span>

                  <span class="q-ml-xs" style="font-size: 13px">
                    {{ convo.messages?.[0]?.content?.text }}
                  </span>
                </div>
                <div v-else class="text-grey">👋 Hi there...</div>
              </q-item-label>
            </q-item-section>

            <q-item-section side top>
              <span style="font-size: 10px" class="q-mb-xs">
                {{ formatTime(convo.last_message_at) }}
              </span>
              <span
                v-if="convo.unreadCount > 0"
                style="font-size: 10px; border-radius: 50px; background: green; color: white"
                class="q-pa-xs q-px-sm"
              >
                {{ convo.unreadCount }}
              </span>
            </q-item-section>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getAvatarSrc, formatTime, audioDuration } from 'src/composables/formater'
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { api } from 'boot/axios'
import { socket } from 'boot/socket'
import { date } from 'quasar'

import { useMessageStore } from 'stores/messageStore'
import { useMsgStore } from 'stores/messages'

const emit = defineEmits(['selectConversation'])
const IMB = useMsgStore()
const messageStore = useMessageStore()

watch(
  IMB.messages,
  (newmsg) => {
    void newmsg
    fetchConversation()
  },
  {
    deep: true,
  },
)
watch(
  messageStore.queued,
  (newMsgs) => {
    void newMsgs
    fetchConversation()
  },
  { deep: true },
)

const initialLoading = ref(true)
const filters = ref(['Private', 'Groups', 'Business'])
const activeTab = ref('Private')

const myConversations = ref([])

function fetchTabData(filter) {
  activeTab.value = filter
  fetchConversation()
}

async function fetchConversation() {
  if (activeTab.value === 'Private') {
    let type = 'private'

    try {
      const { data } = await api.get(`/api/get/all/user/conversations/${type}`)

      const newData = await Promise.all(
        data.map(async (a) => {
          if (a.messages?.[0]?.content?.voice_note) {
            a.messages[0].content.voice_note_duration = await audioDuration(
              a.messages?.[0]?.content?.voice_note,
            )
          }
          return a
        }),
      )

      //console.log(newData)
      myConversations.value = [...newData]
    } catch (err) {
      console.log(err.message)
    } finally {
      initialLoading.value = false
    }
  } else if(activeTab.value === 'Groups') {
     let type = 'Groups'
     
     try {
        const { data } = await api.get(`/api/get/all/user/conversations/${type}`)
        
        
      const newData = await Promise.all(
        data.map(async (a) => {
          if (a.messages?.[0]?.content?.voice_note) {
            a.messages[0].content.voice_note_duration = await audioDuration(
              a.messages?.[0]?.content?.voice_note,
            )
          }
          return a
        }),
      )

      //console.log(newData)
      myConversations.value = [...newData]
        
     } catch (e) {
        console.error(e.message)
     }
  }
}

function selectConversation(convo_id, type) {
  emit('selectConversation', convo_id, type)
}

onMounted(() => {
  fetchConversation()

  socket.on('someone_raed_msg', fetchConversation)
})

onUnmounted(() => {
  socket.off('someone_raed_msg', fetchConversation)
})
</script>

<style scoped lang="scss">
.conversation-list {
  height: calc(100dvh - 70px);
  display: flex;
  flex-direction: column;

  .conversation-list-header {
    flex-shrink: 0;
    .filter-btn {
      border: 1px solid;
      border-radius: 20px;
      padding: 5px 8px;
      font-weight: 500;
      &:active {
        transform: scale(0.95);
      }
    }
  }

  .conversation-list-content-area {
    flex-grow: 1; /* Allows this area to take up all remaining space */
    overflow-y: auto; /* **This is the key for scrolling!** */
    padding-bottom: 20px; /* Increased padding to ensure content clears the FAB */
  }
}
</style>
