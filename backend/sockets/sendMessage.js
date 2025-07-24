const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Message, Participant, Conversation, ReadStatus, User } = require('../models'); // Destructure User here

// Helper function for JWT authentication
const authenticateUser = (token) => {
   try {
      return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
   } catch (error) {
      void error
      return null;
   }
};

module.exports = function(io, socket) {
   socket.on('sendMessage', async (payload, auth, ack) => {
      const decodedToken = authenticateUser(auth);

      if (!decodedToken || !decodedToken.userId) {
         socket.emit('auth_error', 'Authentication failed');
         if (typeof ack === 'function') {
            ack({ success: false, error: 'Authentication failed' });
         }
         return;
      }

      try {
         const {
            conversation_id,
            content,
            reply_to_message,
         } = payload;

         const userId = decodedToken.userId;

         if (!userId) {
            if (typeof ack === 'function') {
               ack({ success: false, error: 'No User Id' });
            }
            return;
         }

         if (!conversation_id) {
            if (typeof ack === 'function') {
               ack({ success: false, error: 'No conversation to send a message to' });
            }
            return;
         }

         // Fetch the conversation, including last_message_at and type
         const conversation = await Conversation.findByPk(conversation_id, {
            attributes: ['id', 'last_message_at', 'type', 'name', 'creator_id']
         });

         if (!conversation) {
            if (typeof ack === 'function') {
               ack({ success: false, error: 'Conversation not found' });
            }
            return;
         }

         // Check if this is the first message in the conversation
         const isNewConversation = !conversation.last_message_at;

         if (isNewConversation) {
            // Join the socket room for the new conversation
            socket.join(conversation_id);
            io.emit("refresh")

            // Send system message for conversation creation
            let creatorInfo = '';
            if (conversation.type === 'private') {
                const creatorUser = await User.findByPk(conversation.creator_id); // Using the destructured User model
                creatorInfo = creatorUser ? creatorUser.username : 'Unknown User';
            } else if (conversation.type === 'group') {
                creatorInfo = conversation.name || 'Unknown Group';
            }

            const creationMessageContent = {
                text: `This ${conversation.type} chat is created by @${creatorInfo}.`,
                system_message: true, // Mark as a system message
                type: 'initial_msg'
            };
            const creationSystemMessage = await Message.create({
                conversation_id,
                sender_id: null, // System messages have no sender
                sender_type: 'system',
                content: creationMessageContent,
                ConversationId: conversation_id,
            });
            socket.to(conversation_id).emit('new_msg', creationSystemMessage);
         }


         const msg = await Message.create({
            conversation_id,
            sender_id: userId,
            sender_type: 'user',
            content: {
               text: content.text || null,
               attachment: content.attachment || null,
               attachment_type: content.attachment_type || null,
               attachment_metadata: content.attachment_metadata || null,
               voice_note: content.voice_note || null,
            },
            reply_to_message_id: reply_to_message?.id,
            ConversationId: conversation_id,
         });

         if (msg) {
            await conversation.update({
               last_message_at: msg.sent_at,
               last_message_id: msg.id,
            });

            // Find the participant
            const participant = await Participant.findOne({
               where : {
                  [Op.and]: {
                     conversation_id: msg.conversation_id,
                     user_id: userId
                  }
               }
            });

            let participant_id;
            if (participant) {
                participant_id = participant.id;
            } else {
                // Handle the case where the participant is not found.
                // This might indicate a data inconsistency or an unjoined user.
                // For now, let's log an error and potentially skip read status update.
                console.error(`Participant not found for conversation_id: ${msg.conversation_id}, user_id: ${userId}`);
                // You might want to 'ack' an error back to the client here,
                // or simply return to avoid further errors.
                if (typeof ack === 'function') {
                    ack({ success: false, error: 'Participant not found for read status update.' });
                }
                return; // Exit if participant not found
            }

            const read_status = await ReadStatus.findOne({
               where: {
                  [Op.and]: {
                    conversation_id: msg.conversation_id,
                    participant_id: participant_id // Now participant_id will be defined
                  }
               }
            });

            //console.log(read_status);

            if(read_status) {
               await read_status.update({
                  xxxx: JSON.stringify(msg.sent_at),
               });
            } else {
               await ReadStatus.create({
                  conversation_id: msg.conversation_id,
                  participant_id: participant_id,
                  read_at: msg.sent_at // Set read_at when creating for the first time
               });
            }
         }

         socket.to(conversation_id).emit('new_msg', msg);

         if (typeof ack === 'function') {
            ack({
               success: true,
               serverMsgId: msg.id
            });
         }
      } catch (err) {
         console.error(err);
         if (typeof ack === 'function') {
            ack({ success: false, error: err.message });
         }
      }
   });
};
