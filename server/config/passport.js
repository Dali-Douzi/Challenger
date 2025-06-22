const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const DiscordStrategy = require("passport-discord").Strategy;
const OAuth2Strategy = require("passport-oauth2").Strategy;
const User = require("../models/User");

// Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.authProvider = "google";
          await user.save();
          return done(null, user);
        }

        // Generate unique username if needed
        let username =
          profile.displayName || profile.emails[0].value.split("@")[0];
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          username = `${username}_${Date.now()}`;
        }

        // Create new user
        user = new User({
          googleId: profile.id,
          username: username,
          email: profile.emails[0].value,
          avatar: profile.photos[0]?.value,
          password: "oauth_user", // Placeholder for OAuth users
          authProvider: "google",
        });

        await user.save();
        done(null, user);
      } catch (error) {
        console.error("Google OAuth error:", error);
        done(error, null);
      }
    }
  )
);

// Discord OAuth
passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: "/api/auth/discord/callback",
      scope: ["identify", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ discordId: profile.id });

        if (user) {
          return done(null, user);
        }

        user = await User.findOne({ email: profile.email });

        if (user) {
          user.discordId = profile.id;
          user.authProvider = "discord";
          await user.save();
          return done(null, user);
        }

        // Generate unique username if needed
        let username = profile.username;
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          username = `${username}_${Date.now()}`;
        }

        user = new User({
          discordId: profile.id,
          username: username,
          email: profile.email,
          avatar: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
          password: "oauth_user",
          authProvider: "discord",
        });

        await user.save();
        done(null, user);
      } catch (error) {
        console.error("Discord OAuth error:", error);
        done(error, null);
      }
    }
  )
);

// Twitch OAuth (using generic OAuth2Strategy)
passport.use(
  "twitch",
  new OAuth2Strategy(
    {
      authorizationURL: "https://id.twitch.tv/oauth2/authorize",
      tokenURL: "https://id.twitch.tv/oauth2/token",
      clientID: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      callbackURL: "/api/auth/twitch/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Get user info from Twitch API
        const response = await fetch("https://api.twitch.tv/helix/users", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Client-Id": process.env.TWITCH_CLIENT_ID,
          },
        });

        const userData = await response.json();

        if (!userData.data || userData.data.length === 0) {
          return done(new Error("Failed to get user data from Twitch"), null);
        }

        const twitchUser = userData.data[0];

        let user = await User.findOne({ twitchId: twitchUser.id });

        if (user) {
          return done(null, user);
        }

        user = await User.findOne({ email: twitchUser.email });

        if (user) {
          user.twitchId = twitchUser.id;
          user.authProvider = "twitch";
          await user.save();
          return done(null, user);
        }

        // Generate unique username if needed
        let username = twitchUser.display_name || twitchUser.login;
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          username = `${username}_${Date.now()}`;
        }

        user = new User({
          twitchId: twitchUser.id,
          username: username,
          email: twitchUser.email,
          avatar: twitchUser.profile_image_url,
          password: "oauth_user",
          authProvider: "twitch",
        });

        await user.save();
        done(null, user);
      } catch (error) {
        console.error("Twitch OAuth error:", error);
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
