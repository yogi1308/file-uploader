const cloudinary = require('cloudinary').v2
const path = require('path')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
})

const uploadToCloudinary = async (req, res, next) => {
  let assetFolder = ""
  req.query.folder !== undefined ? assetFolder = `${req.user.id}/${req.query.folder}` : `${req.user.id}`
  try {
  const uploads = req.files
  let uploadURLS = []
  for (const file of uploads) {
    const b64 = Buffer.from(file.buffer).toString("base64");
    let dataURI = "data:" + file.mimetype + ";base64," + b64;

    const parsedName = path.parse(file.originalname);
    let public_id = parsedName.base;
    let counter = 1;
    let result;

    while (true) {
      result = await cloudinary.uploader.upload(dataURI, {
        resource_type: "auto",
        public_id: public_id,
        overwrite: false,
        folder: req.user.id,
        asset_folder: assetFolder
        // TODO: FIX ACCESS
      });
      if (result.existing) {
        public_id = `${parsedName.name} (${counter})${parsedName.ext}`;
        counter++;
      } else {
        break;
      }
    }
    uploadURLS.push({name: result.display_name, dateCreated: new Date(result.created_at), url: result.secure_url, folder: result.asset_folder, size: result.bytes, asset_id: result.asset_id, public_id: result.public_id});
  }
  req.uploads = uploadURLS
  next()
  } catch (error) {
    next(error)
  }
}

const createFolderInCloudinary = async (userid, folderName, folderPath = "") => {
  return folderPath === "" ? await cloudinary.api.create_folder(`${userid}/${folderName}`) : await cloudinary.api.create_folder(`${userid}/${folderPath}/${folderName}`);
}

const createNewUserFolder = async (userid) => {
  return await cloudinary.api.create_folder(`${userid}`)
}

const getFolders = async (userid, path) => {
  return await cloudinary.api.sub_folders(`${userid}`)
}

async function deleteFromCloudinary(assetId) {
  console.log(assetId)
  try {
    await cloudinary.api.delete_resources_by_asset_ids([assetId])
  }
  catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
}

async function renameCloudinaryFile(newFile) {

}

module.exports = { uploadToCloudinary, createFolderInCloudinary, createNewUserFolder, getFolders, deleteFromCloudinary };