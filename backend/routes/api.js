const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { Op, fn, col } = require("sequelize");
const { authenticateAccess } = require("../middleware/JwtAccessTokenAuth.js");
const {
  sequelize,
  Follower,
  Post,
  User,
  Likes,
  Comment,
  CommentLike,
  Share,
  Conversation,
  Participant,
  Message,
  ReadStatus,
} = require("../models");
const { encrypt, decrypt } = require("../utils/encryption"); // Adjust path as needed

router.get("/", async (req, res) => {

  try {
    await sequelize.authenticate();
    
    
    res.status(200).json({ status: "ok", message: "Service is ready" });
  } catch (err) {
    console.error("Database connection failed:", err);
    res.status(503).json({
      status: "error",
      message: "Service not available. Database connection failed.",
    });
  }
});

router.get("/feeds/fetch-feeds", authenticateAccess, async (req, res) => {
  try {
    const { cursor: encryptedCursor, limit: limitStr } = req.query;
    const limit = parseInt(limitStr, 10) || 10; // Default limit to 10 if not provided or invalid

    let whereClause = {};
    let cursorId = null;
    let cursorCreatedAt = null;

    if (encryptedCursor) {
      try {
        const decryptedCursor = decrypt(encryptedCursor);
        const [id, createdAt] = decryptedCursor.split("_");
        cursorId = id;
        cursorCreatedAt = new Date(createdAt);

        whereClause = {
          [Op.or]: [
            { createdAt: { [Op.lt]: cursorCreatedAt } },
            {
              createdAt: cursorCreatedAt,
              id: { [Op.lt]: cursorId },
            },
          ],
        };
      } catch (decryptErr) {
        console.error("Error decrypting cursor:", decryptErr);
        return res.status(400).json({ error: "Invalid cursor." });
      }
    }

    // 1. Pull list of user IDs that *you* follow
    const followeeRows = await Follower.findAll({
      where: { follower_id: req.userId },
      attributes: ["followee_id"],
    });
    const followingSet = new Set(followeeRows.map((f) => f.followee_id));

    // 2. Grab posts
    const posts = await Post.findAll({
      where: {
        ...whereClause, // Apply the cursor-based where clause
        // Add the audience filter
        audience: {
          [Op.in]: ["public", "friends"],
        },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "username", "avatar"],
        },
        { model: Likes, as: "likes", attributes: ["user_id"], required: false },
        {
          model: Likes,
          as: "myLikes",
          attributes: ["user_id"],
          where: { user_id: req.userId },
          required: false,
        },
        { model: Comment, as: "comments", required: false },
        { model: Share, as: "shares", required: false },
      ],
      order: [
        ["createdAt", "DESC"], // Primary sort by createdAt
        ["id", "DESC"], // Secondary sort by id for stable ordering
      ],
      limit: limit + 1, // Fetch one extra post to determine if there's a next page
    });

    let nextCursor = null;
    let postsToSend = posts;

    // Check if we fetched one more than the limit, indicating there are more posts
    if (posts.length > limit) {
      const lastPost = posts[limit - 1]; // The last post *within* the limit
      postsToSend = posts.slice(0, limit); // Slice off the extra post
      // Create the composite cursor (id_createdAt) from the last post returned to the client
      nextCursor = encrypt(
        `${lastPost.id}_${lastPost.createdAt.toISOString()}`,
      );
    }

    // 3. Slap on isFollowing per post.user.id
    const sanitized = postsToSend.map((p) => {
      const u = p.user.toJSON();
      return {
        id: p.id,
        user: {
          ...u,
          isFollowing: followingSet.has(u.id),
        },
        type: p.type,
        body: p.body,
        mediaUrl: p.mediaUrl
          ? p.mediaUrl + "?" + Math.floor(Date.now() / 1000)
          : null, // Handle null mediaUrl
        thumbnailUrl: p.thumbnailUrl
          ? p.thumbnailUrl + "?" + Math.floor(Date.now() / 1000)
          : null, // Handle null mediaUrl
        linkUrl: p.linkUrl,
        audience: p.audience,
        location: p.location,
        likeCounts: p.likeCounts,
        comments: p.allow_comments, // Assuming you mean p.allow_comments for comments setting
        keywords: p.keywords,
        likes: p.likes.length,
        likedByMe: p.myLikes.length > 0,
        commentCounts: p.comments.length,
        shareCounts: p.shares.length,
        createdAt: p.createdAt,
      };
    });

    res.json({ posts: sanitized, nextCursor: nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server fucked up." });
  }
});

router.post("/put/post/:id/comment", authenticateAccess, async (req, res) => {
  try {
    const comment = req.body.q;
    const postId = req.params.id;
    const userId = req.userId;
    const parent_id = req.body.parent_id || null;

    await Comment.create({
      commenter_id: userId,
      post_id: postId,
      comment_body: comment,
      parent_id,
    });

    res.status(200).json("donw");
  } catch (err) {
    res.status(500);
    console.error(err.message);
  }
});

router.get("/post/:id/comments", authenticateAccess, async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.userId;

    const post = await Post.findOne({
      where: { id: postId },
      include: [
        {
          model: Comment,
          as: "comments",
          where: { parent_id: null },
          separate: true,
          order: [["createdAt", "DESC"]],
          include: [
            {
              model: User,
              as: "commenter",
              attributes: ["id", "avatar", "username"],
            },
            {
              model: Comment,
              as: "replies",
              separate: true,
              order: [["createdAt", "DESC"]],
              include: [
                {
                  model: User,
                  as: "commenter",
                  attributes: ["id", "avatar", "username"],
                },
                {
                  model: CommentLike,
                  as: "_likes",
                  attributes: ["user_id"],
                  where: { user_id: currentUserId },
                  required: false,
                },
              ],
            },
            {
              model: CommentLike,
              as: "_likes",
              attributes: ["user_id"],
              where: { user_id: currentUserId },
              required: false,
            },
          ],
        },
      ],
    });

    if (!post?.comments?.length) {
      return res.status(200).json([]);
    }

    // collect all comment & reply IDs
    const commentIds = post.comments.map((c) => c.id);
    const replyIds = post.comments.flatMap((c) => c.replies.map((r) => r.id));
    const allIds = [...commentIds, ...replyIds];

    // bulk-count likes per comment_id
    const rawCounts = await CommentLike.findAll({
      where: { comment_id: { [Op.in]: allIds } },
      attributes: [
        "comment_id",
        [fn("COUNT", col("comment_id")), "likesCount"],
      ],
      group: ["comment_id"],
    });

    // make a lookup: { [comment_id]: likesCount }
    const countMap = rawCounts.reduce((acc, row) => {
      acc[row.comment_id] = parseInt(row.get("likesCount"), 10);
      return acc;
    }, {});

    // build response
    const commentsWithLikeStatus = post.comments.map((comment) => {
      const isLiked = comment._likes.length > 0;
      const likesCount = countMap[comment.id] || 0;

      const replies = comment.replies.map((reply) => {
        const isReplyLiked = reply._likes.length > 0;
        const replyLikesCount = countMap[reply.id] || 0;

        return {
          ...reply.toJSON(),
          isLiked: isReplyLiked,
          likesCount: replyLikesCount,
        };
      });

      return {
        ...comment.toJSON(),
        isLiked,
        likesCount,
        replies,
      };
    });

    return res.status(200).json(commentsWithLikeStatus);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Unexpected server error." });
  }
});

router.post("/comment/:id/toggleLike", authenticateAccess, async (req, res) => {
  const commentId = Number(req.params.id);
  const userId = req.userId;

  try {
    // see if this user already liked it
    const existing = await CommentLike.findOne({
      where: { comment_id: commentId, user_id: userId },
    });

    let isLiked;
    if (existing) {
      // user wants to unlike
      await existing.destroy();
      isLiked = false;
    } else {
      // create a new like
      await CommentLike.create({ comment_id: commentId, user_id: userId });
      isLiked = true;
    }

    // count how many likes remain
    const likesCount = await CommentLike.count({
      where: { comment_id: commentId },
    });

    return res.json({ isLiked, likesCount });
  } catch (err) {
    console.error("toggleLike error:", err);
    return res.status(500).json({ error: "Server fucked up." });
  }
});

