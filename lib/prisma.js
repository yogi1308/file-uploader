require("dotenv/config");
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client'); // Changed from custom path
const pg = require('pg'); // Ensure pg is required if using Pool, though adapter-pg usually handles connection string directly

const connectionString = `${process.env.DATABASE_URL}`;

// PrismaPg with connection string
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

module.exports = prisma;