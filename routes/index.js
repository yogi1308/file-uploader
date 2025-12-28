const express = require("express")
const router = express.Router()
const passport = require("passport");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs")
const { createUser, fileUpload, getUserAssets, getAllAssets, checkFolderExists, createFolder, toggle, checkUserOwnsAsset, deleteFromDB, getAllAssetsInsideAFolder, renameFromDB, renameFromDBWhenFolderRenamed, getAllAssetsFromRoot } = require("../lib/queries");
const {getResourceType} = require('../util/utilFunctions')
const multer  = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 4 * 1024 * 1024, // Limit file size to 4MB
    files: 5 // Limit to 5 files per upload
  }
})
const {createNewUserFolder, uploadToCloudinary, createFolderInCloudinary, deleteFromCloudinary, deleteFolderFromCloudinary, renameCloudinaryFile, renameFolderInCloudinary, downloadAsset} = require("../upload/cloudinary");



function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

router.post("/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureMessage: true
  })
);

router.get("/login", (req, res) => {
  const errors = req.session.messages || [];
  req.session.messages = [];
  console.log(errors)
  res.render("login", { errors });
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
  const currFolder = req.query.folder !== undefined ? `${req.user.id}/${req.query.folder}` : req.user.id
  const assets = await getUserAssets(req.user.id, currFolder)
  const allAssets = await getAllAssets(req.user.id, 'folders')
  res.render("index", { user: req.user, currFolder: currFolder, assets: assets, allAssets: allAssets})
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
    req.query?.redirect === 'starred' ? await fileUpload(req.user.id, req.uploads, 'starred') : await fileUpload(req.user.id, req.uploads)
    if (req.query.redirect) {
      return res.redirect(`/${req.query.redirect}`)
    }
    const redirectUrl = req.query.folder === req.user.id ? "/" : `/?folder=${encodeURIComponent(req.query.folder.substring(req.query.folder.indexOf('/') + 1))}`
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
    const cloudFolder = await createFolderInCloudinary(req.query.folder, req.body.folderName);
    req.query?.redirect === 'starred' ? await createFolder(req.user.id, cloudFolder, 'starred') : await createFolder(req.user.id, cloudFolder)
    if (req.query.redirect) {
      return res.redirect(`/${req.query.redirect}`)
    }
    const redirectUrl = req.query.folder === req.user.id ? "/" : `/?folder=${encodeURIComponent(req.query.folder.substring(req.query.folder.indexOf('/') + 1))}`
    res.redirect(redirectUrl)
  }
  catch (error) {
    if (error.message === "Folder already exists") {
      const currFolder = req.user.id
      const assets = await getUserAssets(req.user.id, currFolder)
      const allAssets = await getAllAssets(req.user.id, 'folders')
      return res.render("index", { user: req.user, error: error.message, currFolder: currFolder, assets: assets, allAssets: allAssets });
    }
    else {
      console.log(error)
      res.status(500).send("Error uploading files")
    }
  }
})

router.patch('/toggle', isAuthenticated, express.json(), async (req, res) => {
  try {
    await toggle(req.body.toggle, req.body.assetData)
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating item");
  }
})

router.delete('/asset', isAuthenticated, express.json(), async (req, res) => {
  try {
    const owns = await checkUserOwnsAsset(req.user.id, req.body.assetData)
    if (!owns) {
      return res.status(403).json({ success: false, message: "Unauthorized" })
    }
    
    if (req.body.assetData.type !== 'folder') {
      await deleteFromCloudinary([req.body.assetData.asset_id])
      await deleteFromDB([req.body.assetData.id])
    }
    else {
      assetDbIds = []
      const [files, folders] = await getAllAssetsInsideAFolder(`${req.body.assetData.location}/${req.body.assetData.name}`)
      if (files.length > 0) {
        let filesAssetIds = []
        files.forEach(file => {filesAssetIds.push(file.asset_id); assetDbIds.push(file.id)})
        await deleteFromCloudinary(filesAssetIds)
      }
      await deleteFolderFromCloudinary(`${req.body.assetData.location}/${req.body.assetData.name}`)
      folders.forEach(file => {assetDbIds.push(file.id)})
      assetDbIds.push(`${req.body.assetData.id}`)
      await deleteFromDB(assetDbIds)
    }
  }
  catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: "Error deleting asset" })
  }
  
  res.status(200).json({ success: true })
})

router.patch('/asset', isAuthenticated, express.json(), async (req, res) => {
  try {
    const owns = await checkUserOwnsAsset(req.user.id, req.body.assetData)
    if (!owns) {
      return res.status(403).json({ success: false, message: "Unauthorized" })
    }
    if (req.body.assetData.type !== 'folder') {
      await renameCloudinaryFile(req.body.assetData, req.body.newDisplayName, getResourceType(req.body.assetData.type))
      await renameFromDB(req.body.assetData, req.body.newDisplayName)
    }
    else {
      await renameFolderInCloudinary(`${req.body.assetData.location}/${req.body.assetData.name}`, `${req.body.assetData.location}/${req.body.newDisplayName}`)
      await renameFromDBWhenFolderRenamed(req.body.assetData, req.body.newDisplayName)
    }
  }
  catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: "Error deleting asset" })
  }
  
  res.status(200).json({ success: true })
})

router.get('/recent', isAuthenticated, async (req, res) => {
  try {
    let allAssets = await getAllAssetsFromRoot(req.user.id)
    res.render("index", { user: req.user, currFolder: 'recent', assets: allAssets.sort((a, b) => b.date - a.date), allAssets: allAssets})
  }
  catch (error) {
    console.error(error)
  }
})

router.get('/starred', isAuthenticated, async (req, res) => {
  try {
    let allAssets = await getAllAssetsFromRoot(req.user.id)
    res.render("index", { user: req.user, currFolder: 'starred', assets: allAssets.filter(asset => asset.starred), allAssets: allAssets})
  }
  catch (error) {
    console.error(error)
  }
})

router.get('/videos', isAuthenticated, async (req, res) => {
  try {
    let allAssets = await getAllAssetsFromRoot(req.user.id)
    res.render("index", { user: req.user, currFolder: 'videos', assets: allAssets.filter(asset => asset.type !== 'folder' && getResourceType(asset.type) === 'video'), allAssets: allAssets})
  }
  catch (error) {
    console.error(error)
  }
})

router.get('/photos', isAuthenticated, async (req, res) => {
  try {
    let allAssets = await getAllAssetsFromRoot(req.user.id)
    res.render("index", { user: req.user, currFolder: 'photos', assets: allAssets.filter(asset => asset.type !== 'folder' && getResourceType(asset.type) === 'image'), allAssets: allAssets})
  }
  catch (error) {
    console.error(error)
  }
})

router.get('/documents', isAuthenticated, async (req, res) => {
  try {
    let allAssets = await getAllAssetsFromRoot(req.user.id)
    res.render("index", { user: req.user, currFolder: 'documents', assets: allAssets.filter(asset => asset.type === 'pdf' || asset.type !== 'folder' && getResourceType(asset.type) === 'raw'), allAssets: allAssets})
  }
  catch (error) {
    console.error(error)
  }
})

router.post('/download', isAuthenticated, express.json(), async(req, res) => {
  try {
    const owns = await checkUserOwnsAsset(req.user.id, req.body.assetData)
    if (!owns) {
      return res.status(403).json({ success: false, message: "Unauthorized" })
    }
    const downloadLink = await downloadAsset(req.body.assetData.asset_id, req.body.assetData.version_id)
    res.status(200).json({ success: true, downloadLink })
  }
  catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error processing download" })
  }
})

module.exports = router;