router.post(
  "/share/post/:post_id/type/:shareType/",
  authenticateAccess,
  async (req, res) => {
    //console.log(req.params.post_id, req.params.shareType)

    try {
      await Share.create({
        type: req.params.shareType,
        post_id: req.params.post_id,
      });

      res.status(200).json("done");
    } catch (err) {
      console.error(err.message);
    }
  },
);

router.get(
  "/posts/mine/:cursor/:limit",
  authenticateAccess,
  async (req, res) => {
    try {
      const { cursor, limit } = req.params;
      const limitNum = parseInt(limit, 10);
      const cursorId = parseInt(cursor, 10);

      if (isNaN(limitNum) || limitNum <= 0) {
        return res.status(400).json({ message: "Invalid limit provided." });
      }
      if (isNaN(cursorId) && cursorId !== 0) {
        // Allow cursor to be 0 for the first page
        return res.status(400).json({ message: "Invalid cursor provided." });
      }

      let whereClause = {
        userId: req.userId, // Ensure posts belong to the authenticated user
      };

      if (cursorId !== 0) {
        whereClause.id = {
          [Op.lt]: cursorId,
        };
      }

      const posts = await Post.findAll({
        where: whereClause,
        order: [
          ["createdAt", "DESC"],
          ["id", "DESC"],
        ], // Crucial for consistent pagination
        limit: limitNum,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "avatar"],
          },
          {
            model: Likes,
            as: "myLikes",
            attributes: ["user_id"],
            where: { user_id: req.userId },
            required: false,
          },
        ],
      });

      let nextCursor = null;
      if (posts.length === limitNum) {
        nextCursor = posts[posts.length - 1].id;
      }

      res.json({
        posts: posts,
        nextCursor: nextCursor,
      });
    } catch (err) {
      console.error("Error fetching user posts:", err); // Log the error for debugging
      res.status(500).json({ message: err.message });
    }
  },
);

router.get(
  "/posts/:id/:cursor/:limit",
  authenticateAccess,
  async (req, res) => {
    try {
      const { cursor, limit } = req.params;
      const limitNum = parseInt(limit, 10);
      const cursorId = parseInt(cursor, 10);

      if (isNaN(limitNum) || limitNum <= 0) {
        return res.status(400).json({ message: "Invalid limit provided." });
      }
      if (isNaN(cursorId) && cursorId !== 0) {
        // Allow cursor to be 0 for the first page
        return res.status(400).json({ message: "Invalid cursor provided." });
      }

      let whereClause = {
        [Op.and]: [
          { userId: req.params.id },
          { audience: { [Op.notIn]: ["private", "unlisted"] } }, // Modified line
        ],
      };

      if (cursorId !== 0) {
        whereClause.id = {
          [Op.lt]: cursorId,
        };
      }

      const posts = await Post.findAll({
        where: whereClause,
        order: [
          ["createdAt", "DESC"],
          ["id", "DESC"],
        ], // Crucial for consistent pagination
        limit: limitNum,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "avatar"],
          },
          {
            model: Likes,
            as: "myLikes",
            attributes: ["user_id"],
            where: { user_id: req.userId },
            required: false,
          },
        ],
      });

      let nextCursor = null;
      if (posts.length === limitNum) {
        nextCursor = posts[posts.length - 1].id;
      }

      res.json({
        posts: posts,
        nextCursor: nextCursor,
      });
    } catch (err) {
      console.error("Error fetching user posts:", err); // Log the error for debugging
      res.status(500).json({ message: err.message });
    }
  },
);

