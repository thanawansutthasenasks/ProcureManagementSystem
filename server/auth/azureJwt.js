const passport = require("passport");
const BearerStrategy = require("passport-azure-ad").BearerStrategy;

passport.use(
  new BearerStrategy(
    {
      identityMetadata:
        "https://login.microsoftonline.com/5f0361cd-3dee-40f7-8f86-6721572c51e5/v2.0/.well-known/openid-configuration",

      clientID: "17f570c7-23ea-4e94-9fa1-a20d12b6ab09",
      audience: "17f570c7-23ea-4e94-9fa1-a20d12b6ab09",

      validateIssuer: true,
      issuer:
        "https://login.microsoftonline.com/5f0361cd-3dee-40f7-8f86-6721572c51e5/v2.0",

      loggingLevel: "warn"
    },
    (token, done) => {
      // token === decoded JWT
      return done(null, token);
    }
  )
);

module.exports = passport.authenticate("oauth-bearer", {
  session: false
});
