import bcrypt from 'bcrypt';
import db from '../db.js';

/**
 * Find a user by email address for login verification.
 * * @param {string} email - Email address to search for
 * @returns {Promise<Object|null>} User object with password hash or null if not found
 */
const findUserByEmail = async (email) => {
    // Write SELECT query for id, name, email, password, created_at
    // Use LOWER() on both sides for case-insensitive email comparison
    // Use $1 placeholder for email parameter
    // Add LIMIT 1 to ensure only one result
    const queryText = `
        SELECT id, name, email, password, created_at 
        FROM users 
        WHERE LOWER(email) = LOWER($1) 
        LIMIT 1
    `;

    try {
        // Execute query and return first row or null
        const result = await db.query(queryText, [email]);
        
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error('Error finding user by email:', error);
        throw error;
    }
};

/**
 * Verify a plain text password against a stored bcrypt hash.
 * * @param {string} plainPassword - The password to verify
 * @param {string} hashedPassword - The stored password hash
 * @returns {Promise<boolean>} True if password matches, false otherwise
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
    try {
        // Use bcrypt.compare() to verify the password
        const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
        
        // Return the result (true/false)
        return isMatch;
    } catch (error) {
        console.error('Error verifying password:', error);
        return false;
    }
};

export { findUserByEmail, verifyPassword };