router.get(
  "/post/:postId/actions/counts",
  authenticateAccess,
  async (req, res) => {
    try {
      const post = await Post.findByPk(req.params.postId, {
        include: [
          {
            model: Likes,
            as: "likes",
            attributes: ["user_id"],
          },
          {
            model: Comment,
            as: "comments",
            attributes: ["id"],
          },
          {
            model: Share,
            as: "shares",
            attributes: ["id"],
          },
        ],
      });

      res.json({
        likesCount: post.likes.length,
        sharesCount: post.shares.length,
        commentsCount: post.comments.length,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.delete("/post/:id/delete", authenticateAccess, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    // This path should correctly point to your 'uploads' directory
    // e.g., /data/data/com.termux/files/home/htdocs/backend/uploads/
    const uploadRootPath = path.join(__dirname, "../uploads/");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Exact values from your DB based on your description:
    // mediaUrl:       '/uploads/hls/file-6-1750807750402/master.m3u8' (points to a file INSIDE the HLS folder)
    // thumbnailUrl:   '/uploads/thumbnails/file-6-1750807750402-thumbnail.jpg'
    // originalMedia:  '/uploads/posts/file-6-1750807750402.mp4' (this is the actual video file)
    const mediaUrl = post.mediaUrl;
    const thumbnailUrl = post.thumbnailUrl;
    const originalMedia = post.originalMedia; // This is crucial for the original video file
    const type = post.type; // 'text', 'image', or 'video'

    // Helper to safely delete a single file
    const deleteFile = async (absoluteFilePath) => {
      return new Promise((resolve) => {
        fs.unlink(absoluteFilePath, (err) => {
          if (err) {
            if (err.code === "ENOENT") {
              console.log(
                `File not found, skipping deletion: ${absoluteFilePath}`,
              );
            } else {
              console.error(`Error deleting file ${absoluteFilePath}:`, err);
            }
            resolve(); // Resolve even on error, so the deletion process continues
          } else {
            console.log(`Successfully deleted file: ${absoluteFilePath}`);
            resolve();
          }
        });
      });
    };

    // Helper to safely delete a directory recursively
    const deleteDirectory = async (absoluteDirPath) => {
      return new Promise((resolve) => {
        if (fs.existsSync(absoluteDirPath)) {
          fs.promises
            .rm(absoluteDirPath, { recursive: true, force: true })
            .then(() => {
              console.log(`Successfully deleted directory: ${absoluteDirPath}`);
              resolve();
            })
            .catch((err) => {
              console.error(
                `Error deleting directory ${absoluteDirPath}:`,
                err,
              );
              resolve(); // Resolve even on error, so the deletion process continues
            });
        } else {
          console.log(
            `Directory not found, skipping deletion: ${absoluteDirPath}`,
          );
          resolve();
        }
      });
    };

    // Helper to strip '/uploads/' or 'uploads/' prefix and get path relative to uploadRootPath
    const getRelativePathFromUploads = (fullDbPath) => {
      if (!fullDbPath) return "";
      if (fullDbPath.startsWith("/uploads/")) {
        return fullDbPath.substring("/uploads/".length);
      } else if (fullDbPath.startsWith("uploads/")) {
        return fullDbPath.substring("uploads/".length);
      }
      return fullDbPath; // Return as is if no 'uploads/' prefix (shouldn't happen with your DB)
    };

    // Function to extract the unique file identifier (e.g., 'file-X-YYYY...')
    // This is best derived from the original video or image file name as it's consistent across types.
    const extractBaseFileIdentifier = (fullPathFromDb) => {
      if (!fullPathFromDb) return "";
      const fileNameWithExt = path.basename(fullPathFromDb); // e.g., 'file-6-1750807750402.mp4'
      const match = fileNameWithExt.match(/^(file-\d+-\d+)/); // Extracts 'file-X-YYYY...'
      return match ? match[1] : "";
    };

    if (type !== "text") {
      const filesToDelete = [];
      let baseFileIdentifier = "";

      if (type === "image") {
        // For images, originalMedia or mediaUrl should point to the image file in /uploads/posts/
        // Assuming image path is in `originalMedia` if `type` is 'image'. If not, adjust to `mediaUrl`.
        const imagePathInDb = originalMedia || mediaUrl; // Prioritize originalMedia, fallback to mediaUrl
        if (imagePathInDb) {
          const absoluteImagePath = path.join(
            uploadRootPath,
            getRelativePathFromUploads(imagePathInDb),
          );
          filesToDelete.push(absoluteImagePath);
          console.log(`Adding image to delete: ${absoluteImagePath}`); // Debugging
        }
      } else if (type === "video") {
        // 1. Delete the original video file (.mp4) from /uploads/posts/
        if (originalMedia) {
          const absoluteOriginalMediaPath = path.join(
            uploadRootPath,
            getRelativePathFromUploads(originalMedia),
          );
          filesToDelete.push(absoluteOriginalMediaPath);
          console.log(
            `Adding original video to delete: ${absoluteOriginalMediaPath}`,
          ); // Debugging

          // Extract the base identifier from the original video path
          baseFileIdentifier = extractBaseFileIdentifier(originalMedia);
        }

        // 2. Delete the thumbnail file (.jpg) from /uploads/thumbnails/
        if (thumbnailUrl) {
          const absoluteThumbnailPath = path.join(
            uploadRootPath,
            getRelativePathFromUploads(thumbnailUrl),
          );
          filesToDelete.push(absoluteThumbnailPath);
          console.log(`Adding thumbnail to delete: ${absoluteThumbnailPath}`); // Debugging
        }

        // 3. Delete the entire HLS folder from /uploads/hls/
        // This is crucial. The HLS folder is named by the baseFileIdentifier.
        if (baseFileIdentifier) {
          const hlsFolderPath = path.join(
            uploadRootPath,
            "hls",
            baseFileIdentifier,
          );
          console.log(`Attempting to delete HLS folder: ${hlsFolderPath}`);
          await deleteDirectory(hlsFolderPath); // Await the directory deletion
        }
      }

      // Now, execute all collected file deletions
      for (const filePath of filesToDelete) {
        await deleteFile(filePath);
      }
    }

    // Finally, delete the post from the database
    await post.destroy();
    res.status(200).json("Post and associated media deleted successfully");
  } catch (err) {
    console.error("Error in delete post route:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * This is where DM logic start
 *
 */

router.get("/all/people/to/dm", authenticateAccess, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: [
        {
          model: User,
          as: "Followees",
          attributes: ["id", "name", "username", "avatar"],
        },
      ],
      attributes: ["id"],
    });

    res.json([...user.Followees]);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

function generateRandomStringConcise(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length)),
  ).join("");
}

router.post("/start/a/chart", authenticateAccess, async (req, res) => {
  try {
    const participants = [...req.body.participants, req.userId].sort();
    const { type } = req.body;

    if (type === "private") {
      const allConversations = await Conversation.findAll({
        where: {
          type: "private",
        },
      });

      const existingConvo = allConversations.find((a) => {
        return (
          (a.participants_array[0] === participants[0] ||
            a.participants_array[0] === participants[1]) &&
          (a.participants_array[1] === participants[0] ||
            a.participants_array[1] === participants[1])
        );
      });
      if (existingConvo) {
        return res.json(existingConvo);
      }
    }

    const createConversation = await Conversation.create({
      type,
      name:
        participants.length > 2
          ? `GROUP - ${generateRandomStringConcise(5)}`
          : null,
      creator_id: req.userId,
      participants_array: participants,
    });

    if (createConversation) {
      await Promise.all(
        participants.map(async (pId) => {
          await Participant.create({
            user_id: pId,
            conversation_id: createConversation.id,
            role: type === "group" && pId === req.userId ? "creator" : "member",
          });
        }),
      );
    }

    res.json(createConversation);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

router.post("/open/chart", authenticateAccess, async (req, res) => {
  try {
    const { type, conversationId: conversation_id } = req.body;

    if (type === "private" || type === "group") {
      const conversation = await Conversation.findByPk(conversation_id);

      if (conversation) {
        return res.json(conversation);
      }
    }
  } catch (err) {
    res.status(500).json(err.message);
  }
});

router.get(
  "/get/current/convo/:convo_id/user/to/display",
  authenticateAccess,
  async (req, res) => {
    try {
      const conversation = await Conversation.findByPk(req.params.convo_id, {
        include: [
          {
            model: Participant,
            as: "participants",
            where: { user_id: { [Op.ne]: req.userId } },
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "username", "name", "avatar"],
              },
            ],
            attributes: ["id"],
          },
        ],
        attributes: ["id"],
      });
      res.json(conversation.participants[0].user);
    } catch (err) {
      res.json.status(500).json(err.message);
    }
  },
);

router.get(
  "/get/all/user/conversations/:type",
  authenticateAccess,
  async (req, res) => {
    try {
      const userId = req.userId; // Assuming req.userId is correctly set by authenticateAccess

      // Common logic for both private and group conversations (getting user's participant entries)
      const participantConversations = await Participant.findAll({
        where: {
          user_id: userId,
        },
        attributes: ["conversation_id", "id"], // 'id' here is the Participant ID
        raw: true,
      });

      const conversationIds = participantConversations.map(
        (p) => p.conversation_id,
      );

      const userParticipantIdMap = new Map(
        participantConversations.map((p) => [p.conversation_id, p.id]),
      );

      if (conversationIds.length === 0) {
        return res.json([]);
      }

      // Determine conversation type
      const conversationType =
        req.params.type === "private" ? "private" : "group";

      // Fetch conversations based on type
      const conversations = await Conversation.findAll({
        where: {
          id: { [Op.in]: conversationIds },
          type: conversationType,
        },
        order: [["last_message_at", "DESC"]],
        raw: true,
      });

      // Filter out conversations that don't match the requested type
      const filteredConversationIds = conversations.map((conv) => conv.id);

      if (filteredConversationIds.length === 0) {
        return res.json([]);
      }

      // --- ReadStatus and Unread Count Calculation (Common Logic) ---
      const currentUserParticipantIds = Array.from(
        userParticipantIdMap.values(),
      );

      const readStatuses = await ReadStatus.findAll({
        where: {
          participant_id: { [Op.in]: currentUserParticipantIds },
          conversation_id: { [Op.in]: filteredConversationIds },
        },
        attributes: ["conversation_id", "read_at", "participant_id"],
        raw: true,
      });

      const readStatusMap = new Map();
      readStatuses.forEach((rs) => {
        // Ensure the read status belongs to the current user's participant entry for that conversation
        if (
          userParticipantIdMap.get(rs.conversation_id) === rs.participant_id
        ) {
          readStatusMap.set(rs.conversation_id, rs.read_at);
        }
      });

      const unreadCountsPromises = conversations.map(async (conv) => {
        const readAt = readStatusMap.get(conv.id);
        let unreadCount = 0;

        if (readAt) {
          unreadCount = await Message.count({
            where: {
              conversation_id: conv.id,
              sent_at: { [Op.gt]: readAt },
            },
          });
        } else {
          // If no read_at status exists for this conversation for the current user,
          // it means they haven't read any messages yet, so count all messages.
          unreadCount = await Message.count({
            where: {
              conversation_id: conv.id,
            },
          });
        }
        return { conversation_id: conv.id, unreadCount };
      });

      const unreadCounts = await Promise.all(unreadCountsPromises);
      const unreadCountsMap = new Map(
        unreadCounts.map((uc) => [uc.conversation_id, uc.unreadCount]),
      );

      // --- Fetch the single most recent message for each conversation (Common Logic) ---
      const latestMessages = await Message.findAll({
        where: {
          conversation_id: { [Op.in]: filteredConversationIds },
        },
        order: [
          ["conversation_id", "ASC"], // Group by conversation_id first
          ["sent_at", "DESC"], // Then order by sent_at to get the latest
        ],
        raw: true,
      });

      const latestMessageMap = new Map();
      latestMessages.forEach((msg) => {
        // This ensures only the latest message for each conversation is stored
        if (!latestMessageMap.has(msg.conversation_id)) {
          latestMessageMap.set(msg.conversation_id, msg);
        }
      });

      // --- Specific logic for Private vs. Group ---
      if (conversationType === "private") {
        // 3. For each private conversation, find the other participant
        const allOtherParticipants = await Participant.findAll({
          where: {
            conversation_id: { [Op.in]: filteredConversationIds },
            user_id: { [Op.ne]: userId },
          },
          attributes: ["conversation_id", "user_id"],
          raw: true,
        });

        const otherUserIds = Array.from(
          new Set(allOtherParticipants.map((p) => p.user_id)),
        );

        // 4. Fetch user details for all other participants
        const otherUsers = await User.findAll({
          where: {
            id: { [Op.in]: otherUserIds },
          },
          attributes: ["id", "username", "name", "avatar"],
          raw: true,
        });

        const userMap = new Map(otherUsers.map((user) => [user.id, user]));

        // 6. Combine all data for private conversations
        const myConversations = conversations.map((conv) => {
          const conversationData = conv;

          const otherParticipant = allOtherParticipants.find(
            (p) => p.conversation_id === conv.id,
          );

          let otherUserData = null;
          if (otherParticipant) {
            otherUserData = userMap.get(otherParticipant.user_id);
          }
          otherUserData = otherUserData || null;

          const latestMessage = latestMessageMap.get(conv.id);
          const unreadCount = unreadCountsMap.get(conv.id) || 0;

          return {
            ...conversationData,
            participants: [
              {
                user: otherUserData,
              },
            ],
            messages: latestMessage ? [latestMessage] : [],
            unreadCount: unreadCount,
          };
        });

        res.json(myConversations);
      } else if (conversationType === "group") {
        // For Group conversations, fetch ALL participants for each group
        const allGroupParticipants = await Participant.findAll({
          where: {
            conversation_id: { [Op.in]: filteredConversationIds },
          },
          attributes: ["conversation_id", "user_id"],
          raw: true,
        });

        const allParticipantUserIds = Array.from(
          new Set(allGroupParticipants.map((p) => p.user_id)),
        );

        const allParticipantUsers = await User.findAll({
          where: {
            id: { [Op.in]: allParticipantUserIds },
          },
          attributes: ["id", "username", "name", "avatar"],
          raw: true,
        });

        const allUsersMap = new Map(
          allParticipantUsers.map((user) => [user.id, user]),
        );

        // Group participants by conversation_id
        const participantsByConversation = new Map();
        allGroupParticipants.forEach((p) => {
          if (!participantsByConversation.has(p.conversation_id)) {
            participantsByConversation.set(p.conversation_id, []);
          }
          participantsByConversation
            .get(p.conversation_id)
            .push({ user: allUsersMap.get(p.user_id) });
        });

        // Combine all data for group conversations
        const myGroupConversations = conversations.map((conv) => {
          const conversationData = conv;
          const latestMessage = latestMessageMap.get(conv.id);
          const unreadCount = unreadCountsMap.get(conv.id) || 0;
          const groupParticipants =
            participantsByConversation.get(conv.id) || [];

          return {
            ...conversationData,
            participants: groupParticipants, // Array of all participants in the group
            messages: latestMessage ? [latestMessage] : [],
            unreadCount: unreadCount,
          };
        });

        res.json(myGroupConversations);
      } else {
        res.status(400).json({ message: "Invalid conversation type" });
      }
    } catch (err) {
      console.error("Error fetching user conversations:", err);
      res
        .status(500)
        .json({ message: "Failed to fetch conversations: " + err.message });
    }
  },
);


router.get("/get/user/:id/", (req, res) => {
  const userId = req.params.id;

  User.findByPk(userId, {
    attributes: ["id", "username", "avatar"],
  })
    .then((user) => {
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    })
    .catch((err) => {
      console.error(err.message);
      res.status(500).json({ message: "Server error", error: err.message });
    });
});




const {
  msgUploadAttachment,
  msgUploadVoiceNote,
  convertAudioToM4a,
  convertVideoToHLS,
  zipFile,
  deleteFile,
} = require("../middleware/msgMulter");
function generateRandomAlphaNumeric(length = 8) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
const BASE_UPLOAD_DIR = "uploads";
const ffmpeg = require("fluent-ffmpeg");

const FFMPEG_PATH = process.env.FFMPEG_PATH;
const FFPROBE_PATH = process.env.FFPROBE_PATH;

if (FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(FFMPEG_PATH);
} else {
  console.warn("FFMPEG_PATH is not set in environment variables.");
}

if (FFPROBE_PATH) {
  ffmpeg.setFfprobePath(FFPROBE_PATH);
} else {
  console.warn("FFPROBE_PATH is not set in environment variables.");
}

function getProbeData(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      resolve(metadata);
    });
  });
}

