import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { 
    emailExists, 
    saveUser, 
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
} from '../../models/forms/registration.js';
import { requireLogin } from '../../middleware/auth.js';

const router = Router();

/**
 * Validation rules for user registration
 */
const registrationValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail()
        .isLength({ max: 255 })
        .withMessage('Email address is too long'),
    body('emailConfirm')
        .trim()
        .custom((value, { req }) => value === req.body.email)
        .withMessage('Email addresses must match'),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
        .withMessage('Password must contain at least one special character'),
    body('passwordConfirm')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords must match')
];

/** * Validation rules for editing user accounts 
 */
const editValidation = [    
    body('name')        
        .trim()        
        .isLength({ min: 2, max: 100 })        
        .withMessage('Name must be between 2 and 100 characters')        
        .matches(/^[a-zA-Z\s'-]+$/)        
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),    
    body('email')        
        .trim()        
        .isEmail()        
        .normalizeEmail()        
        .withMessage('Must be a valid email address')        
        .isLength({ max: 255 })        
        .withMessage('Email address is too long')
];

const showRegistrationForm = (req, res) => {
    res.render('forms/registration/form', { title: 'User Registration' });
};

const processRegistration = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return res.redirect('/register');
    }

    const { name, email, password } = req.body;

    try {
        const isEmailRegistered = await emailExists(email);

        if (isEmailRegistered) {
            req.flash('warning', 'An account with that email address already exists.');
            return res.redirect('/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await saveUser(name, email, hashedPassword);

        req.flash('success', 'Registration successful! You can now log in below.');
        res.redirect('/login');
    } catch (error) {
        console.error('Error during registration process:', error);
        req.flash('error', 'Something went wrong during registration. Please try again.');
        res.redirect('/register');
    }
};

/** * Display all registered users 
 * Requirement 9: Passed req.session.user to view context as separate property
 */
const showAllUsers = async (req, res) => {
    let users = [];
    try {
        users = await getAllUsers();
    } catch (error) {
        console.error('Error retrieving users list:', error);
    }
    res.render('forms/registration/list', { 
        title: 'Registered Users', 
        users: users,
        user: req.session && req.session.user ? req.session.user : null
    });
};

/** * Display the edit account form 
 * Users can edit their own account, admins can edit any account 
 */
const showEditAccountForm = async (req, res) => {    
    const targetUserId = parseInt(req.params.id);    
    const currentUser = req.session.user;    
    const targetUser = await getUserById(targetUserId);    
    
    if (!targetUser) {        
        req.flash('error', 'User not found.');        
        return res.redirect('/register/list');    
    }    
    
    // Check permissions: users can edit themselves, admins can edit anyone    
    const canEdit = currentUser.id === targetUserId || currentUser.roleName === 'admin';    
    if (!canEdit) {        
        req.flash('error', 'You do not have permission to edit this account.');        
        return res.redirect('/register/list');    
    }    
    
    res.render('forms/registration/edit', {        
        title: 'Edit Account',        
        user: targetUser    
    });
};

/** * Process account edit form submission 
 */
const processEditAccount = async (req, res) => {    
    const errors = validationResult(req);    
    if (!errors.isEmpty()) {        
        errors.array().forEach(error => {            
            req.flash('error', error.msg);        
        });        
        return res.redirect(`/register/${req.params.id}/edit`);    
    }    
    
    const targetUserId = parseInt(req.params.id);    
    const currentUser = req.session.user;    
    const { name, email } = req.body;    
    
    try {        
        const targetUser = await getUserById(targetUserId);        
        if (!targetUser) {            
            req.flash('error', 'User not found.');            
            return res.redirect('/register/list');        
        }        
        
        // Check permissions        
        const canEdit = currentUser.id === targetUserId || currentUser.roleName === 'admin';        
        if (!canEdit) {            
            req.flash('error', 'You do not have permission to edit this account.');            
            return res.redirect('/register/list');        
        }        
        
        // Check if new email already exists (and belongs to different user)        
        const emailTaken = await emailExists(email);        
        if (emailTaken && targetUser.email !== email) {            
            req.flash('error', 'An account with this email already exists.');            
            return res.redirect(`/register/${targetUserId}/edit`);        
        }        
        
        // Update the user        
        await updateUser(targetUserId, name, email);        
        
        // If user edited their own account, update session context dynamically
        if (currentUser.id === targetUserId) {            
            req.session.user.name = name;            
            req.session.user.email = email;        
        }        
        
        req.flash('success', 'Account updated successfully.');        
        res.redirect('/register/list');    
    } catch (error) {        
        console.error('Error updating account:', error);        
        req.flash('error', 'An error occurred while updating the account.');        
        res.redirect(`/register/${targetUserId}/edit`);    
    }
};

/** * Process account deletion 
 * Only admins can delete accounts, and they cannot delete themselves 
 */
const processDeleteAccount = async (req, res) => {    
    const targetUserId = parseInt(req.params.id);    
    const currentUser = req.session.user;    
    
    // Only admins can delete accounts    
    if (currentUser.roleName !== 'admin') {        
        req.flash('error', 'You do not have permission to delete accounts.');        
        return res.redirect('/register/list');    
    }    
    
    // Prevent admins from deleting their own account    
    if (currentUser.id === targetUserId) {        
        req.flash('error', 'You cannot delete your own account.');        
        return res.redirect('/register/list');    
    }    
    
    try {        
        const deleted = await deleteUser(targetUserId);        
        if (deleted) {            
            req.flash('success', 'User account deleted successfully.');        
        } else {            
            req.flash('error', 'User not found or already deleted.');        
        }    
    } catch (error) {        
        console.error('Error deleting user:', error);        
        req.flash('error', 'An error occurred while deleting the account.');    
    }    
    
    res.redirect('/register/list');
};

// Routes Definitions
router.get('/', showRegistrationForm);
router.post('/', registrationValidation, processRegistration);
router.get('/list', showAllUsers);

/** * GET /register/:id/edit - Display edit account form */
router.get('/:id/edit', requireLogin, showEditAccountForm);

/** * POST /register/:id/edit - Process account edit */
router.post('/:id/edit', requireLogin, editValidation, processEditAccount);

/** * POST /register/:id/delete - Delete user account */
router.post('/:id/delete', requireLogin, processDeleteAccount);

export default router;