const jwt = require("jsonwebtoken");
const {
  Message,
  Conversation,
  User,
  ReadStatus,
  Participant,
} = require("../models"); // Destructure User here

// Helper function for JWT authentication
const authenticateUser = (token) => {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    void error;
    return null;
  }
};

module.exports = function (io, socket, redis) {
  socket.on("sendMessage", async (payload, auth, ack) => {
    const decodedToken = authenticateUser(auth);

    if (!decodedToken || !decodedToken.userId) {
      socket.emit("auth_error", "Authentication failed");
      if (typeof ack === "function") {
        ack({ success: false, error: "Authentication failed" });
      }
      return;
    }

    try {
      const { client_message_id, conversation_id, content, reply_to_message } = payload;
      const userId = decodedToken.userId;

      if (!userId) {
        if (typeof ack === "function") {
          ack({ success: false, error: "No User Id" });
        }
        return;
      }

      if (!conversation_id) {
        if (typeof ack === "function") {
          ack({
            success: false,
            error: "No conversation to send a message to",
          });
        }
        return;
      }

      // --- Redis Duplication Check using client_message_id as the key ---
      if (client_message_id) {
        // HGET checks for a field within a hash.
        // The key of the hash is the client_message_id itself.
        const existingServerMsgId = await redis.hGet(client_message_id, 'serverMsgId');

        if (existingServerMsgId) {
          console.log(`Duplicate message with client_message_id ${client_message_id} detected. Returning cached server ID.`);
          
          if (typeof ack === "function") {
            ack({
              success: true,
              serverMsgId: existingServerMsgId,
            });
          }
          return; // Stop further processing
        }
      }
      
      const conversation = await Conversation.findByPk(conversation_id, {
        attributes: ["id", "last_message_at", "type", "name", "creator_id"],
      });

      if (!conversation) {
        if (typeof ack === "function") {
          ack({ success: false, error: "Conversation not found" });
        }
        return;
      }

      const isNewConversation = !conversation.last_message_at;

      if (isNewConversation) {
        socket.join(conversation_id);
        io.emit("refresh");

        let creatorInfo = "";
        if (conversation.type === "private" || conversation.type === "group") {
          const creatorUser = await User.findByPk(conversation.creator_id);
          creatorInfo = creatorUser ? creatorUser.username : "Unknown User";
        }

        const creationMessageContent = {
          text: `This ${conversation.type} chat was created by @${creatorInfo}.`,
          system_message: true,
          type: "initial_msg",
        };
        const creationSystemMessage = await Message.create({
          conversation_id,
          sender_id: null,
          sender_type: "system",
          content: creationMessageContent,
          ConversationId: conversation_id,
        });
        socket.to(conversation_id).emit("new_msg", creationSystemMessage);
      }
      
      let replyToMsgId;
      const checkIfReplyToMsgExist = await Message.findByPk(reply_to_message?.id);
      if (checkIfReplyToMsgExist) {
        replyToMsgId = reply_to_message?.id;
      } else {
        replyToMsgId = null;
      }
      
      const msg = await Message.create({
        conversation_id,
        sender_id: userId,
        sender_type: "user",
        content: {
          text: content.text || null,
          attachment: content.attachment || null,
          attachment_type: content.attachment_type || null,
          attachment_metadata: content.attachment_metadata || null,
          voice_note: content.voice_note || null,
        },
        reply_to_message_id: replyToMsgId,
        ConversationId: conversation_id,
      });

      if (msg) {
        await conversation.update({
          last_message_at: msg.sent_at,
          last_message_id: msg.id,
        });

        // --- Store the server message ID in Redis using a Hash with TTL ---
        if (client_message_id) {
          
          await redis.hSet(client_message_id, 'serverMsgId', msg.id);
          await redis.expire(client_message_id, 3600);
        }
        // --- End Redis Caching ---
      }

      const participant = await Participant.findOne({
        where: {
          user_id: userId,
          conversation_id: conversation_id,
        },
        attributes: ["id"],
        raw: true,
      });

      const pId = participant.id;

      const existingReadStatus = await ReadStatus.findOne({
        where: {
          participant_id: pId,
          conversation_id: conversation_id,
        },
      });

      if (existingReadStatus) {
        await existingReadStatus.destroy();
      }

      await ReadStatus.create({
        participant_id: pId,
        conversation_id: conversation_id,
        read_at: new Date(),
      });

      socket.to(conversation_id).emit("new_msg", msg);

      if (typeof ack === "function") {
        ack({
          success: true,
          serverMsgId: msg.id,
        });
      }
    } catch (err) {
      console.error(err);
      if (typeof ack === "function") {
        ack({ success: false, error: err.message });
      }
    }
  });
};
