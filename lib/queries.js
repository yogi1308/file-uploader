const prisma = require("./prisma")

async function findUser(name, pass = "") {
    try {
        const where = { username: name };
        if (pass !== "") {
            where.password = pass;
        }
        const user = await prisma.user.findMany({
            where
        });
        return user;
    } catch (error) {
        console.error(`Error finding user with name ${name}:`, error);
        throw new Error('Database query failed');
    }
}

async function findUserById(userid) {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userid
            },
            select: {
                id: true,
                username: true
            }
        });
        return user;
    } catch (error) {
        console.error(`Error finding user with id ${userid}:`, error);
        throw new Error('Database query failed');
    }
}

async function createUser(userName, hashedPassword) {
    try {
        newUser = await prisma.user.create({
        data: {
            username: userName,
            password: hashedPassword,
        },
        });
        await newUserRootFolder(newUser.id)
        return newUser
    } catch (error)    {
        console.error('Error creating user:', error);
        throw new Error('Database insert failed');
    }
}

async function newUserRootFolder(userid) {
    try {
        await Promise.all([
            prisma.folder.create({
                data : {
                    path: userid,
                    name: userid,
                    userId: userid,
                    date: new Date(),
                    size: 0
                }
            }),
        ])
    }
    catch (error)    {
        console.error(error);
        throw new Error('Database insert failed');
    }   
}

async function postUploadDbUpdate(userId, uploads, isStarred) {
    for (const upload of uploads) {
        try {
            await prisma.files.create({
                data : {
                    url: upload.url,
                    name: upload.name,
                    date: upload.dateCreated,
                    type: upload.name.slice(upload.name.lastIndexOf('.') + 1),
                    userId: userId,
                    size: upload.size,
                    location: upload.folder,
                    asset_id: upload.asset_id,
                    public_id: upload.public_id,
                    starred: isStarred === 'starred'
                }
            })
        } catch (error)    {
            console.error('Error creating file:', error);
            throw new Error('Database insert failed');
        }
    }
    return;
}

async function createFolder(userId, folder, isStarred) {
    try {
        await prisma.folder.create({
            data : {
                path: folder.path,
                name: folder.name,
                userId: userId,
                date: new Date(),
                size: 0,
                starred: isStarred === 'starred'
            }
        })
    }
    catch (error)    {
        console.error('Error creating file:', error);
        throw new Error('Database insert failed');
    }
}

async function getUserFiles(folder) {
    try {
        const files = await prisma.files.findMany({
            where: { location: folder }
        });
        return files
    } catch (error) {
        console.error('Error getting user files:', error);
        throw new Error('Database query failed');
    }
}

async function getUserFolders(userFolders) {
    try {
        const folders = await Promise.all(userFolders.folders.map(async (folder) => {
            const folderFromDB = await prisma.folder.findFirst({
                where: { path: folder.path },
            });
            return folderFromDB
        }))
        return folders.filter(folder => folder !== null)
    } catch (error) {
        console.error('Error getting user folders:', error);
        throw new Error('Database query failed');
    }
}

const checkFolderExists = async (userId, folderName) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { folders: true }
        });
        return user.folders.some(folder => folder.name === folderName);
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function checkUserOwnsAsset(assetId, userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { files: true }
        });
        return user.files.some(file => file.asset_id === assetId);
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function checkUserOwnsAssetUsingPublicId(publicId, userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { files: true }
        });
        return user.files.some(file => file.public_id === publicId);
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function checkUserOwnsAssetUsingPublicId(publicId, userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { files: true }
        });
        return user.files.some(file => file.id === publicId);
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function deleteFromDB(assetid) {
    try {
        await prisma.files.deleteMany({
            where: { asset_id: assetid }
        });
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function renameFromDB(publicId, newName) {
    try {
        await prisma.files.updateMany({
            where: { public_id: publicId },
            data : {name: newName}
        });
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function toggleStar(itemid, itemType) {
    if (itemType === 'file') {
        const file = await prisma.files.findUnique({ where: { id: itemid }, select: { starred: true } });
        if (file) return await prisma.files.update({ where: { id: itemid }, data: { starred: !file.starred } });
    }
    else {
        const folder = await prisma.folder.findUnique({ where: { id: itemid }, select: { starred: true } });
        if (folder) return await prisma.folder.update({ where: { id: itemid }, data: { starred: !folder.starred } });
    }
    throw new Error(`Asset with id ${itemid} not found.`);
}

async function togglePin(itemid) {
    const folder = await prisma.folder.findUnique({ where: { id: itemid }, select: { pinned: true } });
    if (folder) return await prisma.folder.update({ where: { id: itemid }, data: { pinned: !folder.pinned } });
    throw new Error(`Asset with id ${itemid} not found.`);
}

async function getPinned(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { folders: true }
        });
        return user.folders.filter(file => file.pinned === true);
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function getStarred(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { files: true, folders: true }
        });
        const starredFolders = user.folders.filter(file => file.starred === true);
        const starredFiles = user.files.filter(file => file.starred === true);
        return [starredFiles, starredFolders]

    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function getRecent(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                files: { orderBy: { date: 'desc' } }, 
                folders: { orderBy: { date: 'desc' } } 
            }
        });
        return [...user.files, ...user.folders].sort((a, b) => b.date - a.date)

    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function getVideos(userId) {
    const videoFormats = [
            'mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv',
            'm3u8', 'mpd', 'ts', 'm2ts', 'mts', '3gp', '3g2',
            'ogv', 'mpeg', 'mxf', 'mp3', 'wav', 'flac', 'aac'
        ];
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                files: true
            }
        });
        return user.files.filter(file => videoFormats.includes(file.type))

    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function getPhotos(userId) {
    const imageFormats = [
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp',
        'avif', 'heif', 'heic', 'jxl', 'pdf', 'ai', 'psd', 'eps',
        'fbx', 'obj', 'glb', 'gltf', 'usdz', '3ds', 'ply',
        'arw', 'cr2', 'cr3', 'dng', 'ico', 'tga', 'djvu', 'flif',
        'jp2', 'jxr', 'wdp', 'hdp'
    ];
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                files: true
            }
        });
        return user.files.filter(file => imageFormats.includes(file.type))

    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function getDocuments(userId) {
    const documentsFormats = [
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt', 
        'rtf', 'odt', 'ods', 'odp', 'csv', 'md', 'html', 'htm', 
        'xml', 'json', 'epub', 'mobi', 'pages', 'numbers', 'key'
    ];
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                files: true
            }
        });
        return user.files.filter(file => documentsFormats.includes(file.type))

    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

module.exports = {findUser, createUser, findUserById, postUploadDbUpdate, getUserFiles, createFolder, getUserFolders, checkFolderExists, checkUserOwnsAsset, deleteFromDB, checkUserOwnsAssetUsingPublicId, renameFromDB, toggleStar, togglePin, getPinned, getStarred, getRecent, getVideos, getPhotos, getDocuments }
