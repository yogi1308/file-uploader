const prisma = require("./prisma");

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
            prisma.folders.create({
                data : {
                    name: userid,
                    userId: userid,
                    date: new Date(),
                    size: 0,
                    location: "",
                    originalNameAndPath: userid
                }
            }),
        ])
    }
    catch (error)    {
        console.error(error);
        throw new Error('Database insert failed');
    }   
}

async function fileUpload(userId, uploads, isStarred) {
    for (const upload of uploads) {
        try {
            await prisma.files.create({
                data : {
                    url: upload.url,
                    name: upload.name.substring(0, upload.name.lastIndexOf('.')),
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
            console.log("name:", upload.folder.substring(upload.folder.lastIndexOf('/') + 1), "location:", upload.folder.substring(0, upload.folder.lastIndexOf('/')))
            await prisma.folders.updateMany({
                where : {name: upload.folder.substring(upload.folder.lastIndexOf('/') + 1), location: upload.folder.substring(0, upload.folder.lastIndexOf('/'))}, 
                data : { size: { increment: upload.size } }
            })
        } catch (error)    {
            console.error('Error creating file:', error);
            throw new Error('Database insert failed');
        }
    }
    return;
}

async function getUserAssets(userId, location) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                files: {
                    where: { location },
                    orderBy: { date: 'desc' }
                },
                folders: {
                    where: { location },
                    orderBy: { date: 'desc' }
                }
            }
        })
        return [...user?.folders, ...user?.files]
    } catch (error)    {
        console.error('Error getting files:', error);
        throw new Error('Database query failed');
    }
}

async function getAllAssets(userId, assetType) {
    try {
        if (assetType === 'both') {
            return getUserAssets(userId, userId)
        }
        else {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    [assetType]: {
                        orderBy: { name: 'desc' }
                    }
                }
            })
            return user[assetType]
        }
    } catch (error) {
        console.error(error);
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

async function createFolder(userId, folder, isStarred) {
    try {
        await prisma.folders.create({
            data : {
                location: folder.path.substring(0, folder.path.lastIndexOf('/')),
                name: folder.name,
                userId: userId,
                date: new Date(),
                size: 0,
                starred: isStarred === 'starred',
                originalNameAndPath: `${folder.path.substring(0, folder.path.lastIndexOf('/'))}/${folder.name}`
            }
        })
    }
    catch (error)    {
        console.error('Error creating file:', error);
        throw new Error('Database insert failed');
    }
}

async function toggle(toggleWhat, assetData) {
    const isFolder = toggleWhat === 'pinned' || assetData.type === 'folder';
    const model = isFolder ? prisma.folders : prisma.files;

    const asset = await model.findUnique({ where: { id: assetData.id }, select: { [toggleWhat]: true } });
    if (asset) {
        return await model.update({ where: { id: assetData.id }, data: { [toggleWhat]: !asset[toggleWhat] } });
    }
    throw new Error(`Asset with id ${assetData.id} not found.`);
}

async function checkUserOwnsAsset(userId, assetData) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { files: true, folders: true }
        });
        const allAssets = [...user.files, ...user.folders]
        return allAssets.some(asset => asset.id === assetData.id);
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function deleteFromDB(assetDbIds) {
    try {
        const files = await prisma.files.findMany({
            where: { id: { in: assetDbIds } }
        });

        for (const file of files) {
            await prisma.folders.updateMany({
                where: {
                    name: file.location.substring(file.location.lastIndexOf('/') + 1),
                    location: file.location.substring(0, file.location.lastIndexOf('/'))
                },
                data: { size: { decrement: file.size } }
            });
        }

        await prisma.files.deleteMany({
            where: { id: { in: assetDbIds } }
        });
        await prisma.folders.deleteMany({
            where: { id: { in: assetDbIds } }
        });
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function getAllAssetsInsideAFolder(folderLocation) {
    try {
        const files = await prisma.files.findMany({
            where: {
                location: {
                    contains: folderLocation
                }
            }
        });
        const folders = await prisma.folders.findMany({
            where: {
                location: {
                    contains: folderLocation
                }
            }
        });
        return [[...files], [...folders]]
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function renameFromDB(assetData, newName) {
    try {
        await prisma.files.updateMany({
            where: { id: assetData.id },
            data : {name: newName}
        });
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function renameFromDBWhenFolderRenamed(assetData, newName) {
    const oldPath = `${assetData.location}/${assetData.name}`;
    const newPath = `${assetData.location}/${newName}`;

    try {
        await prisma.$transaction([
            prisma.folders.update({
                where: { id: assetData.id },
                data: { name: newName }
            }),
            // Use raw SQL to update all matching locations in one go
            // We use strpos to ensure we only match the start of the string (prefix)
            prisma.$executeRaw`UPDATE "files" SET "location" = OVERLAY("location" PLACING ${newPath} FROM 1 FOR LENGTH(${oldPath})) WHERE "location" = ${oldPath} OR strpos("location", ${oldPath + '/'}) = 1`,
            prisma.$executeRaw`UPDATE "folder" SET "location" = OVERLAY("location" PLACING ${newPath} FROM 1 FOR LENGTH(${oldPath})) WHERE "location" = ${oldPath} OR strpos("location", ${oldPath + '/'}) = 1`
        ]);
    }
    catch (error) {
        console.error(error);
        throw new Error('Database query failed');
    }
}

async function getAllAssetsFromRoot(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            files: {
                orderBy: { name: 'desc' }
            },
            folders: {
                where: {
                    location: { not: "" }
                },
                orderBy: { name: 'desc' }
            }
        }
    })
    return [...user?.folders, ...user?.files]
}

async function getdownloadLink(assetData, shouldView) {
    const file = await prisma.files.findUnique({
        where : {id: assetData.id}
    })
    let url = file.url
    if (shouldView) {
        url = url.replace('fl_attachment', '').replace(/\/upload\/\//, '/upload/')
    } else if (!url.includes('fl_attachment')) {
        url = url.replace('/upload/', '/upload/fl_attachment/')
    }
    return url
}

async function searchAssets(userId, searchThis) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                files: {
                    where: { name: {contains: searchThis} }
                },
                folders: {
                    where: { name: {contains: searchThis} }
                }
            }
        })
        return [...user?.folders, ...user?.files]
    } catch (error)    {
        console.error('Error getting files:', error);
        throw new Error('Database query failed');
    }
}