const { readFileSync } = require("node:fs");
const { imageSize } = require("image-size");
const pdfParse = require("pdf-parse");

router.post(
  "/upload/image",
  authenticateAccess,
  msgUploadAttachment.single("file"),
  async (req, res) => {
    const { client_message_id } = req.body;
    const { redis } = req;
    
    // Safety check for multer upload success before touching Redis.
    if (!req.file) {
      return res.status(400).send({ error: "File upload failed." });
    }

    let uploadStatus;
    try {
      uploadStatus = await redis.hGet(client_message_id, "status");
    } catch (err) {
      console.error("Redis connection error:", err);
      // Redis is down. Treat this as if the key doesn't exist.
      // The process will continue as a fresh upload.
      uploadStatus = null; 
    }
    
    // Case 1: Previous upload was a complete SUCCESS.
    if (uploadStatus === "SUCCESS") {
      // This new upload is a duplicate. Delete the new file and return the cached data.
      deleteFile(req.file.path);
      
      let cachedUrl, cachedMetadata;
      try {
        cachedUrl = await redis.hGet(client_message_id, "url");
        cachedMetadata = await redis.hGet(client_message_id, "attachment_metadata");
      } catch (err) {
        // Cache read failed. This is a partial failure, but we have a new file.
        // Proceed with the new file to satisfy the request.
        console.error("Error reading from Redis cache. Proceeding with new upload.", err);
        uploadStatus = null;
      }
      
      // If we successfully retrieved data, return it.
      if (cachedUrl && cachedMetadata) {
        return res.status(200).json({
          url: cachedUrl,
          attachment_metadata: JSON.parse(cachedMetadata),
        });
      }
    }

    // Case 2: Previous upload was UPLOAD_COMPLETE, but needs a new attempt.
    if (uploadStatus === "UPLOAD_COMPLETE") {
      // The file was already uploaded in a previous attempt. Delete the new duplicate.
      deleteFile(req.file.path);

      let previousFile;
      try {
        previousFile = await redis.hGet(client_message_id, "file_data");
        if (!previousFile) {
          // Corrupted cache: status is UPLOAD_COMPLETE, but file_data is missing.
          console.warn(`Corrupted Redis key: ${client_message_id}. Clearing and starting new process.`);
          await redis.del(client_message_id); // Clean up the corrupted key.
          uploadStatus = null; // Fall through to the fresh upload logic below.
        } else {
          // We have valid cached data for the previous file. Let's process it.
          const originalFilePath = JSON.parse(previousFile).path;
          const fileUrl = `/uploads/messages/attachment/${req.body.conversation_id}/${JSON.parse(previousFile).filename}`;

          try {
            const dimensions = imageSize(readFileSync(originalFilePath));
            const metadata = {
              width: dimensions.width,
              height: dimensions.height,
              mimetype: JSON.parse(previousFile).mimetype,
              size: JSON.parse(previousFile).size,
              aspect_ratio: dimensions.width / dimensions.height,
            };
            
            // Update Redis to SUCCESS and return the final data.
            await redis.hSet(client_message_id, "status", "SUCCESS");
            await redis.hSet(client_message_id, "url", fileUrl);
            await redis.hSet(client_message_id, "attachment_metadata", JSON.stringify(metadata));
            
            return res.status(200).json({
              url: fileUrl,
              attachment_metadata: metadata,
            });
          } catch (err) {
            console.error("Error getting image dimensions during recovery:", err);
            // The recovery process also failed. Status remains UPLOAD_COMPLETE.
            return res.status(200).json({
              url: fileUrl,
              attachment_metadata: {
                mimetype: JSON.parse(previousFile).mimetype,
                size: JSON.parse(previousFile).size,
              },
            });
          }
        }
      } catch (err) {
        // Catch any error during the cache read or file access for the previous upload.
        console.error(`Error during UPLOAD_COMPLETE recovery for key: ${client_message_id}.`, err);
        // Fall through to the fresh upload logic below.
        uploadStatus = null;
      }
    }

    // Case 3: No status, FAILURE status, Redis is down, or cache data was corrupted.
    // This is the fallback. Treat it as a fresh upload.
    console.log(`Starting a new upload process for ${client_message_id}.`);
    
    // Multer has already succeeded at this point (due to the check at the start).
    // Now, we proceed with the processing of the current file.
    
    // Set the initial status and store the file data.
    try {
      await redis.hSet(client_message_id, "status", "UPLOAD_COMPLETE");
      await redis.hSet(client_message_id, "file_data", JSON.stringify(req.file));
    } catch (err) {
      console.error("Error setting initial Redis key. Process will continue without cache.", err);
      // If setting the key fails, we just proceed. The deduplication won't work
      // for this request, but the user will still get a response.
    }
    
    const originalFilePath = req.file.path;
    const fileUrl = `/uploads/messages/attachment/${req.body.conversation_id}/${req.file.filename}`;
    
    try {
      const dimensions = imageSize(readFileSync(originalFilePath));
      const metadata = {
        width: dimensions.width,
        height: dimensions.height,
        mimetype: req.file.mimetype,
        size: req.file.size,
        aspect_ratio: dimensions.width / dimensions.height,
      };
      
      // The process is a complete success. Update Redis.
      try {
        await redis.hSet(client_message_id, "status", "SUCCESS");
        await redis.hSet(client_message_id, "url", fileUrl);
        await redis.hSet(client_message_id, "attachment_metadata", JSON.stringify(metadata));
      } catch (err) {
        console.error("Error updating Redis for SUCCESS status. Proceeding with response.", err);
      }
      
      return res.status(200).json({
        url: fileUrl,
        attachment_metadata: metadata,
      });
    } catch (err) {
      console.error("Error getting image dimensions:", err);
      // The status remains UPLOAD_COMPLETE (if Redis worked initially).
      return res.status(200).json({
        url: fileUrl,
        attachment_metadata: {
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });
    }
  },
);

router.post(
  "/upload/file",
  authenticateAccess,
  msgUploadAttachment.single("file"),
  async (req, res) => {
    const { client_message_id } = req.body;
    const { redis } = req;

    if (!req.file) {
      return res.status(400).json({ error: "File upload failed." });
    }

    let uploadStatus;
    try {
      uploadStatus = await redis.hGet(client_message_id, "status");
    } catch (err) {
      console.error("Redis connection error, proceeding without cache:", err);
      uploadStatus = null; // Fallback to fresh upload logic.
    }

    // --- Case 1: Deduplication - The process was a complete SUCCESS.
    if (uploadStatus === "SUCCESS") {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting duplicate file:", err);
      });
      try {
        const cachedUrl = await redis.hGet(client_message_id, "url");
        const cachedMetadata = await redis.hGet(client_message_id, "attachment_metadata");
        if (cachedUrl && cachedMetadata) {
          return res.status(200).json({
            url: cachedUrl,
            attachment_metadata: JSON.parse(cachedMetadata),
          });
        }
      } catch (err) {
        console.error("Error retrieving SUCCESS cache data, falling through.", err);
        uploadStatus = null;
      }
    }

    let originalFilePath;

    if (uploadStatus) {
      // It's a recovery attempt. Delete the new file and get the path of the original.
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting duplicate file during recovery:", err);
      });

      try {
        const cachedFileData = await redis.hGet(client_message_id, "file_data");
        if (cachedFileData) {
          originalFilePath = JSON.parse(cachedFileData).path;
        } else {
          console.warn("Corrupted cache, status exists but no file_data. Falling back to new file.");
          originalFilePath = req.file.path;
          uploadStatus = null;
        }
      } catch (err) {
        console.error("Error during recovery cache read. Falling back to new file.", err);
        originalFilePath = req.file.path;
        uploadStatus = null;
      }
    } else {
      // It's a fresh upload. The file is at req.file.path.
      originalFilePath = req.file.path;
      try {
        await redis.hSet(client_message_id, "status", "UPLOAD_COMPLETE");
        await redis.hSet(client_message_id, "file_data", JSON.stringify(req.file));
      } catch (err) {
        console.error("Error setting initial Redis key. Process continues without cache.", err);
      }
    }
    
    // --- Processing Logic (Fresh Upload or Recovery) ---
    const conversationId = req.body.conversation_id;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;
    let metadata = null;
    let finalFileUrl = null;
    let finalFilePath = originalFilePath;

    // Define MIME types that should NOT be zipped
    const unzippedMimeTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/webm", "video/3gpp", "video/avi", "video/x-flv", "video/x-matroska", "video/quicktime",
      "audio/mpeg", "audio/ogg", "audio/aac", "audio/x-m4a", "audio/mp4", "audio/amr",
      "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain", "text/csv", "application/json", "text/html", "application/xml",
    ];

    try {
      // Check if we need to run processing or can just use cached metadata
      if (uploadStatus === "METADATA_EXTRACTED") {
        metadata = JSON.parse(await redis.hGet(client_message_id, "attachment_metadata"));
        // Final URL can be reconstructed from cached data
        if (metadata.type === "application" && metadata.subtype === "zip") {
            finalFileUrl = metadata.url; // Use cached URL for zipped files
        } else {
            finalFileUrl = `/uploads/messages/attachment/${conversationId}/${path.basename(originalFilePath)}`;
        }
      } else { // Fresh processing or recovering from UPLOAD_COMPLETE
        if (unzippedMimeTypes.includes(mimeType)) {
          // --- Unzipped File Logic ---
          if (mimeType.startsWith("image/")) {
            const probeData = await getProbeData(originalFilePath);
            const imageStream = probeData.streams.find((stream) => stream.codec_type === "video");
            metadata = imageStream ? { type: "image", mime_type: mimeType, width: imageStream.width, height: imageStream.height, size: fileSize } : { type: "image", mime_type: mimeType, width: imageSize(readFileSync(originalFilePath)).width, height: imageSize(readFileSync(originalFilePath)).height, size: fileSize };
          } else if (mimeType.startsWith("video/")) {
            const probeData = await getProbeData(originalFilePath);
            const { format, streams } = probeData;
            const videoStream = streams.find((stream) => stream.codec_type === "video");
            metadata = { type: "video", mime_type: mimeType, duration: parseFloat(format.duration), bit_rate: parseInt(format.bit_rate), size: fileSize, width: videoStream?.width, height: videoStream?.height };
          } else if (mimeType.startsWith("audio/")) {
            const probeData = await getProbeData(originalFilePath);
            const { format, streams } = probeData;
            const audioStream = streams.find((stream) => stream.codec_type === "audio");
            metadata = { type: "audio", mime_type: mimeType, duration: parseFloat(format.duration), bit_rate: parseInt(format.bit_rate), size: fileSize, codec: audioStream?.codec_name };
          } else if (mimeType === "application/pdf") {
            try {
              const pdfData = await pdfParse(fs.readFileSync(originalFilePath));
              metadata = { type: "document", subtype: "pdf", pages: pdfData.numpages, size: fileSize };
            } catch (e) { metadata = { type: "document", subtype: "pdf", pages: null, size: fileSize, error: "Failed to parse PDF." }; }
          } else {
            metadata = { type: "application", subtype: path.extname(req.file.originalname).substring(1) || "unknown", mime_type: mimeType, size: fileSize };
          }
          finalFileUrl = `/uploads/messages/attachment/${conversationId}/${path.basename(originalFilePath)}`;

          // Update cache with metadata
          try {
            await redis.hSet(client_message_id, "status", "METADATA_EXTRACTED");
            await redis.hSet(client_message_id, "attachment_metadata", JSON.stringify(metadata));
          } catch (e) { console.error("Error caching metadata:", e); }

        } else {
          // --- Zipped File Logic ---
          console.log(`File type not in unzippedMimeTypes, zipping: ${mimeType}`);
          const zipRelativeOutputDir = path.join("messages", "attachment", conversationId);
          const zipAbsoluteOutputDir = path.join(__dirname, "..", BASE_UPLOAD_DIR, zipRelativeOutputDir);
          const zipFileName = `${client_message_id}.zip`;
          const zippedFilePath = await zipFile(originalFilePath, zipAbsoluteOutputDir, zipFileName);
          
          finalFilePath = zippedFilePath;
          fs.unlink(originalFilePath, (err) => { if (err) console.error("Error deleting original file after zipping:", err); });

          const zippedFileRelativePath = path.relative(path.join(__dirname, "..", BASE_UPLOAD_DIR), zippedFilePath);
          finalFileUrl = `/${BASE_UPLOAD_DIR}/${zippedFileRelativePath.replace(/\\/g, "/")}`;

          const fileStats = fs.statSync(finalFilePath);
          metadata = {
            type: "application", subtype: "zip", mime_type: "application/zip",
            original_mime_type: mimeType, original_filename: req.file.originalname,
            size: fileStats.size, created_at: fileStats.birthtime, modified_at: fileStats.mtime,
          };
          
          // Update cache with final zipped data
          try {
            await redis.hSet(client_message_id, "status", "ZIP_CONVERSION_COMPLETE");
            await redis.hSet(client_message_id, "url", finalFileUrl);
            await redis.hSet(client_message_id, "attachment_metadata", JSON.stringify(metadata));
          } catch (e) { console.error("Error caching zip data:", e); }
        }
      }

      // Final step: If metadata was extracted but we haven't hit SUCCESS yet,
      // update the state and send the final response.
      if (uploadStatus !== "SUCCESS") {
        try {
          // For unzipped files, the final URL is only determined here.
          if (!finalFileUrl) {
              finalFileUrl = `/uploads/messages/attachment/${conversationId}/${path.basename(finalFilePath)}`;
          }
          await redis.hSet(client_message_id, "status", "SUCCESS");
          await redis.hSet(client_message_id, "url", finalFileUrl);
          if (metadata) {
              await redis.hSet(client_message_id, "attachment_metadata", JSON.stringify(metadata));
          }
        } catch (e) {
          console.error("Error setting final SUCCESS state:", e);
        }
      }

      return res.status(200).json({ url: finalFileUrl, attachment_metadata: metadata });

    } catch (error) {
      console.error("Error processing file:", error);
      // Clean up the original file if an error occurred before zipping.
      if (finalFilePath === originalFilePath && fs.existsSync(originalFilePath)) {
        fs.unlink(originalFilePath, (err) => {
          if (err) console.error("Error deleting original file on error:", err);
        });
      }
      return res.status(500).json({ error: "File processing failed." });
    }
  },
);


