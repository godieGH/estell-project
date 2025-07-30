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

    if (type === "private") {
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
      if (req.params.type === "private") {
        const userId = req.userId; // Assuming req.userId is correctly set by authenticateAccess

        // 1. Find all private conversation IDs the current user is a part of
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

        // 2. Fetch the conversations themselves
        const conversations = await Conversation.findAll({
          where: {
            id: { [Op.in]: conversationIds },
            type: "private",
          },
          order: [["last_message_at", "DESC"]],
          raw: true,
        });

        /* 
        const conversationMap = new Map(
          conversations.map((conv) => [conv.id, conv]),
        );
        
        */

        // 3. For each conversation, find the other participant
        const allOtherParticipants = await Participant.findAll({
          where: {
            conversation_id: { [Op.in]: conversationIds },
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

        // --- Fetch ReadStatus using the specific Participant ID for the current user ---
        const currentUserParticipantIds = Array.from(
          userParticipantIdMap.values(),
        );

        const readStatuses = await ReadStatus.findAll({
          where: {
            participant_id: { [Op.in]: currentUserParticipantIds },
            conversation_id: { [Op.in]: conversationIds },
          },
          attributes: ["conversation_id", "read_at", "participant_id"],
          raw: true,
        });

        const readStatusMap = new Map();
        readStatuses.forEach((rs) => {
          if (
            userParticipantIdMap.get(rs.conversation_id) === rs.participant_id
          ) {
            readStatusMap.set(rs.conversation_id, rs.read_at);
          }
        });

        // --- Optimized Unread Count Calculation ---
        // Prepare an array to hold promises for unread counts
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

        // 5. Fetch the single most recent message for each conversation
        const latestMessages = await Message.findAll({
          where: {
            conversation_id: { [Op.in]: conversationIds },
          },
          order: [
            ["conversation_id", "ASC"],
            ["sent_at", "DESC"],
          ],
          raw: true,
        });

        const latestMessageMap = new Map();
        latestMessages.forEach((msg) => {
          if (!latestMessageMap.has(msg.conversation_id)) {
            latestMessageMap.set(msg.conversation_id, msg);
          }
        });

        // 6. Combine all data
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
    // If multer is successful, req.file will be available
    if (!req.file) {
      return res.status(400).send({ error: "File upload failed." });
    }

    if (req.file) {
      const originalFilePath = req.file.path;
      const fileUrl = `/uploads/messages/attachment/${req.body.conversation_id}/${req.file.filename}`;
      try {
        console.log(originalFilePath);
        const dimensions = imageSize(readFileSync(originalFilePath));
        const metadata = {
          width: dimensions.width,
          height: dimensions.height,
          mimetype: req.file.mimetype,
          size: req.file.size,
          aspect_ratio: dimensions.width / dimensions.height,
        };
        res.status(200).json({
          url: fileUrl,
          attachment_metadata: metadata,
        });
      } catch (err) {
        console.error("Error getting image dimensions:", err);
        // Still send a success response, but without dimensions if it failed
        res.status(200).json({
          url: fileUrl,
          attachment_metadata: {
            mimetype: req.file.mimetype,
            size: req.file.size,
          },
        });
      }
    }
  },
);

router.post(
  "/upload/file",
  authenticateAccess,
  msgUploadAttachment.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "File upload failed." });
    }

    let metadata = null;
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;
    const conversationId = req.body.conversation_id;

    let finalFileUrl = null;
    let finalFilePath = filePath; // This will hold the path to the file we'll provide metadata for

    // Define MIME types that should NOT be zipped and should be processed directly
    const unzippedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/3gpp",
      "video/avi",
      "video/x-flv",
      "video/x-matroska",
      "video/quicktime",
      "audio/mpeg",
      "audio/ogg",
      "audio/aac",
      "audio/x-m4a",
      "audio/mp4",
      "audio/amr",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "application/json",
      "text/html",
      "application/xml",
    ];

    try {
      // Check if the current file's MIME type is among those that should NOT be zipped
      if (unzippedMimeTypes.includes(mimeType)) {
        // Logic for files that should NOT be zipped (original processing)
        if (mimeType.startsWith("image/")) {
          // Your existing image metadata extraction logic
          try {
            const probeData = await getProbeData(filePath);
            const imageStream = probeData.streams.find(
              (stream) => stream.codec_type === "video",
            );
            if (imageStream) {
              metadata = {
                type: "image",
                mime_type: mimeType,
                width: imageStream.width,
                height: imageStream.height,
                codec: imageStream.codec_name,
                size: fileSize,
              };
            } else {
              const dimensions = imageSize(readFileSync(filePath));
              metadata = {
                type: "image",
                mime_type: mimeType,
                width: dimensions.width,
                height: dimensions.height,
                size: fileSize,
              };
            }
          } catch (err) {
            // Fallback for image processing if probe fails
            console.error("Error getting image dimensions/probe:", err);
            const dimensions = imageSize(readFileSync(filePath));
            metadata = {
              type: "image",
              mime_type: mimeType,
              width: dimensions.width,
              height: dimensions.height,
              size: fileSize,
            };
          }
        } else if (mimeType.startsWith("video/")) {
          // Your existing video metadata extraction logic
          const probeData = await getProbeData(filePath);
          const { format, streams } = probeData;
          const videoStream = streams.find(
            (stream) => stream.codec_type === "video",
          );
          const audioStream = streams.find(
            (stream) => stream.codec_type === "audio",
          );
          metadata = {
            type: "video",
            mime_type: mimeType,
            duration: parseFloat(format.duration),
            bit_rate: parseInt(format.bit_rate),
            size: fileSize,
          };
          if (videoStream) {
            metadata.width = videoStream.width;
            metadata.height = videoStream.height;
            metadata.avg_frame_rate = videoStream.avg_frame_rate
              ? eval(videoStream.avg_frame_rate)
              : null;
            metadata.aspect_ratio = videoStream.display_aspect_ratio;
            metadata.video_codec = videoStream.codec_name;
            metadata.pixel_format = videoStream.pix_fmt;
          }
          if (audioStream) {
            metadata.audio_codec = audioStream.codec_name;
            metadata.audio_bit_rate = parseInt(audioStream.bit_rate);
            metadata.sample_rate = parseInt(audioStream.sample_rate);
            metadata.channels = audioStream.channels;
          }
        } else if (mimeType.startsWith("audio/")) {
          // Your existing audio metadata extraction logic
          const probeData = await getProbeData(filePath);
          const { format, streams } = probeData;
          const audioStream = streams.find(
            (stream) => stream.codec_type === "audio",
          );
          metadata = {
            type: "audio",
            mime_type: mimeType,
            duration: parseFloat(format.duration),
            bit_rate: parseInt(format.bit_rate),
            size: fileSize,
            codec: audioStream?.codec_name,
            sample_rate: audioStream ? parseInt(audioStream.sample_rate) : null,
            channels: audioStream?.channels,
          };
        } else if (mimeType === "application/pdf") {
          // Your existing PDF metadata extraction logic
          try {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            metadata = {
              type: "document",
              subtype: "pdf",
              pages: pdfData.numpages,
              size: fileSize,
            };
          } catch (parseError) {
            console.error("Error parsing PDF metadata:", parseError);
            metadata = {
              type: "document",
              subtype: "pdf",
              pages: null,
              size: fileSize,
              error: "Failed to parse PDF metadata.",
            };
          }
        } else if (mimeType.startsWith("text/")) {
          // This will now catch text/plain, text/csv, application/json, text/html, application/xml
          // Your existing text metadata extraction logic
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const lines = fileContent.split("\n").length;
          const words = fileContent
            .split(/\s+/)
            .filter((word) => word.length > 0).length;
          const characters = fileContent.length;
          metadata = {
            type: "text",
            mime_type: mimeType,
            lines: lines,
            words: words,
            characters: characters,
            size: fileSize,
          };
        } else {
          const fileStats = fs.statSync(filePath);
          const subtype =
            path.extname(req.file.originalname).substring(1) || "unknown";
          metadata = {
            type: "application",
            subtype,
            mime_type: mimeType,
            size: fileSize,
            created_at: fileStats.birthtime,
            modified_at: fileStats.mtime,
          };
        }
        finalFileUrl = `/uploads/messages/attachment/${conversationId}/${req.file.filename}`;
      } else {
        // THIS IS WHERE WE HANDLE FILES THAT ARE NOT IN unzippedMimeTypes (i.e., they should be zipped)
        console.log(`File type not in unzippedMimeTypes, zipping: ${mimeType}`);

        const zipRelativeOutputDir = path.join(
          "messages",
          "attachment",
          conversationId,
        );
        const zipAbsoluteOutputDir = path.join(
          __dirname,
          "..",
          BASE_UPLOAD_DIR,
          zipRelativeOutputDir,
        );
        const zipFileName = `${req.userId}-file-${generateRandomAlphaNumeric()}`;

        const zippedFilePath = await zipFile(
          filePath,
          zipAbsoluteOutputDir,
          zipFileName,
        );
        finalFilePath = zippedFilePath; // Update the path for metadata processing

        // Delete the original uploaded file after zipping
        fs.unlink(filePath, (err) => {
          if (err)
            console.error(
              "Error deleting original unsupported file after zipping:",
              err,
            );
        });

        const zippedFileRelativePath = path.relative(
          path.join(__dirname, "..", BASE_UPLOAD_DIR),
          zippedFilePath,
        );
        finalFileUrl = `/${BASE_UPLOAD_DIR}/${zippedFileRelativePath.replace(/\\/g, "/")}`;

        const fileStats = fs.statSync(finalFilePath); // Get stats of the zipped file
        metadata = {
          type: "application",
          subtype: "zip",
          mime_type: "application/zip",
          original_mime_type: mimeType, // Keep track of the original type
          original_filename: req.file.originalname,
          size: fileStats.size, // Use the size of the zipped file
          created_at: fileStats.birthtime,
          modified_at: fileStats.mtime,
        };
      }
    } catch (error) {
      console.error("Error processing file metadata or zipping:", error);
      // If an error occurred during processing, try to clean up the original file
      if (finalFilePath === filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting original file on error:", err);
        });
      }
      metadata = {
        type: "unknown",
        mime_type: mimeType,
        size: fileSize, // Use original fileSize as processing failed
        error: error.message,
      };
      // Even if there's an error, try to provide a URL to the original (if not zipped)
      if (!finalFileUrl) {
        finalFileUrl = `/uploads/messages/attachment/${conversationId}/${req.file.filename}`;
      }
    }

    res.status(200).json({ url: finalFileUrl, attachment_metadata: metadata });
  },
);

