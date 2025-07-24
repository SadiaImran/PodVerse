const jwt = require("jsonwebtoken");
function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send("Unauthorized");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // should be different for each user
    next();
  } catch (error) {
    return res.status(401).send("Invalid token");
  }
}
module.exports = authMiddleware;
