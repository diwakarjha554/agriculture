import dotenv from 'dotenv';
dotenv.config();

// Port
export const PORT = process.env.PORT || 5000;

// Node Environment
export const NODE_ENV = process.env.NODE_ENV;

// Database
export const DB_HOST = process.env.DB_HOST;
export const DB_USER = process.env.DB_USER;
export const DB_PASS = process.env.DB_PASS;
export const DB_NAME = process.env.DB_NAME;
export const DB_PORT = process.env.DB_PORT;

// Authnetication
export const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;