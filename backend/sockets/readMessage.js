const { Participant, Conversation, ReadStatus } = require('../models');
const { Op } = require('sequelize'); // Import Op

module.exports = async function(io, socket) {
   socket.on("message_read", async ({ conversation_id, user_id, last_message_sent_at }) => { // Added last_message_sent_at as an example
      try {
         const participant = await Participant.findOne({
            where: {
               conversation_id: conversation_id, // Directly use conversation_id
               user_id: user_id // Directly use user_id
            }
         });

         let participant_id;
         if (participant) {
             participant_id = participant.id;
         } else {
             console.error(`Participant not found for conversation_id: ${conversation_id}, user_id: ${user_id}. Cannot update read status.`);
             return; // Exit if participant not found
         }

         // Determine the timestamp to mark as read.
         // Option 1: Use the current server time (most common for "read" events)
         const readTimestamp = new Date();
         // Option 2: Use a timestamp sent from the client (e.g., the sent_at of the last message read)
         // const readTimestamp = last_message_sent_at || new Date(); // If client provides it, else current time

         const read_status = await ReadStatus.findOne({
            where: {
               conversation_id: conversation_id,
               participant_id: participant_id
            }
         });

         if (read_status) {
            // Update the read_at timestamp.
            await read_status.update({
               xxxx: readTimestamp, // Correct column name and value
            });
            console.log(`Read status updated for conversation ${conversation_id} by participant ${participant_id}.`);
         } else {
            // Create a new read status entry.
            await ReadStatus.create({
               conversation_id: conversation_id,
               participant_id: participant_id,
               read_at: readTimestamp // Correct column name and value
            });
            console.log(`Read status created for conversation ${conversation_id} by participant ${participant_id}.`);
         }
      } catch (error) {
         console.error("Error processing message_read event:", error);
         // You might want to emit an error back to the client or log it more extensively
      }
   });
};
