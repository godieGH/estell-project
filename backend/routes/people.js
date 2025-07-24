// src/routes/people.js
const express = require("express");
const router = express.Router();
const { authenticateAccess } = require("../middleware/JwtAccessTokenAuth");

const {
  getAllPeople,
  follow,
  unfollow,
  followingList,
  followersList,
  fetchThisUser,
  getProfileCounts,
} = require("../controllers/PeopleController");

// GET /people?filter=popular|trending|nearby|all
router.get("/", authenticateAccess, getAllPeople);

// POST /people/:id/follow
router.post("/:id/follow", authenticateAccess, follow);

// DELETE /people/:id/follow
router.delete("/:id/follow", authenticateAccess, unfollow);

router.get("/following/list/:cursor/:limit", authenticateAccess, followingList);

router.get("/followers/list/:cursor/:limit", authenticateAccess, followersList);

// GET /people/thisuser/:id
router.get("/thisuser/:id", authenticateAccess, fetchThisUser);

router.get("/me", authenticateAccess, async (req, res) => {
  const user = await require("../models").User.findByPk(req.userId);
  res.json(user);
});

router.get("/profile/counts/", authenticateAccess, getProfileCounts);

module.exports = router;
