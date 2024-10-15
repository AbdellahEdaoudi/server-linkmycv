
exports.verifyRole = (role) => {
  return (req, res, next) => {
    if (req.user.UserInfo.role !== role) {
      return res.status(401).json({ message: "Not allowed" });
    }
    next();
  };
};
