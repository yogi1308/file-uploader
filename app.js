require("dotenv").config();
const express = require("express")
const path = require("node:path")
const indexRouter = require('./routes/index')
const session = require("express-session");
const passport = require("passport");
require('./config/passport')(passport)
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const app = express()

const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));
app.use(express.urlencoded({ extended: true }));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URI
});

app.use(session({ 
//   store: new pgSession({
//     pool: sessionPool,
//     createTableIfMissing: true
//   }),
  secret: process.env.SESSION_SECRET, 
  resave: false, 
  saveUninitialized: false
}));
app.use(passport.session());

app.use("/", indexRouter)

const PORT = process.env.PORT;
app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`Listening on port ${PORT}!`);
});

module.exports = app;