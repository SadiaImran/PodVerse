const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // ✅ Corrected from decoded.id to decoded.userId
    console.log("User ID from middleware:", req.userId);
    next();
  } catch (err) {
    console.error("Invalid token:", err);
    return res.status(401).json({ msg: "Unauthorized: Invalid token" });
  }
};

module.exports = authMiddleware;