router.post(
  "/upload/voice-note",
  authenticateAccess,
  msgUploadVoiceNote.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }

      const conversationId = req.body.conversation_id;
      const originalFilePath = req.file.path;

      const m4aRelativeOutputDir = path.join(
        "messages",
        "voice_notes",
        "m4a",
        conversationId,
      );
      const m4aAbsoluteOutputDir = path.join(
        __dirname,
        "..",
        BASE_UPLOAD_DIR,
        m4aRelativeOutputDir,
      );
      const m4aFileName = `${req.userId}-voice-${generateRandomAlphaNumeric()}`;

      await fs.promises.mkdir(m4aAbsoluteOutputDir, { recursive: true });

      await convertAudioToM4a(
        originalFilePath,
        m4aAbsoluteOutputDir,
        m4aFileName,
      );
      const convertedM4aRelativePath = path.join(
        m4aRelativeOutputDir,
        m4aFileName,
      );

      fs.unlink(originalFilePath, (err) => {
        if (err) console.error("Error deleting original voice note file:", err);
      });

      res.status(200).json({
        message: "Voice note uploaded and converted to M4A successfully",
        url: `/${BASE_UPLOAD_DIR}/${convertedM4aRelativePath.replace(/\\/g, "/")}.m4a`,
      });
    } catch (error) {
      console.error("Voice note upload/conversion error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

router.post(
  "/upload/video",
  authenticateAccess,
  msgUploadAttachment.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }

      const conversationId = req.body.conversation_id;
      const originalFilePath = req.file.path;
      let attachmentMetadata = null;

      try {
        const originalProbedData = await getProbeData(originalFilePath);
        const videoStream = originalProbedData.streams.find(
          (s) => s.codec_type === "video",
        );

        attachmentMetadata = {
          width: videoStream ? videoStream.width : null,
          height: videoStream ? videoStream.height : null,
          duration: originalProbedData.format.duration,
          size: originalProbedData.format.size,
          mimetype: req.file.mimetype,
          bit_rate: originalProbedData.format.bit_rate,
          avg_frame_rate: videoStream ? videoStream.avg_frame_rate : null,
          display_aspect_ratio: videoStream
            ? videoStream.width / videoStream.height
            : null,
          is_hls_converted: false,
        };
      } catch (err) {
        console.error("FFprobe error on original file:", err.message);
        attachmentMetadata = null;
      }

      if (req.file.mimetype.startsWith("video/")) {
        const hlsRelativeOutputDir = path.join(
          "messages",
          "attachment",
          "hls",
          conversationId,
        );
        const hlsAbsoluteOutputDir = path.join(
          __dirname,
          "..",
          BASE_UPLOAD_DIR,
          hlsRelativeOutputDir,
        );
        const hlsFileNamePrefix = `${req.userId}-video-${generateRandomAlphaNumeric()}`;

        await fs.promises.mkdir(hlsAbsoluteOutputDir, { recursive: true });

        const hlsPlaylistAbsolutePath = await convertVideoToHLS(
          originalFilePath,
          hlsAbsoluteOutputDir,
          hlsFileNamePrefix,
        );
        const hlsPlaylistRelativePath = path.relative(
          path.join(__dirname, "..", BASE_UPLOAD_DIR),
          hlsPlaylistAbsolutePath,
        );

        if (attachmentMetadata) {
          attachmentMetadata.mimetype = "application/x-mpegURL";
          attachmentMetadata.hls_playlist_url = `/${BASE_UPLOAD_DIR}/${hlsPlaylistRelativePath.replace(/\\/g, "/")}`;
          attachmentMetadata.is_hls_converted = true;

          try {
            const hlsProbedData = await getProbeData(hlsPlaylistAbsolutePath);
            attachmentMetadata.duration =
              hlsProbedData.format.duration || attachmentMetadata.duration;
            attachmentMetadata.size =
              hlsProbedData.format.size || attachmentMetadata.size;
            attachmentMetadata.bit_rate =
              hlsProbedData.format.bit_rate || attachmentMetadata.bit_rate;
          } catch (hlsProbeErr) {
            console.warn("FFprobe error on HLS playlist:", hlsProbeErr.message);
          }
        }

        fs.unlink(originalFilePath, (err) => {
          if (err) console.error("Error deleting original video file:", err);
        });

        res.status(200).json({
          message: "Video uploaded and converted to HLS successfully",
          url: attachmentMetadata
            ? attachmentMetadata.hls_playlist_url
            : `/${BASE_UPLOAD_DIR}/${hlsPlaylistRelativePath.replace(/\\/g, "/")}`,
          attachment_metadata: attachmentMetadata,
        });
      } else {
        const attachmentRelativeOutputDir = path.join(
          "messages",
          "attachment",
          conversationId,
        );
        const attachmentAbsoluteOutputDir = path.join(
          __dirname,
          "..",
          BASE_UPLOAD_DIR,
          attachmentRelativeOutputDir,
        );
        const newAttachmentFileName = `${req.userId}-${generateRandomAlphaNumeric()}${path.extname(req.file.originalname)}`;
        const newAttachmentAbsolutePath = path.join(
          attachmentAbsoluteOutputDir,
          newAttachmentFileName,
        );

        await fs.promises.mkdir(attachmentAbsoluteOutputDir, {
          recursive: true,
        });
        await fs.promises.rename(originalFilePath, newAttachmentAbsolutePath);

        const newAttachmentRelativePath = path.join(
          attachmentRelativeOutputDir,
          newAttachmentFileName,
        );

        if (attachmentMetadata) {
          attachmentMetadata.mimetype = req.file.mimetype;
          attachmentMetadata.is_hls_converted = false;
        }

        res.status(200).json({
          message: "Attachment uploaded successfully",
          url: `/${BASE_UPLOAD_DIR}/${newAttachmentRelativePath.replace(/\\/g, "/")}`,
          attachment_metadata: attachmentMetadata,
        });
      }
    } catch (error) {
      console.error("Attachment upload/conversion error:", error);
      res.status(500).json({ message: error.message });
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
              as: "user", // <--- THIS IS THE FIX: Specify the 'as' alias here
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
        // Now, access the User through the 'user' alias:
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

module.exports = router;
