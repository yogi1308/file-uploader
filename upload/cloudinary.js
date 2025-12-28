const cloudinary = require('cloudinary').v2
const path = require('path')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
})

const uploadToCloudinary = async (req, res, next) => {
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
          asset_folder: req.query.folder,
          backup: true
          // TODO: FIX ACCESS
        });
        if (result.existing) {
          public_id = `${parsedName.name} (${counter})${parsedName.ext}`;
          counter++;
        } else {
          break;
        }
      }
      uploadURLS.push({name: result.display_name, dateCreated: new Date(result.created_at), url: result.secure_url, folder: result.asset_folder, size: result.bytes, asset_id: result.asset_id, public_id: result.public_id, version_id: result.version_id});
    }
    req.uploads = uploadURLS
    next()
  } catch (error) {
    next(error)
  }
}

const createFolderInCloudinary = async (currFolder, folderName) => {
  return await cloudinary.api.create_folder(`${currFolder}/${folderName}`)
}

const createNewUserFolder = async (userid) => {
  return await cloudinary.api.create_folder(`${userid}`)
}

async function deleteFromCloudinary(assetId) {
  try {
    await cloudinary.api.delete_resources_by_asset_ids(assetId)
  }
  catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
}

async function deleteFolderFromCloudinary(location) {
  try {
    const result = await cloudinary.api.delete_folder(location)
    console.log(result);
  }
  catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
}

async function renameCloudinaryFile(assetData, newName, resourceType) {
  try {
    const res = await cloudinary.api.update(assetData.public_id, {display_name: newName, resource_type: resourceType})
  }
  catch (error) {
    if (error.error && error.error.http_code === 404 && resourceType === 'image') {
      return await cloudinary.api.update(assetData.public_id, {display_name: newName, resource_type: 'raw'})
    }
    console.error("Error renaming in Cloudinary:", error);
    throw error;
  }
}

async function renameFolderInCloudinary(fromPath, toPath)  {
  try {
    const result = await cloudinary.api.rename_folder(fromPath, toPath);
    console.log('Folder renamed:', result);
    return result;
  } catch (error) {
    console.error('Error renaming folder:', error);
  }
};

async function downloadAsset(assetId, versionId) {
  try {
    const result = cloudinary.utils.download_backedup_asset(assetId, versionId);
    console.log('Folder downloaded:', result);
    return result;
  } catch (error) {
    console.error('Error renaming folder:', error);
  }
}


module.exports = { uploadToCloudinary, createFolderInCloudinary, createNewUserFolder, deleteFromCloudinary, renameCloudinaryFile, deleteFolderFromCloudinary, renameFolderInCloudinary, downloadAsset };