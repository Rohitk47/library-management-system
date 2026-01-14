module.exports.isLoggedIn = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

module.exports.isAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  if (req.session.user.role !== 'admin') {
    return res.send('Access Denied: Admin only');
  }

  next();
};
