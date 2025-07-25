const { Op } = require("sequelize");
const { Comment, Post, User, Follower, Likes } = require("../models");

exports.toggleLike = async (req, res) => {
  try {
    const postId = req.params.post_id;
    const userId = req.userId;

    const [user, post] = await Promise.all([
      User.findByPk(userId),
      Post.findByPk(postId),
    ]);

    if (!user || !post) {
      return res.status(404).json({ error: "User or post not found" });
    }

    // Check if the user already liked the post
    const hasLiked = await user.hasLikedPost(post);

    if (hasLiked) {
      // User already liked it → remove the like
      await user.removeLikedPost(post);
      return res.status(200).json({ message: "Like removed" });
    } else {
      // User hasn’t liked it yet → add the like
      await user.addLikedPost(post);
      return res.status(200).json({ message: "Post liked" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllLikers = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.post_id, {
      include: [
        {
          model: User,
          as: "likers",
          attributes: ["id", "name", "username", "avatar"],
          through: {
            attributes: ["createdAt"],
          },
        },
      ],
    });

    if (!post) {
      return res.status(404).json("No post");
    }

    const sortedLikers = post.likers.sort((a, b) => {
      return new Date(b.Like.createdAt) - new Date(a.Like.createdAt);
    });

    res.status(200).json(sortedLikers || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ Error: "Server Not responding" });
  }
};

exports.getAvatarForLikersFollowed = async (req, res) => {
  try {
    const { post_id: postId } = req.params;
    const userId = req.userId;

    // 1) followees
    const followRows = await Follower.findAll({
      where: { follower_id: userId },
      attributes: ["followee_id"],
      raw: true,
    });
    const followeeIds = followRows.map((f) => f.followee_id);
    if (!followeeIds.length) return res.json([]);

    // 2) likes
    const likeRows = await Likes.findAll({
      where: {
        post_id: postId,
        user_id: { [Op.in]: followeeIds },
      },
      include: [{ model: User, as: "user", attributes: ["id", "avatar"] }],
      attributes: ["user_id", "createdAt"],
    });
    const likeActs = likeRows.map((l) => ({
      userId: l.user_id,
      avatar: l.user.avatar,
      timestamp: l.createdAt,
    }));

    // 3) comments
    const commentRows = await Comment.findAll({
      where: {
        post_id: postId,
        commenter_id: { [Op.in]: followeeIds },
      },
      include: [{ model: User, as: "commenter", attributes: ["id", "avatar"] }],
      attributes: ["commenter_id", "createdAt"],
    });
    const commentActs = commentRows.map((c) => ({
      userId: c.commenter_id,
      avatar: c.commenter.avatar,
      timestamp: c.createdAt,
    }));

    // 4) merge + sort DESC
    const all = [...likeActs, ...commentActs].sort(
      (a, b) => b.timestamp - a.timestamp,
    );

    // 5) dedupe & limit 5
    const seen = new Set();
    const topAvatars = [];
    for (const act of all) {
      if (!seen.has(act.userId)) {
        seen.add(act.userId);
        topAvatars.push({ avatar: act.avatar });
        if (topAvatars.length === 5) break;
      }
    }

    return res.json(topAvatars);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ Error: "Server Not Responding." });
  }
};

exports.getLikersFollowed = async (req, res) => {
  try {
    const postId = req.params.post_id;
    const userId = req.userId;

    // 1) Get the users you follow
    const followees = await Follower.findAll({
      where: { follower_id: userId },
      attributes: ["followee_id"],
      raw: true,
    });
    const followeeIds = followees.map((f) => f.followee_id);
    if (!followeeIds.length) return res.json([]);

    // 2) Get likes from followees
    const likeUsers = await User.findAll({
      where: { id: followeeIds },
      include: [
        {
          model: Likes,
          as: "likes",
          where: { post_id: postId },
          attributes: ["createdAt"],
        },
      ],
      attributes: ["id", "username", "name", "avatar"],
      order: [[{ model: Likes, as: "likes" }, "createdAt", "DESC"]],
    });

    const likeActivities = likeUsers.map((u) => ({
      type: "like",
      user: {
        id: u.id,
        username: u.username,
        name: u.name,
        avatar: u.avatar,
      },
      timestamp: u.likes[0].createdAt,
    }));

    // 3) Get latest comment per user
    const rawComments = await Comment.findAll({
      where: {
        post_id: postId,
        commenter_id: { [Op.in]: followeeIds },
      },
      order: [["createdAt", "DESC"]],
      attributes: ["commenter_id", "comment_body", "createdAt"],
    });

    const seen = new Set();
    const commentActivities = [];

    for (const comment of rawComments) {
      const id = comment.commenter_id;
      if (seen.has(id)) continue;
      seen.add(id);

      const user = await User.findByPk(id, {
        attributes: ["id", "username", "name", "avatar"],
      });

      if (!user) continue;

      commentActivities.push({
        type: "comment",
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          avatar: user.avatar,
        },
        body: comment.comment_body,
        timestamp: comment.createdAt,
      });
    }

    // 4) Merge & sort all by time DESC
    const activities = [...likeActivities, ...commentActivities].sort(
      (a, b) => b.timestamp - a.timestamp,
    );

    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ Error: "Server Not Responding." });
  }
};
exports.getMentionedUser = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json("Not Found");
    }

    const user = await User.findOne({
      where: {
        id,
      },
      attributes: ["id", "username", "avatar"],
    });

    res.json(user);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.createAPostController = async (req, res) => {
  try {
    let {
      type,
      body,
      mediaUrl,
      media_metadata,
      thumbnailUrl,
      originalMedia,
      link_url,
      like_counts,
      location,
      comments,
      status,
      audience,
      category,
      keywords,
      scheduleAt,
    } = req.body;

    // If any of these come in as strings, JSON.parse ’em
    if (typeof link_url === "string") link_url = JSON.parse(link_url);
    if (typeof location === "string") location = JSON.parse(location);
    if (typeof keywords === "string") keywords = JSON.parse(keywords);
    if (typeof media_metadata === "string") media_metadata = JSON.parse(media_metadata);

    const schedule_at = scheduleAt ? new Date(scheduleAt) : null;
    const newPost = await Post.create({
      userId: req.userId,
      type,
      body,
      mediaUrl,
      mediaMetadata: media_metadata,
      thumbnailUrl,
      originalMedia,
      linkUrl: link_url,
      status,
      audience,
      category,
      location,
      allow_comments: comments,
      likeCounts: like_counts,
      keywords,
      scheduleAt: schedule_at,
    });
    return res.status(201).json(newPost);
  } catch (err) {
    console.error("Create post error:", err);
    return res.status(500).json({ error: "Server error, can’t create post" });
  }
};

exports.updatePostController = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const post = await Post.findByPk(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    if (post.userId !== req.userId) {
      return res
        .status(403)
        .json({ message: "Forbidden. You can only edit your own posts." });
    }

    const updatedPost = await post.update({
      body: payload.body,
      linkUrl: payload.linkUrl,
      audience: payload.audience,
      category: payload.category,
      allow_comments: payload.comments,
      likeCounts: payload.likeCounts,
      keywords: payload.keywords,
    });

    // 5. Send the updated post back to the client
    res.status(200).json(updatedPost);
  } catch (err) {
    // Generic error handler for any other issues
    console.error("Update post error:", err);
    res.status(500).json({ message: err.message });
  }
};
