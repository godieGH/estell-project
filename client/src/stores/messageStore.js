import { defineStore } from 'pinia'
import { socket } from 'boot/socket'
import { api } from 'boot/axios'
import { toRaw } from 'vue'
import { useUserStore } from 'stores/user'
import Dexie from 'dexie'

const auth = useUserStore().token
// Initialize Dexie database
const db = new Dexie('MessageQueueDB')
db.version(1).stores({
  queuedMessages: 'id, conversation_id, sent_at', // 'id' is the primary key. We'll store the entire message object.
})

export const useMessageStore = defineStore('messageStore', {
  state: () => ({
    queued: [],
    currentUpload: {
      type: null,
      progress: null,
      messageClientId: null,
    },
  }),
  actions: {
    async initializeStore() {
      //console.log('Initializing message store and loading queued messages from IndexedDB.')
      try {
        const storedMessages = await db.queuedMessages.toArray()
        this.queued = storedMessages.map((msg) => {
          // Re-create Blob URLs if the attachment or voice note was a Blob
          if (msg._attachmentFile instanceof Blob) {
            msg.content.attachment = URL.createObjectURL(msg._attachmentFile)
          }
          if (msg._voiceNoteBlob instanceof Blob) {
            msg.content.voice_note = URL.createObjectURL(msg._voiceNoteBlob)
          }
          return msg
        })
        //console.log(`Loaded ${this.queued.length} queued messages from IndexedDB.`)
        if (this.queued.length > 0) {
          this.processAllQueuedMessages()
        }
      } catch (error) {
        console.error('Error initializing store or loading messages from IndexedDB:', error)
      }
    },

    async queueMsg(obj) {
      const clientId = Date.now().toString() + Math.random().toString(36).substring(2, 9)
      const newMsg = {
        id: clientId,
        conversation_id: obj.conversation.id,
        sender_id: toRaw(obj.sender.id),
        sender: toRaw(obj.sender),
        sender_type: 'user',
        content: {
          text: toRaw(obj.content.text) || null,
          attachment: obj.content.attachment?.file
            ? URL.createObjectURL(obj.content.attachment.file)
            : null,
          attachment_type: obj.content.attachment?.type || null,
          voice_note: obj.content.fullAudioBlob
            ? URL.createObjectURL(obj.content.fullAudioBlob)
            : null,
        },
        _attachmentFile: obj.content.attachment?.file || null, // Store the actual File/Blob object
        _voiceNoteBlob: obj.content.fullAudioBlob || null, // Store the actual Blob object
        sent_at: obj.sent_at,
        reply_to_message: toRaw(obj.reply_to_message) || null,
        reply_to: toRaw(obj.reply_to) || null,
        isMine: true,
        read_by: [],
        queued: true,
      }
      this.queued.push(newMsg)

      // Persist to IndexedDB
      try {
        // Store a raw version of newMsg to avoid reactivity issues with Dexie,
        // and ensure Blobs are stored directly.
        const msgToStore = {
          ...toRaw(newMsg),
          _attachmentFile: newMsg._attachmentFile, // Dexie handles Blobs directly
          _voiceNoteBlob: newMsg._voiceNoteBlob, // Dexie handles Blobs directly
          // Remove the Object URLs as they are transient and will be recreated on load
          content: {
            ...toRaw(newMsg.content),
            attachment: newMsg._attachmentFile ? null : newMsg.content.attachment,
            voice_note: newMsg._voiceNoteBlob ? null : newMsg.content.voice_note,
          },
        }
        await db.queuedMessages.put(msgToStore)
        //console.log(`Message ${newMsg.id} queued and stored in IndexedDB.`)
      } catch (error) {
        console.error('Error storing message in IndexedDB:', error)
      }
      return true
    },

    async sendQueued(msg) {
      try {
        let uploadedUrl = null
        let uploadType = null
        let metadata = null

        // Reset upload progress before attempting a new upload
        this.currentUpload.type = null
        this.currentUpload.progress = null
        this.currentUpload.messageClientId = null

        if (msg._attachmentFile || msg._voiceNoteBlob) {
          const formData = new FormData()
          let uploadRoute = ''
          formData.append('conversation_id', msg.conversation_id)
          this.currentUpload.messageClientId = msg.id

          if (msg._attachmentFile) {
            formData.append('file', msg._attachmentFile)
            uploadType = msg.content.attachment_type
            switch (msg.content.attachment_type) {
              case 'image':
                uploadRoute = 'api/upload/image'
                break
              case 'video':
                uploadRoute = 'api/upload/video'
                break
              case 'file':
                uploadRoute = 'api/upload/file'
                break
            }
          } else if (msg._voiceNoteBlob) {
            formData.append('audio', msg._voiceNoteBlob)
            uploadType = 'voice_note'
            uploadRoute = 'api/upload/voice-note'
          }

          if (uploadRoute) {
            this.currentUpload.type = uploadType
            const uploadResponse = await api.post(uploadRoute, formData, {
              onUploadProgress: (progressEvent) => {
                this.currentUpload.progress = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total,
                )
              },
            })
            uploadedUrl = uploadResponse.data.url
            metadata = uploadResponse.data.attachment_metadata || null

            const i = this.queued.findIndex((qMsg) => qMsg.id === msg.id)
            if (i !== -1) {
              if (uploadType !== 'voice_note') {
                this.queued[i].content.attachment = uploadedUrl
                this.queued[i].content.attachment_metadata = metadata
              } else {
                this.queued[i].content.voice_note = uploadedUrl
              }
            }
          }
        }
        // Reset upload progress after a successful upload
        this.currentUpload.type = null
        this.currentUpload.progress = null
        this.currentUpload.messageClientId = null

        const messageToSend = {
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          content: {
            text: msg.content.text,
            attachment: uploadedUrl && msg.content.attachment_type !== null ? uploadedUrl : null,
            attachment_type:
              uploadedUrl && msg.content.attachment_type !== null
                ? msg.content.attachment_type
                : null,
            attachment_metadata: metadata,
            voice_note: uploadedUrl && uploadType === 'voice_note' ? uploadedUrl : null,
          },
          sent_at: msg.sent_at,
          reply_to_message: msg.reply_to_message,
          client_message_id: msg.id,
        }

        const response = await new Promise((resolve) => {
          socket.emit('sendMessage', messageToSend, auth, (res) => {
            resolve(res)
          })
        })

        if (response.success) {
          const index = this.queued.findIndex((qMsg) => qMsg.id === msg.id)
          if (index !== -1) {
            // Revoke Object URLs to free memory
            if (
              this.queued[index].content.attachment &&
              this.queued[index].content.attachment.startsWith('blob:')
            ) {
              URL.revokeObjectURL(this.queued[index].content.attachment)
            }
            if (
              this.queued[index].content.voice_note &&
              this.queued[index].content.voice_note.startsWith('blob:')
            ) {
              URL.revokeObjectURL(this.queued[index].content.voice_note)
            }
            this.queued[index].queued = false
            this.queued.splice(index, 1)
          }
          // Remove from IndexedDB on successful send
          try {
            await db.queuedMessages.delete(msg.id)

            //console.log(`Message ${msg.id} successfully sent and removed from IndexedDB.`)
          } catch (dbError) {
            console.error('Error removing message from IndexedDB:', dbError)
          }
          //this.queued[index].id = response.serverMsgId
          return true // Message sent, exit the function
        } else {
          throw new Error(`Failed to send message to server: ${response.error}`)
        }
      } catch (error) {
        console.error(`Failed to send queued message ${msg.id}:`, error)
        // Reset upload progress on final failure
        this.currentUpload.type = null
        this.currentUpload.progress = null
        this.currentUpload.messageClientId = null
        throw error // Re-throw the error to be caught by the caller
      }
    },
    async processAllQueuedMessages($q = null) {
      const messagesToProcess = [...this.queued]
      for (const msg of messagesToProcess) {
        if (msg.queued) {
          try {
            await this.sendQueued(msg)
          } catch (error) {
            // Handle the final failure after the single attempt
            if ($q) {
              $q.dialog({
                title: 'Message Not Sent',
                message: `Failed to send a message. It will remain in your queue. Error: ${error.message}`,
                persistent: true,
              })
            }
            console.error('Failed to process message:', msg.id, error)
          }
        }
      }
    },
  },
})
