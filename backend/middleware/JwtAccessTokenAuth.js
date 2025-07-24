const jwt = require("jsonwebtoken");

exports.authenticateAccess = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  //console.log(authHeader);
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided." });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // 4
    if (err) {
      return res.status(401).json({ error: "Invalid token." });
    }
    req.userId = decoded.userId; // assume payload was { userId } 5
    next();
  });
};
