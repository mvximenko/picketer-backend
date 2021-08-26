const roles = (permissions) => (req, res, next) => {
  const userRole = req.user.role;
  if (permissions.includes(userRole)) {
    next();
  } else {
    return res.status(401).json(`You don't have permission`);
  }
};

module.exports = roles;