router.post(
  "/upload/voice-note",
  authenticateAccess,
  msgUploadVoiceNote.single("audio"),
  async (req, res) => {
    const { client_message_id } = req.body;
    const { redis } = req;
    
    // Safety check for Multer upload success.
    if (!req.file) {
      // If Multer fails, this request cannot be fulfilled.
      return res.status(400).json({ message: "No file uploaded." });
    }

    let uploadStatus;
    try {
      uploadStatus = await redis.hGet(client_message_id, "status");
    } catch (err) {
      console.error("Redis connection error, proceeding without cache:", err);
      uploadStatus = null; // Fallback to fresh upload logic.
    }

    // --- State-based Logic ---

    // Case 1: The entire process was a complete SUCCESS on a previous attempt.
    if (uploadStatus === "SUCCESS") {
      // This is a duplicate request. Delete the new file and return cached data.
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting duplicate file:", err);
      });
      
      let cachedUrl;
      try {
        cachedUrl = await redis.hGet(client_message_id, "url");
        if (cachedUrl) {
          return res.status(200).json({
            message: "Voice note already uploaded and converted.",
            url: cachedUrl,
          });
        }
      } catch (err) {
        console.error("Error reading from Redis during SUCCESS check. Falling back.", err);
        uploadStatus = null;
      }
    }
    
    // Case 2: Recovery State - The initial file was uploaded, but the conversion failed or the server crashed.
    // The previous request left the original file on disk. We must process that one.
    if (uploadStatus === "UPLOAD_COMPLETE") {
        
        // This is a duplicate request. Delete the newly uploaded file.
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting duplicate file during recovery:", err);
        });

        // Get the original file path from the cache to continue processing.
        let previousFileData;
        try {
            previousFileData = await redis.hGet(client_message_id, "file_data");
            if (!previousFileData) {
                // Corrupted cache: status says UPLOAD_COMPLETE but no file data.
                console.warn(`Corrupted Redis key: ${client_message_id}. Deleting key and starting fresh.`);
                await redis.del(client_message_id);
                uploadStatus = null; // Fall through to the fresh upload logic.
            }
        } catch (err) {
            console.error("Error retrieving cached file data. Falling back to fresh upload.", err);
            uploadStatus = null;
        }

        if (uploadStatus === "UPLOAD_COMPLETE" && previousFileData) {
            const originalFile = JSON.parse(previousFileData);
            const originalFilePath = originalFile.path;

            const conversationId = req.body.conversation_id;
            const m4aRelativeOutputDir = path.join("messages", "voice_notes", "m4a", conversationId);
            const m4aAbsoluteOutputDir = path.join(__dirname, "..", BASE_UPLOAD_DIR, m4aRelativeOutputDir);
            const m4aFileName = `${originalFile.filename.split('.')[0]}`; // Use original filename base.

            try {
                await fs.promises.mkdir(m4aAbsoluteOutputDir, { recursive: true });
                await convertAudioToM4a(originalFilePath, m4aAbsoluteOutputDir, m4aFileName);

                const convertedM4aRelativePath = path.join(m4aRelativeOutputDir, `${m4aFileName}.m4a`);

                // Clean up the original file now that conversion is complete.
                fs.unlink(originalFilePath, (err) => {
                    if (err) console.error("Error deleting original voice note file after conversion:", err);
                });

                // Update Redis to SUCCESS with the final URL.
                const finalUrl = `/${BASE_UPLOAD_DIR}/${convertedM4aRelativePath.replace(/\\/g, "/")}`;
                await redis.hSet(client_message_id, "status", "SUCCESS");
                await redis.hSet(client_message_id, "url", finalUrl);

                return res.status(200).json({
                    message: "Voice note recovered and converted to M4A successfully",
                    url: finalUrl,
                });
            } catch (error) {
                console.error("Voice note recovery/conversion error:", error);
                // The status remains UPLOAD_COMPLETE, ready for another attempt.
                return res.status(500).json({ message: "Error during voice note conversion recovery." });
            }
        }
    }

    // Case 3: Fresh Upload - No status, a failure, or cache was unreadable/corrupted.
    if (!uploadStatus || uploadStatus === "FAILURE") {
        console.log(`Starting new voice note process for ${client_message_id}`);
        const { path: originalFilePath } = req.file;

        try {
            // Set initial status and store the file data.
            await redis.hSet(client_message_id, "status", "UPLOAD_COMPLETE");
            await redis.hSet(client_message_id, "file_data", JSON.stringify(req.file));
        } catch (err) {
            console.error("Error setting initial Redis key. Process will continue without cache.", err);
        }

        const conversationId = req.body.conversation_id;
        const m4aRelativeOutputDir = path.join("messages", "voice_notes", "m4a", conversationId);
        const m4aAbsoluteOutputDir = path.join(__dirname, "..", BASE_UPLOAD_DIR, m4aRelativeOutputDir);
        const m4aFileName = `${req.userId}-voice-${generateRandomAlphaNumeric()}`;

        try {
            await fs.promises.mkdir(m4aAbsoluteOutputDir, { recursive: true });
            await convertAudioToM4a(originalFilePath, m4aAbsoluteOutputDir, m4aFileName);

            const convertedM4aRelativePath = path.join(m4aRelativeOutputDir, `${m4aFileName}.m4a`);
            
            // Clean up the original file after successful conversion.
            fs.unlink(originalFilePath, (err) => {
                if (err) console.error("Error deleting original voice note file after conversion:", err);
            });

            // The process is a complete success. Update Redis with final data.
            const finalUrl = `/${BASE_UPLOAD_DIR}/${convertedM4aRelativePath.replace(/\\/g, "/")}`;
            try {
                await redis.hSet(client_message_id, "status", "SUCCESS");
                await redis.hSet(client_message_id, "url", finalUrl);
            } catch (err) {
                console.error("Error updating Redis for SUCCESS status. Proceeding with response.", err);
            }

            return res.status(200).json({
                message: "Voice note uploaded and converted to M4A successfully",
                url: finalUrl,
            });
        } catch (error) {
            console.error("Voice note upload/conversion error:", error);
            // Conversion failed. The status is already UPLOAD_COMPLETE, which is correct.
            // The unconverted file remains on disk for a future recovery attempt.
            return res.status(500).json({ message: "Error during voice note conversion." });
        }
    }
  },
);

