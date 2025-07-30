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

module.exports = function (io, socket) {
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
      const { conversation_id, content, reply_to_message } = payload;

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

      // Fetch the conversation, including last_message_at and type
      const conversation = await Conversation.findByPk(conversation_id, {
        attributes: ["id", "last_message_at", "type", "name", "creator_id"],
      });

      if (!conversation) {
        if (typeof ack === "function") {
          ack({ success: false, error: "Conversation not found" });
        }
        return;
      }

      // Check if this is the first message in the conversation
      const isNewConversation = !conversation.last_message_at;

      if (isNewConversation) {
        // Join the socket room for the new conversation
        socket.join(conversation_id);
        io.emit("refresh");

        // Send system message for conversation creation
        let creatorInfo = "";
        if (conversation.type === "private" || conversation.type === "group") {
          const creatorUser = await User.findByPk(conversation.creator_id); // Using the destructured User model
          creatorInfo = creatorUser ? creatorUser.username : "Unknown User";
        }

        const creationMessageContent = {
          text: `This ${conversation.type} chat was created by @${creatorInfo}.`,
          system_message: true, // Mark as a system message
          type: "initial_msg",
        };
        const creationSystemMessage = await Message.create({
          conversation_id,
          sender_id: null, // System messages have no sender
          sender_type: "system",
          content: creationMessageContent,
          ConversationId: conversation_id,
        });
        socket.to(conversation_id).emit("new_msg", creationSystemMessage);
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
        reply_to_message_id: reply_to_message?.id,
        ConversationId: conversation_id,
      });

      if (msg) {
        await conversation.update({
          last_message_at: msg.sent_at,
          last_message_id: msg.id,
        });
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

      // 1. Find if a ReadStatus record already exists for this participant and conversation
      const existingReadStatus = await ReadStatus.findOne({
        where: {
          participant_id: pId,
          conversation_id: conversation_id,
        },
      });

      // 2. If it exists, delete it
      if (existingReadStatus) {
        await existingReadStatus.destroy();
      }

      // 3. Always create a new ReadStatus record
      await ReadStatus.create({
        participant_id: pId,
        conversation_id: conversation_id,
        read_at: new Date(), // Set the current timestamp
        // If you want to track the last message read when created:
        // last_read_message_id: msgId,
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