async function generateLink(userId, duration, assetData) {
    let expires = null
    if (duration !== 'never') {
        const timeMap = {
            '1hr': 60 * 60 * 1000,
            '1day': 24 * 60 * 60 * 1000,
            '1week': 7 * 24 * 60 * 60 * 1000,
            '30days': 30 * 24 * 60 * 60 * 1000
        }
        if (timeMap[duration]) expires = new Date(Date.now() + timeMap[duration])
    }
    try {
        share = await prisma.shared.create({
        data: {
            userId: userId,
            assetId: assetData.id,
            date: new Date(),
            expires: expires,
            assetType: assetData.type,
            assetLocation: `${assetData.location}/${assetData.name}`,
            assetName: assetData.name
        },
        });
        return share
    } catch (error)    {
        console.error('Error creating share link:', error);
        throw new Error('Database insert failed');
    }
}

async function checkValididityForSharedContent(id) {
    const shared = await prisma.shared.findUnique({ where: { id: id } })
    if (!shared || (shared.expires && shared.expires < new Date())) return false
    return shared
}

async function getFolder(id) {
    const folder = await prisma.folders.findUnique({ where: { id: id } })
    return folder
}
    
module.exports = {findUser, findUserById, createUser, fileUpload, getUserAssets, checkFolderExists, createFolder, toggle, getAllAssets, checkUserOwnsAsset, deleteFromDB, getAllAssetsInsideAFolder, renameFromDB, renameFromDBWhenFolderRenamed, getAllAssetsFromRoot, getdownloadLink, searchAssets, generateLink, checkValididityForSharedContent, getFolder}