router.post(
  "/upload/video",
  authenticateAccess,
  msgUploadAttachment.single("file"),
  async (req, res) => {
    const { client_message_id } = req.body;
    const { redis } = req;

    // Safety check for multer upload success.
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    let uploadStatus;
    try {
      uploadStatus = await redis.hGet(client_message_id, "status");
    } catch (err) {
      console.error("Redis connection error, proceeding without cache:", err);
      uploadStatus = null; // Fallback to fresh upload logic.
    }

    // --- Case 1: Deduplication - The process was a complete SUCCESS.
    if (uploadStatus === "SUCCESS") {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting duplicate file:", err);
      });
      try {
        const cachedUrl = await redis.hGet(client_message_id, "url");
        const cachedMetadata = await redis.hGet(client_message_id, "attachment_metadata");
        if (cachedUrl && cachedMetadata) {
          return res.status(200).json({
            message: "Attachment already processed successfully",
            url: cachedUrl,
            attachment_metadata: JSON.parse(cachedMetadata),
          });
        }
      } catch (err) {
        console.error("Error retrieving SUCCESS cache data, falling through.", err);
        // Fall through to the processing block if cache read fails.
        uploadStatus = null;
      }
    }

    // --- Case 2: Fresh Upload or Recovery (Start Processing) ---
    // If we reach here, it's either a fresh upload or a recovery attempt.
    
    let originalFilePath;

    if (uploadStatus) {
      // It's a recovery attempt. Delete the new file and get the path of the original one.
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting duplicate file during recovery:", err);
      });

      try {
        const cachedFileData = await redis.hGet(client_message_id, "file_data");
        if (cachedFileData) {
          originalFilePath = JSON.parse(cachedFileData).path;
        } else {
          console.warn("Corrupted cache, status exists but no file_data. Falling back to new file.");
          originalFilePath = req.file.path;
          // Treat as a fresh upload to re-cache the data.
          uploadStatus = null; 
        }
      } catch (err) {
        console.error("Error during recovery cache read. Falling back to new file.", err);
        originalFilePath = req.file.path;
        uploadStatus = null;
      }
    } else {
      // It's a fresh upload. The file is already available at req.file.path.
      originalFilePath = req.file.path;
      // Set the initial state in Redis.
      try {
        await redis.hSet(client_message_id, "status", "UPLOAD_COMPLETE");
        await redis.hSet(client_message_id, "file_data", JSON.stringify(req.file));
      } catch (err) {
        console.error("Error setting initial Redis key. Process continues without cache.", err);
      }
    }

    const conversationId = req.body.conversation_id;
    let attachmentMetadata = null;
    let finalUrl = null;

    // --- Conditional logic for video vs. other attachments ---

    if (req.file.mimetype.startsWith("video/")) {
      try {
        // --- Step 1: Probe the original file for metadata ---
        if (uploadStatus === "UPLOAD_COMPLETE" || !uploadStatus) {
          const originalProbedData = await getProbeData(originalFilePath);
          const videoStream = originalProbedData.streams.find((s) => s.codec_type === "video");

          attachmentMetadata = {
            width: videoStream ? videoStream.width : null,
            height: videoStream ? videoStream.height : null,
            duration: originalProbedData.format.duration,
            size: originalProbedData.format.size,
            mimetype: req.file.mimetype,
            bit_rate: originalProbedData.format.bit_rate,
            avg_frame_rate: videoStream ? videoStream.avg_frame_rate : null,
            display_aspect_ratio: videoStream ? videoStream.width / videoStream.height : null,
            is_hls_converted: false,
          };

          try {
            await redis.hSet(client_message_id, "status", "METADATA_EXTRACTED");
            await redis.hSet(client_message_id, "attachment_metadata", JSON.stringify(attachmentMetadata));
          } catch (err) {
            console.error("Error updating Redis status to METADATA_EXTRACTED. Proceeding.", err);
          }
        } else if (uploadStatus === "METADATA_EXTRACTED") {
          // Recovery case: load metadata from cache
          attachmentMetadata = JSON.parse(await redis.hGet(client_message_id, "attachment_metadata"));
        }

        // --- Step 2: Convert to HLS ---
        const hlsRelativeOutputDir = path.join("messages", "attachment", "hls", conversationId);
        const hlsAbsoluteOutputDir = path.join(__dirname, "..", BASE_UPLOAD_DIR, hlsRelativeOutputDir);
        const hlsFileNamePrefix = `${req.userId}-video-${client_message_id}`;

        await fs.promises.mkdir(hlsAbsoluteOutputDir, { recursive: true });

        const hlsPlaylistAbsolutePath = await convertVideoToHLS(
          originalFilePath,
          hlsAbsoluteOutputDir,
          hlsFileNamePrefix
        );
        const hlsPlaylistRelativePath = path.relative(path.join(__dirname, "..", BASE_UPLOAD_DIR), hlsPlaylistAbsolutePath);

        // --- Step 3: Finalize metadata and cache the result ---
        if (attachmentMetadata) {
          attachmentMetadata.mimetype = "application/x-mpegURL";
          attachmentMetadata.hls_playlist_url = `/${BASE_UPLOAD_DIR}/${hlsPlaylistRelativePath.replace(/\\/g, "/")}`;
          attachmentMetadata.is_hls_converted = true;

          try {
            const hlsProbedData = await getProbeData(hlsPlaylistAbsolutePath);
            attachmentMetadata.duration = hlsProbedData.format.duration || attachmentMetadata.duration;
            attachmentMetadata.size = hlsProbedData.format.size || attachmentMetadata.size;
            attachmentMetadata.bit_rate = hlsProbedData.format.bit_rate || attachmentMetadata.bit_rate;
          } catch (hlsProbeErr) {
            console.warn("FFprobe error on HLS playlist:", hlsProbeErr.message);
          }
        }
        
        finalUrl = `/${BASE_UPLOAD_DIR}/${hlsPlaylistRelativePath.replace(/\\/g, "/")}`;

        // Final step after a successful HLS conversion.
        fs.unlink(originalFilePath, (err) => {
          if (err) console.error("Error deleting original video file:", err);
        });

        try {
          await redis.hSet(client_message_id, "status", "SUCCESS");
          await redis.hSet(client_message_id, "url", finalUrl);
          await redis.hSet(client_message_id, "attachment_metadata", JSON.stringify(attachmentMetadata));
        } catch (err) {
          console.error("Error updating Redis with final SUCCESS data. Proceeding.", err);
        }
        
        return res.status(200).json({
          message: "Video uploaded and converted to HLS successfully",
          url: finalUrl,
          attachment_metadata: attachmentMetadata,
        });

      } catch (err) {
        console.error("Video processing error:", err);
        // The last successful state is already stored in Redis for future recovery.
        return res.status(500).json({ message: "Video processing failed." });
      }

    } else {
      // Path for non-video attachments (remains the same as before)
      const attachmentRelativeOutputDir = path.join("messages", "attachment", conversationId);
      const attachmentAbsoluteOutputDir = path.join(__dirname, "..", BASE_UPLOAD_DIR, attachmentRelativeOutputDir);
      const newAttachmentFileName = `${req.userId}-${generateRandomAlphaNumeric()}${path.extname(req.file.originalname)}`;
      const newAttachmentAbsolutePath = path.join(attachmentAbsoluteOutputDir, newAttachmentFileName);

      try {
        await fs.promises.mkdir(attachmentAbsoluteOutputDir, { recursive: true });
        await fs.promises.rename(originalFilePath, newAttachmentAbsolutePath);
        
        const newAttachmentRelativePath = path.join(attachmentRelativeOutputDir, newAttachmentFileName);
        finalUrl = `/${BASE_UPLOAD_DIR}/${newAttachmentRelativePath.replace(/\\/g, "/")}`;

        try {
          const originalProbedData = await getProbeData(newAttachmentAbsolutePath);
          attachmentMetadata = {
            mimetype: req.file.mimetype,
            size: originalProbedData.format.size,
            duration: originalProbedData.format.duration,
            bit_rate: originalProbedData.format.bit_rate,
            is_hls_converted: false,
          };
        } catch (err) {
          console.error("FFprobe error on non-video file:", err.message);
          attachmentMetadata = {
            mimetype: req.file.mimetype,
            size: req.file.size,
            is_hls_converted: false,
          };
        }

        await redis.hSet(client_message_id, "status", "SUCCESS");
        await redis.hSet(client_message_id, "url", finalUrl);
        await redis.hSet(client_message_id, "attachment_metadata", JSON.stringify(attachmentMetadata));

        return res.status(200).json({
          message: "Attachment uploaded successfully",
          url: finalUrl,
          attachment_metadata: attachmentMetadata,
        });
        
      } catch (error) {
        console.error("Attachment processing error:", error);
        // If any step fails, the key remains UPLOAD_COMPLETE for a future retry.
        return res.status(500).json({ message: "Attachment processing failed." });
      }
    }
  },
);



