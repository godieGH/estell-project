'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // --- 1. Create all tables first without foreign key constraints within the table definition ---
    // Foreign keys will be added in a separate step after all tables exist.

    // Table: users
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true, // Unique constraint handled implicitly by Sequelize
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      email_verify_status: {
        type: Sequelize.BOOLEAN,
        defaultValue: 0,
      },
      account_status: {
        type: Sequelize.ENUM('system', 'google'),
        allowNull: false,
        defaultValue: 'system',
      },
      username: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true, // Unique constraint handled implicitly by Sequelize
      },
      avatar: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      contact: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      refresh_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), // Use literal for current timestamp
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), // Use literal for current timestamp
      },
    });

    // Table: posts
    await queryInterface.createTable('posts', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM('text', 'image', 'video'),
        allowNull: false,
        defaultValue: 'text',
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      media_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      thumbnail_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      original_media: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      link_url: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('published', 'draft', 'archived'),
        allowNull: false,
        defaultValue: 'published',
      },
      audience: {
        type: Sequelize.ENUM('public', 'friends', 'unlisted', 'private'),
        allowNull: false,
        defaultValue: 'public',
      },
      category: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      location: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      allow_comments: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: 1,
      },
      like_counts: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: 1,
      },
      keywords: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      schedule_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      media_metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
    });

    // Table: conversations
    await queryInterface.createTable('conversations', {
      id: {
        type: Sequelize.CHAR(36), // Or Sequelize.UUID for UUIDs
        allowNull: false,
        primaryKey: true,
      },
      type: {
        type: Sequelize.ENUM('private', 'group'),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      creator_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      participants_array: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      last_message_at: {
        type: Sequelize.DATE(3),
        allowNull: true,
      },
      last_message_id: {
        type: Sequelize.CHAR(36), // Or Sequelize.UUID
        allowNull: true,
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
      },
      updated_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
      },
    });

    // Table: participants (Crucial to create before conversations_read_status)
    await queryInterface.createTable('participants', {
      id: {
        type: Sequelize.CHAR(36), // Or Sequelize.UUID
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      conversation_id: {
        type: Sequelize.CHAR(36), // Or Sequelize.UUID
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('member', 'admin', 'creator'),
        allowNull: false,
        defaultValue: 'member',
      },
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      last_viewed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      left_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Table: conversations_read_status
    await queryInterface.createTable('conversations_read_status', {
      participant_id: {
        type: Sequelize.CHAR(36), // Or Sequelize.UUID
        allowNull: false,
        primaryKey: true, // Part of composite primary key
      },
      conversation_id: {
        type: Sequelize.CHAR(36), // Or Sequelize.UUID
        allowNull: false,
        primaryKey: true, // Part of composite primary key
      },
      xxxx: { // This column name 'xxxx' looks like a placeholder. You might want to rename it.
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      read_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
      },
      created_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
      },
    });

    // Table: comments
    await queryInterface.createTable('comments', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      post_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      commenter_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      comment_body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      parent_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true, // Self-referencing foreign key, can be null
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Table: comment_likes
    await queryInterface.createTable('comment_likes', {
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true, // Part of composite primary key
      },
      comment_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true, // Part of composite primary key
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Table: followers
    await queryInterface.createTable('followers', {
      follower_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true, // Part of composite primary key
      },
      followee_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true, // Part of composite primary key
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Table: likes
    await queryInterface.createTable('likes', {
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true, // Part of composite primary key
      },
      post_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true, // Part of composite primary key
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Table: messages
    await queryInterface.createTable('messages', {
      id: {
        type: Sequelize.CHAR(36), // Or Sequelize.UUID
        allowNull: false,
        primaryKey: true,
      },
      conversation_id: {
        type: Sequelize.CHAR(36), // Or Sequelize.UUID
        allowNull: false,
      },
      sender_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      sender_type: {
        type: Sequelize.ENUM('user', 'system'),
        allowNull: false,
      },
      content: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: 0,
      },
      is_edited: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: 0,
      },
      reply_to_message_id: {
        type: Sequelize.CHAR(36), // Or Sequelize.UUID, self-referencing
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
      },
      updated_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
      },
      ConversationId: { // This seems redundant with conversation_id, review if needed.
        type: Sequelize.CHAR(36), // Or Sequelize.UUID
        allowNull: true,
      },
    });

    // Table: password_reset_tokens
    await queryInterface.createTable('password_reset_tokens', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      jti: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true, // Unique constraint handled implicitly by Sequelize
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      used: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: 0,
      },
      userId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: true, // SQL dump has nullable createdAt/updatedAt for this table
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true, // SQL dump has nullable createdAt/updatedAt for this table
      },
    });

    // Table: shares
    await queryInterface.createTable('shares', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      post_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('copy_link', 'whatsapp_message', 'whatsapp_status', 'instagram', 'twitter', 'web_share'),
        allowNull: false,
        defaultValue: 'copy_link',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Table: user_preference
    await queryInterface.createTable('user_preference', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true, // Unique constraint handled implicitly by Sequelize
      },
      preference: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });


    // --- 2. Add all foreign key constraints ---
    // Note: Order matters here. Tables referenced by foreign keys must exist first.

    // comments table foreign keys
    await queryInterface.addConstraint('comments', {
      fields: ['post_id'],
      type: 'foreign key',
      name: 'comments_post_id_fk',
      references: {
        table: 'posts',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('comments', {
      fields: ['commenter_id'],
      type: 'foreign key',
      name: 'comments_commenter_id_fk',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('comments', {
      fields: ['parent_id'],
      type: 'foreign key',
      name: 'comments_parent_id_fk',
      references: {
        table: 'comments',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // comment_likes table foreign keys
    await queryInterface.addConstraint('comment_likes', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'comment_likes_user_id_fk',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('comment_likes', {
      fields: ['comment_id'],
      type: 'foreign key',
      name: 'comment_likes_comment_id_fk',
      references: {
        table: 'comments',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // conversations table foreign keys
    await queryInterface.addConstraint('conversations', {
      fields: ['creator_id'],
      type: 'foreign key',
      name: 'conversations_creator_id_fk',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // participants table foreign keys (crucial these are added AFTER users and conversations are created)
    await queryInterface.addConstraint('participants', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'participants_user_id_fk',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('participants', {
      fields: ['conversation_id'],
      type: 'foreign key',
      name: 'participants_conversation_id_fk',
      references: {
        table: 'conversations',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // conversations_read_status table foreign keys (crucial these are added AFTER participants and conversations)
    await queryInterface.addConstraint('conversations_read_status', {
      fields: ['participant_id'],
      type: 'foreign key',
      name: 'conversations_read_status_participant_id_fk',
      references: {
        table: 'participants',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('conversations_read_status', {
      fields: ['conversation_id'],
      type: 'foreign key',
      name: 'conversations_read_status_conversation_id_fk',
      references: {
        table: 'conversations',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // followers table foreign keys
    await queryInterface.addConstraint('followers', {
      fields: ['follower_id'],
      type: 'foreign key',
      name: 'followers_follower_id_fk',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('followers', {
      fields: ['followee_id'],
      type: 'foreign key',
      name: 'followers_followee_id_fk',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // likes table foreign keys
    await queryInterface.addConstraint('likes', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'likes_user_id_fk',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('likes', {
      fields: ['post_id'],
      type: 'foreign key',
      name: 'likes_post_id_fk',
      references: {
        table: 'posts',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // messages table foreign keys
    await queryInterface.addConstraint('messages', {
      fields: ['conversation_id'],
      type: 'foreign key',
      name: 'messages_conversation_id_fk',
      references: {
        table: 'conversations',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('messages', {
      fields: ['sender_id'],
      type: 'foreign key',
      name: 'messages_sender_id_fk',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('messages', {
      fields: ['reply_to_message_id'],
      type: 'foreign key',
      name: 'messages_reply_to_message_id_fk',
      references: {
        table: 'messages',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addConstraint('messages', {
      fields: ['ConversationId'],
      type: 'foreign key',
      name: 'messages_ConversationId_fk',
      references: {
        table: 'conversations',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // password_reset_tokens table foreign keys
    await queryInterface.addConstraint('password_reset_tokens', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'password_reset_tokens_userId_fk',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // posts table foreign keys
    await queryInterface.addConstraint('posts', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'posts_user_id_fk',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // shares table foreign keys
    await queryInterface.addConstraint('shares', {
      fields: ['post_id'],
      type: 'foreign key',
      name: 'shares_post_id_fk',
      references: {
        table: 'posts',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // user_preference table foreign keys
    await queryInterface.addConstraint('user_preference', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'user_preference_userId_fk',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });


    // --- 3. Add composite unique indexes ---
    // These were defined as UNIQUE KEY in the dump, which Sequelize usually handles with `unique: true`
    // on a single column. For composite unique keys, `addConstraint` or `addIndex` is needed.

    await queryInterface.addConstraint('comment_likes', {
      fields: ['user_id', 'comment_id'],
      type: 'unique',
      name: 'comment_likes_user_id_comment_id_unique',
    });

    await queryInterface.addConstraint('conversations_read_status', {
      fields: ['participant_id', 'conversation_id'],
      type: 'unique',
      name: 'conversations_read_status_participant_id_conversation_id_unique',
    });

    await queryInterface.addConstraint('followers', {
      fields: ['follower_id', 'followee_id'],
      type: 'unique',
      name: 'followers_follower_id_followee_id_unique',
    });

    await queryInterface.addConstraint('likes', {
      fields: ['user_id', 'post_id'],
      type: 'unique',
      name: 'likes_user_id_post_id_unique', // Corresponds to `likes_post_id_user_id_unique` and `likes_user_id_post_id` in SQL dump
    });

    await queryInterface.addConstraint('participants', {
      fields: ['user_id', 'conversation_id'],
      type: 'unique',
      name: 'participants_user_id_conversation_id_unique',
    });


    // --- 4. Add additional non-unique indexes from the SQL dump ---
    // These help with query performance but don't enforce uniqueness.
    await queryInterface.addIndex('comments', ['post_id'], { name: 'comments_post_id_idx' });
    await queryInterface.addIndex('comments', ['commenter_id'], { name: 'comments_commenter_id_idx' });
    await queryInterface.addIndex('comments', ['parent_id'], { name: 'comments_parent_id_idx' });

    await queryInterface.addIndex('conversations', ['creator_id'], { name: 'conversations_creator_id_idx' });

    await queryInterface.addIndex('conversations_read_status', ['conversation_id'], { name: 'conversations_read_status_conversation_id_idx' });

    await queryInterface.addIndex('followers', ['followee_id'], { name: 'followers_followee_id_idx' });

    await queryInterface.addIndex('likes', ['post_id'], { name: 'likes_post_id_idx' });

    await queryInterface.addIndex('messages', ['conversation_id'], { name: 'messages_conversation_id_idx' });
    await queryInterface.addIndex('messages', ['sender_id'], { name: 'messages_sender_id_idx' });
    await queryInterface.addIndex('messages', ['reply_to_message_id'], { name: 'messages_reply_to_message_id_idx' });
    await queryInterface.addIndex('messages', ['ConversationId'], { name: 'messages_ConversationId_idx' });

    await queryInterface.addIndex('participants', ['conversation_id'], { name: 'participants_conversation_id_idx' });

    await queryInterface.addIndex('posts', ['user_id'], { name: 'posts_user_id_idx' });

    await queryInterface.addIndex('shares', ['post_id'], { name: 'shares_post_id_idx' });
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse the order of operations in `down` as well.
    // Remove indexes and constraints first, then drop tables.

    // --- 1. Remove additional non-unique indexes ---
    await queryInterface.removeIndex('comments', 'comments_post_id_idx');
    await queryInterface.removeIndex('comments', 'comments_commenter_id_idx');
    await queryInterface.removeIndex('comments', 'comments_parent_id_idx');
    await queryInterface.removeIndex('conversations', 'conversations_creator_id_idx');
    await queryInterface.removeIndex('conversations_read_status', 'conversations_read_status_conversation_id_idx');
    await queryInterface.removeIndex('followers', 'followers_followee_id_idx');
    await queryInterface.removeIndex('likes', 'likes_post_id_idx');
    await queryInterface.removeIndex('messages', 'messages_conversation_id_idx');
    await queryInterface.removeIndex('messages', 'messages_sender_id_idx');
    await queryInterface.removeIndex('messages', 'messages_reply_to_message_id_idx');
    await queryInterface.removeIndex('messages', 'messages_ConversationId_idx');
    await queryInterface.removeIndex('participants', 'participants_conversation_id_idx');
    await queryInterface.removeIndex('posts', 'posts_user_id_idx');
    await queryInterface.removeIndex('shares', 'shares_post_id_idx');

    // --- 2. Remove composite unique constraints (added with addConstraint) ---
    await queryInterface.removeConstraint('comment_likes', 'comment_likes_user_id_comment_id_unique');
    await queryInterface.removeConstraint('conversations_read_status', 'conversations_read_status_participant_id_conversation_id_unique');
    await queryInterface.removeConstraint('followers', 'followers_follower_id_followee_id_unique');
    await queryInterface.removeConstraint('likes', 'likes_user_id_post_id_unique');
    await queryInterface.removeConstraint('participants', 'participants_user_id_conversation_id_unique');

    // --- 3. Remove Foreign Keys ---
    // Remove in reverse order of creation, ensuring no table is referenced by an FK before being dropped.
    await queryInterface.removeConstraint('user_preference', 'user_preference_userId_fk');
    await queryInterface.removeConstraint('shares', 'shares_post_id_fk');
    await queryInterface.removeConstraint('posts', 'posts_user_id_fk');
    await queryInterface.removeConstraint('password_reset_tokens', 'password_reset_tokens_userId_fk');
    await queryInterface.removeConstraint('messages', 'messages_ConversationId_fk');
    await queryInterface.removeConstraint('messages', 'messages_reply_to_message_id_fk');
    await queryInterface.removeConstraint('messages', 'messages_sender_id_fk');
    await queryInterface.removeConstraint('messages', 'messages_conversation_id_fk');
    await queryInterface.removeConstraint('likes', 'likes_post_id_fk');
    await queryInterface.removeConstraint('likes', 'likes_user_id_fk');
    await queryInterface.removeConstraint('followers', 'followers_followee_id_fk');
    await queryInterface.removeConstraint('followers', 'followers_follower_id_fk');
    await queryInterface.removeConstraint('conversations_read_status', 'conversations_read_status_conversation_id_fk');
    await queryInterface.removeConstraint('conversations_read_status', 'conversations_read_status_participant_id_fk');
    await queryInterface.removeConstraint('participants', 'participants_conversation_id_fk');
    await queryInterface.removeConstraint('participants', 'participants_user_id_fk');
    await queryInterface.removeConstraint('conversations', 'conversations_creator_id_fk');
    await queryInterface.removeConstraint('comment_likes', 'comment_likes_comment_id_fk');
    await queryInterface.removeConstraint('comment_likes', 'comment_likes_user_id_fk');
    await queryInterface.removeConstraint('comments', 'comments_parent_id_fk');
    await queryInterface.removeConstraint('comments', 'comments_commenter_id_fk');
    await queryInterface.removeConstraint('comments', 'comments_post_id_fk');


    // --- 4. Drop all tables ---
    // Drop in reverse order of creation, or order that satisfies foreign key dependencies (i.e., children before parents).
    await queryInterface.dropTable('user_preference');
    await queryInterface.dropTable('shares');
    await queryInterface.dropTable('password_reset_tokens');
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('likes');
    await queryInterface.dropTable('followers');
    await queryInterface.dropTable('conversations_read_status');
    await queryInterface.dropTable('comment_likes');
    await queryInterface.dropTable('comments');
    await queryInterface.dropTable('participants'); // Drop participants before conversations (dependency)
    await queryInterface.dropTable('conversations');
    await queryInterface.dropTable('posts');
    await queryInterface.dropTable('users');
  }
};
