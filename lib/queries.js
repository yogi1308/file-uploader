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
        await prisma.folder.create({
            data : {
                path: userid,
                name: userid,
                userId: userid,
                date: new Date(),
                size: 0
            }
        })
    }
    catch (error)    {
        console.error(error);
        throw new Error('Database insert failed');
    }   
}

async function postUploadDbUpdate(userId, uploads) {
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
                    public_id: upload.public_id
                }
            })
        } catch (error)    {
            console.error('Error creating file:', error);
            throw new Error('Database insert failed');
        }
    }
    return;
}

async function createFolder(userId, folder) {
    try {
        await prisma.folder.create({
            data : {
                path: folder.path,
                name: folder.name,
                userId: userId,
                date: new Date(),
                size: 0
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

async function togglePin(itemid, itemType) {
    if (itemType === 'file') {
        const file = await prisma.files.findUnique({ where: { id: itemid }, select: { pinned: true } });
        if (file) return await prisma.files.update({ where: { id: itemid }, data: { pinned: !file.pinned } });
    }
    else {
        const folder = await prisma.folder.findUnique({ where: { id: itemid }, select: { pinned: true } });
        if (folder) return await prisma.folder.update({ where: { id: itemid }, data: { pinned: !folder.pinned } });
    }
    throw new Error(`Asset with id ${itemid} not found.`);
}

module.exports = {findUser, createUser, findUserById, postUploadDbUpdate, getUserFiles, createFolder, getUserFolders, checkFolderExists, checkUserOwnsAsset, deleteFromDB, checkUserOwnsAssetUsingPublicId, renameFromDB, toggleStar, togglePin}
