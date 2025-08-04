const express = require('express')
const router = express.Router()

router.get('/:postId', (req, res) => {
   res.json({
      post: req.params.postId
   })
})


module.exports = router