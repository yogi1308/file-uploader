require("dotenv").config();
const express = require("express")
const path = require("node:path")
const indexRouter = require('./routes/index')
const passport = require("passport");
require('./config/passport')(passport)
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const expressSession = require("express-session");
const prisma = require("./lib/prisma");

const app = express()

const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));
app.use(express.urlencoded({ extended: true }));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
  expressSession({
    cookie: {
     maxAge: 7 * 24 * 60 * 60 * 1000 // ms
    },
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(
      prisma,
      {
        checkPeriod: 2 * 60 * 1000,  //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }
    )
  })
);
app.use(passport.session())

app.use("/", indexRouter)

const PORT = process.env.PORT;
app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`Listening on port ${PORT}!`);
});

module.exports = app;