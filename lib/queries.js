const { update } = require("rc9");
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
        return newUser
    } catch (error)    {
        console.error('Error creating user:', error);
        throw new Error('Database insert failed');
    }
}

async function postUploadDbUpdate(userId, uploads) {
    for (const upload of uploads) {
        try {
            const uploadedFile = await prisma.files.create({
                data : {
                    url: upload.url,
                    name: upload.name,
                    date: upload.dateCreated,
                    type: upload.name.slice(upload.name.lastIndexOf('.') + 1),
                    userId: userId,
                    size: upload.size
                }
            })
        } catch (error)    {
            console.error('Error creating file:', error);
            throw new Error('Database insert failed');
        }
    }
    return;
}

async function getUserFiles(userid) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userid },
            include: { files: true }
        });
        return user.files
    } catch (error) {
        console.error('Error getting user files:', error);
        throw new Error('Database query failed');
    }
}

module.exports = {findUser, createUser, findUserById, postUploadDbUpdate, getUserFiles}