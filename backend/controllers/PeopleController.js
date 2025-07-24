const { Op } = require("sequelize");
const { Follower, User, Post } = require("../models");
const { encrypt, decrypt } = require("../utils/encryption"); // <-- Import your encryption functions

exports.getAllPeople = async (req, res) => {
  try {
    const { limit = 20, cursor: encryptedCursor } = req.query; // Expecting encrypted cursor now
    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ message: "Invalid limit provided." });
    }

    let cursorCreatedAt = null;
    let cursorId = null;
    let whereClause = {}; // We'll build the where clause for the cursor here

    if (encryptedCursor) {
      try {
        const decryptedCursor = decrypt(encryptedCursor);
        // The cursor format is "id_createdAt" based on your example
        const [id, createdAtStr] = decryptedCursor.split("_");

        // Validate id and createdAt
        if (!id || !createdAtStr) {
          console.warn("Decrypted cursor missing parts:", decryptedCursor);
          return res.status(400).json({ message: "Invalid cursor format." });
        }

        cursorId = id;
        const dateObj = new Date(createdAtStr); // Parse the date string

        if (isNaN(dateObj.getTime())) {
          // Check if the date is valid
          console.warn(
            "Invalid createdAt date in decrypted cursor:",
            createdAtStr,
          );
          return res.status(400).json({ message: "Invalid cursor date." });
        }
        cursorCreatedAt = dateObj;

        // Build the where clause for pagination
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
        console.error("Error decrypting cursor:", decryptErr.message);
        return res.status(400).json({ message: "Invalid cursor." });
      }
    }

    // Fetch following data for the current user (needed for `isFollowing`)
    const rawFollowing = await Follower.findAll({
      where: { follower_id: req.userId },
      attributes: ["followee_id"],
      raw: true,
    });
    const followingSet = new Set(rawFollowing.map((f) => f.followee_id));

    let userQueryOptions = {
      where: {
        id: { [Op.ne]: req.userId }, // Exclude the current user
        ...whereClause, // Apply the cursor-based where clause
      },
      attributes: [
        "id",
        "name",
        "username",
        "avatar",
        "bio",
        "contact",
        "createdAt", // Crucial for cursor
      ],
      order: [
        ["createdAt", "DESC"], // Primary sort
        ["id", "DESC"], // Secondary sort for tie-breaking
      ],
      limit: parsedLimit + 1, // Fetch one extra to determine hasMore
      raw: true,
    };

    let rawUsers = await User.findAll(userQueryOptions);

    // Determine hasMore based on the raw fetched users
    const hasMore = rawUsers.length > parsedLimit;

    // Slice to the exact limit for the users to send
    const usersToSend = rawUsers.slice(0, parsedLimit);

    let nextCursor = null;
    // Generate nextCursor ONLY if there are more results
    if (hasMore && usersToSend.length > 0) {
      const lastUser = usersToSend[usersToSend.length - 1];
      // Format the cursor exactly like your working example: "id_createdAt"
      nextCursor = encrypt(
        `${lastUser.id}_${lastUser.createdAt.toISOString()}`,
      );
    }

    // Map usersToSend to add the isFollowing property for the frontend
    const finalUsersToSend = usersToSend.map((user) => ({
      ...user,
      isFollowing: followingSet.has(user.id),
    }));

    // Ensure `createdAt` is removed for client, as it's meant for cursor only
    const sanitizedUsers = finalUsersToSend.map(
      // eslint-disable-next-line no-unused-vars
      ({ createdAt, ...rest }) => rest,
    );

    return res.json({
      users: sanitizedUsers,
      next_cursor: nextCursor, // Will be null if no more data
      has_more: hasMore, // Will be false if no more data
    });
  } catch (err) {
    console.error("Unhandled error in getAllPeople:", err);
    res.status(500).json({ message: "Server error fetching people." });
  }
};

exports.follow = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const meId = req.userId; // assuming you have auth middleware

    // Avoid following yourself
    if (targetId === meId) {
      return res.status(400).json({
        error: "Can't follow yourself.",
      });
    }

    //const me = await User.findByPk(meId);
    const target = await User.findByPk(targetId);
    if (!target) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    await Follower.create({
      follower_id: meId,
      followee_id: targetId,
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error("Follow error:", error);
    return res.status(500).json({
      error: "Could not follow user.",
    });
  }
};

exports.unfollow = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const meId = req.userId;

    // optional: verify the target exists
    const target = await User.findByPk(targetId);
    if (!target) {
      return res.status(404).json({ error: "User not found." });
    }

    // actually remove the follower relationship
    const deleted = await Follower.destroy({
      where: {
        follower_id: meId,
        followee_id: targetId,
      },
    });

    if (!deleted) {
      // nothing was deleted → you weren’t following them
      return res.status(400).json({ error: "Not following this user." });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Unfollow error:", error);
    return res.status(500).json({ error: "Could not unfollow user." });
  }
};

