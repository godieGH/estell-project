import { defineStore } from 'pinia';
import { socket } from 'boot/socket';
import { api } from 'boot/axios';
import { useUserStore } from './user';

export const useMsgStore = defineStore('messages', {
  state: () => ({
    messages: [],
    isLoadingMessages: false,
    error: null,
    socketListenerInitialized: false,
  }),

  getters: {
    sortedMessages: (state) => {
      return [...state.messages].sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
    },
    hasMessages: (state) => state.messages.length > 0,
  },

  actions: {
    async initializeStore() {
      if (this.socketListenerInitialized) {
        return;
      }

      const userStore = useUserStore();

      socket.on('new_msg', async (msg) => {
        try {
          let sender = msg.sender;
          if (!sender && msg.sender_id) {
            const senderResponse = await api.get(`/api/get/user/${msg.sender_id}`);
            sender = senderResponse.data;
          } else if (!msg.sender_id) {
            console.warn('Received message without sender_id.');
            sender = { id: 'unknown', name: 'Unknown User' };
          }

          const newMsg = {
            id: msg.id,
            conversation_id: msg.conversation_id,
            sender_id: msg.sender_id,
            sender_type: msg.sender_type,
            content: msg.content,
            sent_at: msg.sent_at,
            updated_at: msg.updated_at,
            isMine: userStore.user && msg.sender_id === userStore.user.id,
            is_deleted: msg.is_deleted,
            is_edited: msg.is_edited,
            sender: sender,
          };
          this.upsertMessage(newMsg);
          console.log(this.messages)
        } catch (error) {
          console.error(`Error processing new message from socket:`, error);
        }
      });
      
      this.socketListenerInitialized = true;
    },

    upsertMessage(msg) {
      const existingMsgIndex = this.messages.findIndex((m) => m.id === msg.id);
      if (existingMsgIndex === -1) {
        this.messages.push(msg);
      } else {
        this.messages[existingMsgIndex] = { ...this.messages[existingMsgIndex], ...msg };
      }
    },

    async fetchMessagesForConversation(conversationId) {
      if (!conversationId) {
        console.warn('Cannot fetch messages: conversationId is not provided.');
        return;
      }

      this.isLoadingMessages = true;
      this.error = null;
      try {
        const response = await api.get(`/api/conversations/${conversationId}/messages`);
        const userStore = useUserStore();

        this.messages = response.data.map((msg) => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          sender_type: msg.sender_type,
          content: msg.content,
          sent_at: msg.sent_at,
          updated_at: msg.updated_at,
          isMine: userStore.user && msg.sender_id === userStore.user.id,
          is_deleted: msg.is_deleted,
          is_edited: msg.is_edited,
          sender: msg.sender,
        }));
      } catch (error) {
        console.error(`Error fetching messages for conversation ${conversationId}:`, error);
        this.error = 'Failed to load messages. Please try again.';
      } finally {
        this.isLoadingMessages = false;
      }
    },

    removeMessage(messageId) {
      const initialLength = this.messages.length;
      this.messages = this.messages.filter((msg) => msg.id !== messageId);
      if (this.messages.length === initialLength) {
        console.warn(`Message with ID ${messageId} not found for removal.`);
      }
    },

    clearAllMessages() {
      this.messages = [];
    },

    disconnectSocketListener() {
      if (this.socketListenerInitialized) {
        socket.off('new_msg');
        this.socketListenerInitialized = false;
      }
    },
  },
});
