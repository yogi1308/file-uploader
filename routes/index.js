const express = require("express")
const router = express.Router()
const passport = require("passport");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs")
const { findUser, createUser, postUploadDbUpdate, getUserFiles, createFolder, getUserFolders, checkFolderExists } = require("../lib/queries");
const multer  = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 4 * 1024 * 1024, // Limit file size to 10MB
    files: 5 // Limit to 5 files per upload
  }
})
const {uploadToCloudinary, createFolderInCloudinary, createNewUserFolder} = require("../upload/cloudinary");
const { user } = require("../lib/prisma");

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

router.post("/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login"
  })
);

router.get("/login", (req, res) => {
  res.render("login")
});

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect("/")
    })
})

router.get("/signup", (req, res) => {
  res.render("signup")
});

router.get("/", isAuthenticated, async (req, res) => {
  const userFiles = await getUserFiles(req.user.id)
  const userFolders = await getUserFolders(req.user.id)
  res.render("index", { user: req.user , files: {userFiles}, folders: {userFolders}})
})

router.post("/signup",
    body("username").trim().isLength({ min: 3 }).withMessage("Username is required and must be at least 3 characters long."),
    body("password").trim().isLength({ min: 8 }).withMessage("Password must be at least 8 characters long.")
        .matches(/[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/).withMessage("Password must contain at least 1 special character.")
        .matches(/[A-Z]/).withMessage("Password must have at least 1 uppercase and lowercase character.")
        .matches(/[a-z]/).withMessage("Password must have at least 1 uppercase and lowercase character.")
        .matches(/[0-9]/).withMessage("Password must have at least 1 numerical character."),
    body('confirmPassword').trim().custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    async(req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = {};
            errors.array().forEach(error => {
                errorMessages[error.path || error.param] = error.msg;
            });
            return res.render("signup", { errors: errorMessages, userInput: req.body });
        }

        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const newUser = await createUser(req.body.username, hashedPassword);
            if (!newUser) {
              return res.redirect('/signup');
            }
            req.logIn(newUser, async (err) => {
                if (err) { 
                    return next(err); 
                }
                await createNewUserFolder(req.user.id)
                return res.redirect("/");
            });
        }
        catch (error) {
            console.error(error);
            return next(error);
        }
});

router.post('/upload', isAuthenticated, upload.array('file'), uploadToCloudinary, async function (req, res) {
  try {
    await postUploadDbUpdate(req.user.id, req.uploads)
    res.redirect("/")
  }
  catch (error) {
    console.log(error)
    res.status(500).send("Error uploading files")
  }
})

router.post('/upload-folder', isAuthenticated, async (req, res) => {
  try {
    const exists = await checkFolderExists(req.user.id, req.body.folderName);
    console.log(exists)
    if (exists) {
      throw new Error("Folder already exists");
    }
    const cloudFolder = await createFolderInCloudinary(req.user.id, req.body.folderName);
    await createFolder(req.user.id, cloudFolder)
    res.redirect("/")
  }
  catch (error) {
    if (error.message === "Folder already exists") {
      const userFiles = await getUserFiles(req.user.id);
      return res.render("index", { user: req.user, files: { userFiles }, error: error.message });
    }
    else {
      console.log(error)
      res.status(500).send("Error uploading files")
    }
  }
})

module.exports = router