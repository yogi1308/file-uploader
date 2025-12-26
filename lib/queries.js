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
            prisma.folders.create({
                data : {
                    name: userid,
                    userId: userid,
                    date: new Date(),
                    size: 0,
                    location: ""
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
                files: { where: { location } },
                folders: { where: { location } }
            }
        })
        return [...user?.files, ...user?.folders]
    } catch (error)    {
        console.error('Error getting files:', error);
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
                location: userId,
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

module.exports = {findUser, findUserById, createUser, fileUpload, getUserAssets, checkFolderExists, createFolder}
