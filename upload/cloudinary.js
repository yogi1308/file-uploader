const cloudinary = require('cloudinary').v2
const path = require('path')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env. CLOUDINARY_SECRET_KEY
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
        // TODO: FIX ACCESS
      });
      if (result.existing) {
        public_id = `${parsedName.name} (${counter})${parsedName.ext}`;
        counter++;
      } else {
        break;
      }
    }
    uploadURLS.push({name: result.public_id, dateCreated: new Date(result.created_at), url: result.secure_url, folder: result.asset_folder, size: result.bytes});
  }
  req.uploads = uploadURLS
  next()
  } catch (error) {
    next(error)
  }
}

const createCloudinaryFolder = async (req, res, next) => {
  try {
    const result = await cloudinary.api.create_folder(req.body.folderName);
    req.folder = result;
    next();
  }
  catch (error) {
    next(error)
  }
}

const createFolderInCloudinary = async (userid, folderName, folderPath = "") => {
  return folderPath !== "" ? await cloudinary.api.create_folder(`${userid}/${folderName}`) : await cloudinary.api.create_folder(`${userid}/${folderName}`);
}

const createNewUserFolder = async (userid) => {
  return await cloudinary.api.create_folder(`${userid}`)
}

module.exports = { uploadToCloudinary, createCloudinaryFolder, createFolderInCloudinary, createNewUserFolder };