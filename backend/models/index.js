// models/index.js
const sequelize = require("../db");
const User = require("./User");
const Follower = require("./Follower");
const Post = require("./Post");
const PasswordResetToken = require("./PasswordResetToken");
const UserPreference = require("./UserPreference");
const Likes = require("./Like");
const Comment = require("./Comment");
const CommentLike = require("./CommentLike");
const Share = require("./Share");
const Conversation = require("./Conversation");
const Participant = require("./Participant");
const Message = require("./Message");
const ReadStatus = require("./ReadStatus");

// 1) Followers (self-referential many-to-many)
User.belongsToMany(User, {
  through: Follower,
  as: "Followees",
  foreignKey: "follower_id",
  otherKey: "followee_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
User.belongsToMany(User, {
  through: Follower,
  as: "Followers",
  foreignKey: "followee_id",
  otherKey: "follower_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
User.hasMany(Conversation, {
  as: "createdConversations",
  foreignKey: "creator_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
User.hasMany(Message, {
  as: "sentMessages",
  foreignKey: "sender_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// 2) User ↔ Posts
Post.belongsTo(User, {
  foreignKey: "user_id",
  as: "user", // ← keep this as "user" so your route.include.as: "user" works
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
User.hasMany(Post, {
  foreignKey: "user_id",
  as: "posts",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// 3) Likes associations
// 3a) A User has many Likes
User.hasMany(Likes, {
  foreignKey: "user_id",
  as: "likes",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// 3b) A Post has many Likes (all)
Post.hasMany(Likes, {
  foreignKey: "post_id",
  as: "likes",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// 3c) A Post has many Likes (just this user’s)—only declare this once!
Post.hasMany(Likes, {
  foreignKey: "post_id",
  as: "myLikes",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// 3d) Convenience belongsToMany for getLikedPosts() / getLikers()
User.belongsToMany(Post, {
  through: Likes,
  foreignKey: "user_id",
  otherKey: "post_id",
  as: "likedPosts",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Post.belongsToMany(User, {
  through: Likes,
  foreignKey: "post_id",
  otherKey: "user_id",
  as: "likers",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// 4) (Optional) Any other cross-model hooks…
Conversation.hasMany(Participant, {
  foreignKey: "conversation_id",
  as: "participants",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Conversation.belongsTo(User, {
  foreignKey: "creator_id",
  as: "creator",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Conversation.hasMany(Message, {
  primaryKey: "conversation_id",
  as: "messages",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Participant.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Participant.belongsTo(Conversation, {
  foreignKey: "conversation_id",
  as: "conversation",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Associations
Message.belongsTo(Conversation, {
  foreignKey: "conversation_id",
  as: "conversation",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Message.belongsTo(User, {
  foreignKey: "sender_id",
  as: "sender",
  onDelete: "SET NULL", // If a user is deleted, sender_id for their messages can be set to NULL
  onUpdate: "CASCADE",
});

// Self-referencing association for replies
Message.belongsTo(Message, {
  as: "replyTo", // Alias for the association
  foreignKey: "reply_to_message_id",
  targetKey: "id", // Target the 'id' column of the Message model
  onDelete: "SET NULL", // If the parent message is deleted, the reply link is set to null
  onUpdate: "CASCADE",
});

// You might also want a hasMany association for replies from the parent's perspective
Message.hasMany(Message, {
  as: "replies",
  foreignKey: "reply_to_message_id",
  sourceKey: "id",
});

// Define the Many-to-Many association
Participant.belongsToMany(Conversation, {
  through: ReadStatus, // Specify the junction model
  foreignKey: "participant_id", // Foreign key in ReadStatus referencing Participant
  otherKey: "conversation_id", // Foreign key in ReadStatus referencing Conversation
  as: "readConversations", // Alias for when fetching conversations through a participant
});

Conversation.belongsToMany(Participant, {
  through: ReadStatus, // Specify the junction model
  foreignKey: "conversation_id", // Foreign key in ReadStatus referencing Conversation
  otherKey: "participant_id", // Foreign key in ReadStatus referencing Participant
  as: "readers", // Alias for when fetching participants through a conversation
});

ReadStatus.belongsTo(Participant, {
  foreignKey: "participant_id",
});

ReadStatus.belongsTo(Conversation, {
  foreignKey: "conversation_id",
});


module.exports = {
  sequelize,
  User,
  Follower,
  Post,
  PasswordResetToken,
  UserPreference,
  Likes,
  Comment,
  CommentLike,
  Share,
  Conversation,
  Participant,
  Message,
  ReadStatus,
};