router.get("/rooms", authenticateAccess, async (req, res) => {
  try {
    const userId = req.userId;

    const convoUserIsIn = await Participant.findAll({
      where: {
        user_id: userId,
      },
      attributes: ["conversation_id"],
    });
    const conversations = convoUserIsIn.map((p) => p.conversation_id);

    res.json(conversations);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

router.get("/get/msgs/:convo_id", authenticateAccess, async (req, res) => {
  try {
    const userId = req.userId;
    const convo_id = req.params.convo_id;

    const rawMsgs = await Message.findAll({
      where: {
        conversation_id: convo_id,
      },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "username", "avatar"],
        },
        {
          model: Message, // This is the Message model itself
          as: 'replyTo',
          attributes: ['id', 'conversation_id', 'sender_id', 'content', 'sent_at', 'is_deleted'], // Select the attributes you need
          include: [
            {
              model: User,
              as: 'sender', // The sender of the replied-to message
              attributes: ['id', 'username', 'avatar'],
            },
          ],
        },
      ],
      order: [["sent_at", "ASC"]],
    });

    const read_statuses_for_convo = await ReadStatus.findAll({
      where: {
        conversation_id: convo_id,
      },
      attributes: ["read_at"],
      include: [
        {
          model: Participant,
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id"],
            },
          ],
        },
      ],
    });

    const msgs = rawMsgs.map((msg) => {
      const readers = [];
      const messageSentAt = msg.sent_at;

      read_statuses_for_convo.forEach((rs) => {
        const participantReadAt = rs.read_at;
        const correspondingUserId =
          rs.Participant && rs.Participant.user ? rs.Participant.user.id : null;

        if (
          participantReadAt &&
          correspondingUserId &&
          participantReadAt >= messageSentAt
        ) {
          readers.push(correspondingUserId);
        }
      });

      return {
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender: msg.sender,
        sender_id: msg.sender_id,
        sender_type: msg.sender_type,
        content: msg.content,
        sent_at: msg.sent_at,
        updated_at: msg.updated_at,
        isMine: msg.sender_id === userId,
        is_deleted: msg.is_deleted,
        is_edited: msg.is_edited,
        reply_to_message: msg.replyTo || null, // Include the fully-loaded replyTo object
        read_by: readers,
      };
    });

    res.json(msgs);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

router.post(
  "/read/msg/:convo_id/:msg_id/",
  authenticateAccess,
  async (req, res) => {
    try {
      //const msgId = req.params.msg_id;
      const convoId = req.params.convo_id;

      const conversation = await Conversation.findByPk(convoId);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const participant = await Participant.findOne({
        where: {
          user_id: req.userId,
          conversation_id: convoId,
        },
        attributes: ["id"],
        raw: true,
      });

      if (!participant) {
        return res
          .status(404)
          .json({ message: "Participant not found in this conversation" });
      }

      const pId = participant.id;

      // 1. Find if a ReadStatus record already exists for this participant and conversation
      const existingReadStatus = await ReadStatus.findOne({
        where: {
          participant_id: pId,
          conversation_id: convoId,
        },
      });

      // 2. If it exists, delete it
      if (existingReadStatus) {
        await existingReadStatus.destroy();
      }

      // 3. Always create a new ReadStatus record
      const newReadStatus = await ReadStatus.create({
        participant_id: pId,
        conversation_id: convoId,
        read_at: new Date(), // Set the current timestamp
        // If you want to track the last message read when created:
        // last_read_message_id: msgId,
      });

      res.json(newReadStatus); // Return the newly created read status
    } catch (e) {
      console.error("Error in read/msg route:", e); // Log the error for debugging
      res.status(500).json({ message: e.message });
    }
  },
);

router.post('/msg/:msgId/delete', authenticateAccess, async (req, res) => {
   try {
      const msg = await Message.findByPk(req.params.msgId)
      if(!msg) {
         return res.status(404).json('Message not found...')
      }
      if(msg) {
         if(msg.sender_id != req.userId) {
            return res.status(403).json('This message can not be deleted by you ')
         }
         msg.update({
            is_deleted: true
         })
      }
      res.status(200).json('ok')
   } catch (e) {
      console.error(e.message)
      res.status(500).json({message: e.message})
   }
})

router.post('/msg/:msgId/restore', authenticateAccess, async (req, res) => {
   try {
      const msg = await Message.findByPk(req.params.msgId)
      if(!msg) {
         return res.status(404).json('Message not found...')
      }
      if(msg) {
         if(msg.sender_id != req.userId) {
            return res.status(403).json('This message can not be deleted by you ')
         }
         await msg.update({
            is_deleted: false
         })
      }
      res.status(200).json('ok')
   } catch (e) {
      console.error(e.message)
      res.status(500).json({message: e.message})
   }
})

router.post('/msg/:msgId/edit', authenticateAccess, async (req, res) => {
   try {
      const { editText } = req.body
      const msg = await Message.findByPk(req.params.msgId)
      
      if(!msg) {
         return res.status(404).json("Msg is not found")
      }
      if(msg.sender_id !== req.userId) {
         return res.status(403).json('Not allowed to edit this message')
      }
      
      const contentToEdit = {
         ...msg.content,
         text: editText
      }
      msg.update({
         is_edited: true,
         content: contentToEdit
      })
      res.status(200).json(msg)
   } catch (e) {
      console.error(e); // Log the full error object for better debugging
      res.status(500).json({ message: 'An internal server error occurred' });
   }
});


router.delete('/msg/:msgId/hardDelete/', authenticateAccess, async (req, res) => {
   try {
      const msg = await Message.findByPk(req.params.msgId)
      if(!msg) {
         return res.status(404).json('Message not found...')
      }
      if(msg) {
         if(msg.sender_id != req.userId) {
            return res.status(403).json('This message can not be hard deleted by you ')
         }
         await msg.destroy()
      }
      res.status(200).json('ok')
   } catch (e) {
      console.error(e.message)
      res.status(500).json({message: e.message})
   }
})



module.exports = router;
