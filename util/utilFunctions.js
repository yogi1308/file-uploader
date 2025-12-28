const { imageFormats, videoFormats } = require("./utilArrays")

function getResourceType(type) {
    const ext = type.toLowerCase().trim();
    if (imageFormats.includes(ext)) return 'image';
    if (videoFormats.includes(ext)) return 'video';
    return 'raw';
}

module.exports = {getResourceType}