module.exports = function userContext(req, res, next) {

  const claims = req.user;

  const email =
    claims.email || claims.preferred_username || "";

  const roles = claims.roles || [];

  const isOutlet = roles.includes("Outlet");

  const outletCode =
    isOutlet && email.includes(".")
      ? email.split(".")[0]
      : null;


  req.userContext = {
    email,
    roles,
    isOutlet,
    outletCode,
    name: claims.name
  };

  next();
};
