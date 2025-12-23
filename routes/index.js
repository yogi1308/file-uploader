const express = require("express")
const router = express.Router()
const passport = require("passport");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs")
const { findUser, createUser, postUploadDbUpdate, getUserFiles, createFolder, getUserFolders, checkFolderExists, checkUserOwnsAsset, deleteFromDB, checkUserOwnsAssetUsingPublicId, renameFromDB, togglePin, toggleStar, getPinned, getStarred, getRecent, getVideos, getPhotos, getDocuments } = require("../lib/queries");
const multer  = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 4 * 1024 * 1024, // Limit file size to 10MB
    files: 5 // Limit to 5 files per upload
  }
})
const {uploadToCloudinary, createFolderInCloudinary, createNewUserFolder, getFolders, deleteFromCloudinary, renameCloudinaryFile} = require("../upload/cloudinary");



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
  const path = req.query.folder ? `${req.user.id}/${req.query.folder}` : req.user.id

  const [userFiles, cloudinaryFolders, pinned] = await Promise.all([
    getUserFiles(path),
    getFolders(path),
    getPinned(req.user.id)
  ])

  const userFolders = await getUserFolders(cloudinaryFolders)

  res.render("index", { user: req.user , files: {userFiles}, folders: {userFolders}, parentFolder: req.query.folder, pinned: pinned})
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
    await postUploadDbUpdate(req.user.id, req.uploads, req.query.folder)
    let redirectUrl = ''
    if (req.query.folder === 'recent' || req.query.folder === 'videos'  || req.query.folder === 'documents' || req.query.folder === 'photos' || req.query.folder === 'starred') {redirectUrl = `/${req.query.folder}`}
    else {redirectUrl = req.query.folder ? `/?folder=${encodeURIComponent(req.query.folder)}` : "/";}
    res.redirect(redirectUrl)
  }
  catch (error) {
    console.log(error)
    res.status(500).send("Error uploading files")
  }
})

router.post('/upload-folder', isAuthenticated, async (req, res) => {
  try {
    const exists = await checkFolderExists(req.user.id, req.body.folderName);
    if (exists) {
      throw new Error("Folder already exists");
    }
    const cloudFolder = await createFolderInCloudinary(req.user.id, req.body.folderName, req.query.folder);
    await createFolder(req.user.id, cloudFolder, req.query.folder)
    if (req.query.folder === 'recent' || req.query.folder === 'videos'  || req.query.folder === 'documents' || req.query.folder === 'photos' || req.query.folder === 'starred') {redirectUrl = `/${req.query.folder}`}
    else {redirectUrl = req.query.folder ? `/?folder=${encodeURIComponent(req.query.folder)}` : "/";}
    res.redirect(redirectUrl)
  }
  catch (error) {
    if (error.message === "Folder already exists") {
      const parent = req.query.folder;
      const userFiles = await getUserFiles(req.user.id, parent);
      let userFolders;
      parent === undefined ? userFolders = await getFolders(req.user.id) : userFolders = await getFolders(`${req.user.id}/${parent}`)
      userFolders = await getUserFolders(userFolders)
      return res.render("index", { user: req.user, files: { userFiles }, error: error.message, folders: {userFolders}, folderName: req.body.folderName, parentFolder: parent });
    }
    else {
      console.log(error)
      res.status(500).send("Error uploading files")
    }
  }
})

router.delete('/asset', isAuthenticated, express.json(), async (req, res) => {
  try {
    const owns = await checkUserOwnsAsset(req.body.assetId, req.user.id)
    if (!owns) {
      return res.status(403).json({ success: false, message: "Unauthorized" })
    }
    await deleteFromCloudinary(req.body.assetId)
    await deleteFromDB(req.body.assetId)
  }
  catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: "Error deleting asset" })
  }
  
  res.status(200).json({ success: true })
})

router.patch('/asset', isAuthenticated, express.json(), async (req, res) => {
  try {
    const owns = await checkUserOwnsAssetUsingPublicId(req.body.publicId, req.user.id)
    if (!owns) {
      return res.status(403).json({ success: false, message: "Unauthorized" })
    }
    await renameCloudinaryFile(req.body.publicId, req.body.new_display_name, req.body.resourceType)
    await renameFromDB(req.body.publicId, req.body.new_display_name)
  }
  catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: "Error deleting asset" })
  }
  
  res.status(200).json({ success: true })
})

router.patch('/toggle', isAuthenticated, express.json(), async (req, res) => {
  try {
    if (req.body.toggle === "starred") await toggleStar(req.body.itemid, req.body.itemType)
    else if (req.body.toggle === "pinned") {await togglePin(req.body.itemid)}
  }
  catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: "Error updating asset" })
  }
  
  res.status(200).json({ success: true })
})

router.get('/starred', isAuthenticated, async (req, res) => {
  try {
    const [[userFiles, userFolders], pinned] = await Promise.all([
      getStarred(req.user.id),
      getPinned(req.user.id)
    ])
    res.render("index", { user: req.user , files: {userFiles}, folders: {userFolders}, parentFolder: 'starred', pinned: pinned})
  }
  catch (error) {
    console.error(error)
  }
})

router.get('/recent', isAuthenticated, async (req, res) => {
  try {
    const [recentItems, pinned] = await Promise.all([
      getRecent(req.user.id),
      getPinned(req.user.id)
    ])
    res.render("index", { user: req.user , items: recentItems, parentFolder: 'recent', pinned: pinned})
  }
  catch (error) {
    console.error(error)
  }
})

router.get('/videos', isAuthenticated, async (req, res) => {
  try {
    const [items, pinned] = await Promise.all([
      getVideos(req.user.id),
      getPinned(req.user.id)
    ])
    res.render("index", { user: req.user , items: items, parentFolder: 'videos', pinned: pinned})
  }
  catch (error) {
    console.error(error)
  }
})

router.get('/photos', isAuthenticated, async (req, res) => {
  try {
    const [items, pinned] = await Promise.all([
      getPhotos(req.user.id),
      getPinned(req.user.id)
    ])
    res.render("index", { user: req.user , items: items, parentFolder: 'photos', pinned: pinned})
  }
  catch (error) {
    console.error(error)
  }
})

router.get('/documents', isAuthenticated, async (req, res) => {
  try {
    const [items, pinned] = await Promise.all([
      getDocuments(req.user.id),
      getPinned(req.user.id)
    ])
    res.render("index", { user: req.user , items: items, parentFolder: 'documents', pinned: pinned})
  }
  catch (error) {
    console.error(error)
  }
})

module.exports = router