exports.followingList = async (req, res) => {
  try {
    const { cursor, limit } = req.params;
    const limitNum = parseInt(limit, 10);
    const cursorId = parseInt(cursor, 10);

    // build base filter
    const whereCond = { follower_id: req.userId };
    if (cursorId) {
      whereCond.followee_id = { [Op.gt]: cursorId };
    }

    // fetch one page
    const rawFollowingList = await Follower.findAll({
      where: whereCond,
      attributes: ["followee_id"],
      order: [["followee_id", "ASC"]],
      limit: limitNum,
      raw: true,
    });

    // if nothing left, just return empty array and null cursor
    if (rawFollowingList.length === 0) {
      return res.json({
        nextCursor: null,
        users: [],
      });
    }

    // otherwise proceed as before
    const followeeIds = rawFollowingList.map((i) => i.followee_id);
    const nextCursor =
      followeeIds.length === limitNum
        ? followeeIds[followeeIds.length - 1]
        : null;

    // who's following you
    const rawFollowersList = await Follower.findAll({
      where: { followee_id: req.userId },
      attributes: ["follower_id"],
      raw: true,
    });
    const followerSet = new Set(rawFollowersList.map((i) => i.follower_id));

    // load user profiles
    const rawUsers = await User.findAll({
      where: { id: followeeIds },
      attributes: ["id", "name", "username", "avatar", "bio"],
      raw: true,
    });

    // tag ‘em
    const users = rawUsers.map((u) => ({
      ...u,
      isFollowing: true,
      isFollower: followerSet.has(u.id),
    }));

    return res.json({ nextCursor, users });
  } catch (err) {
    console.error("Following list error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.followersList = async (req, res) => {
  try {
    const { cursor, limit } = req.params;
    const limitNum = parseInt(limit, 10);
    const cursorId = parseInt(cursor, 10);

    // 1) build base filter for who follows you
    const whereCond = { followee_id: req.userId };
    if (cursorId) {
      whereCond.follower_id = { [Op.gt]: cursorId };
    }

    // 2) fetch one page of followers
    const rawFollowersPage = await Follower.findAll({
      where: whereCond,
      attributes: ["follower_id"],
      order: [["follower_id", "ASC"]],
      limit: limitNum,
      raw: true,
    });

    // 3) if empty, bail
    if (rawFollowersPage.length === 0) {
      return res.json({
        nextCursor: null,
        users: [],
      });
    }

    // 4) compute nextCursor
    const followerIds = rawFollowersPage.map((i) => i.follower_id);
    const nextCursor =
      followerIds.length === limitNum
        ? followerIds[followerIds.length - 1]
        : null;

    // 5) who you follow (to flag isFollowing)
    const rawFollowingList = await Follower.findAll({
      where: { follower_id: req.userId },
      attributes: ["followee_id"],
      raw: true,
    });
    const followingSet = new Set(rawFollowingList.map((i) => i.followee_id));

    // 6) load user profiles
    const rawUsers = await User.findAll({
      where: { id: followerIds },
      attributes: ["id", "name", "username", "avatar", "bio"],
      raw: true,
    });

    // 7) tag’em
    const users = rawUsers.map((u) => ({
      ...u,
      isFollower: true, // obviously these folks follow you
      isFollowing: followingSet.has(u.id), // flag if you follow them back
    }));

    return res.json({ nextCursor, users });
  } catch (err) {
    console.error("Followers list error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.fetchThisUser = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const meId = req.userId;

    // 1) Load the user
    const rawUser = await User.findByPk(targetId, {
      attributes: [
        "id",
        "name",
        "username",
        "avatar",
        "bio",
        "contact",
        "email",
      ],
      include: [
        {
          model: Post,
          as: "posts",
          attributes: ["id"],
        },
      ],
      //raw: true,
    });
    if (!rawUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const userMediaPosts = await Post.findAll({
      where: {
        [Op.and]: [
          { userId: targetId },
          {
            [Op.or]: [{ type: "image" }, { type: "video" }],
          },
          {
            [Op.or]: [{ audience: "public" }, { audience: "friends" }],
          },
        ],
      },
      attributes: ["id", "type", "mediaUrl", "originalMedia", "thumbnailUrl"],
      raw: true,
      limit: 50,
      order: [["createdAt", "DESC"]],
    });
    //console.log(userMediaPosts)

    // 2) Count how many they follow
    const followingCount = await Follower.count({
      where: { follower_id: targetId },
    });

    // 3) Count how many follow them
    const followersCount = await Follower.count({
      where: { followee_id: targetId },
    });

    // 4) Are *you* following them?
    const isFollowing = Boolean(
      await Follower.findOne({
        where: {
          follower_id: meId,
          followee_id: targetId,
        },
      }),
    );

    // 5) Build response
    const user = {
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      username: rawUser.username,
      avatar: rawUser.avatar,
      bio: rawUser.bio,
      media: userMediaPosts,
      contact: rawUser.contact,
      postsCount: rawUser.posts.length,
      followingCount,
      followersCount,
      isFollowing,
    };

    return res.json(user);
  } catch (err) {
    console.error("Error fetching thisuser:", err);
    return res.status(500).json({ error: "Server error." });
  }
};

exports.getProfileCounts = async (req, res) => {
  try {
    const followingCount = await Follower.count({
      where: { follower_id: req.userId },
    });

    const followersCount = await Follower.count({
      where: { followee_id: req.userId },
    });

    const user = await User.findByPk(req.userId, {
      include: ["posts"],
    });

    res.json({
      postsCount: user.posts.length,
      followersCount,
      followingCount,
    });
  } catch (err) {
    res.status(500).json(err.massage);
  }
};
