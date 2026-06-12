import { body, validationResult } from 'express-validator';
import { findUserByEmail, verifyPassword } from '../../models/forms/login.js';
import { Router } from 'express';

const router = Router();

/**
 * Validation rules for login form 
 */
const loginValidation = [    
    body('email')        
        .trim()        
        .isEmail()        
        .withMessage('Please provide a valid email address')        
        .normalizeEmail()
        .isLength({ max: 255 })
        .withMessage('Email address is too long'),    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
];

const showLoginForm = (req, res) => {    
    res.render('forms/login/form', { title: 'User Login' });
};

const processLogin = async (req, res) => {    
    const errors = validationResult(req);    
    if (!errors.isEmpty()) {        
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return res.redirect('/login');    
    }    
    
    const { email, password } = req.body;

    try {        
        const user = await findUserByEmail(email);

        // Security check: Use uniform feedback to stop account enumeration
        if (!user) {
            console.log(`Login failure: User not found [${email}]`);
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const isPasswordValid = await verifyPassword(password, user.password);

        if (!isPasswordValid) {
            console.log(`Login failure: Invalid password [${email}]`);
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        // Wipe sensitive credentials from state profile context objects
        delete user.password;        
        req.session.user = user;

        // Custom personalized dashboard greeting using user's name
        req.flash('success', `Welcome back, ${user.name}!`);
        res.redirect('/dashboard');
    } catch (error) {        
        console.error('System error encountered during processLogin:', error);
        req.flash('error', 'Login unavailable. Please attempt again shortly.');
        res.redirect('/login');
    }
};

const processLogout = (req, res) => {    
    if (!req.session) {        
        return res.redirect('/');    
    }    
    req.session.destroy((err) => {        
        if (err) {            
            console.error('Error destroying session:', err);            
            res.clearCookie('connect.sid');            
            return res.redirect('/');        
        }        
        res.clearCookie('connect.sid');        
        res.redirect('/');    
    });
};

const showDashboard = (req, res) => {    
    const user = req.session.user;    
    const sessionData = req.session;    
    
    if (user && user.password) {        
        console.error('Security error: password found in user object');        
        delete user.password;    
    }    
    if (sessionData.user && sessionData.user.password) {        
        console.error('Security error: password found in sessionData.user');        
        delete sessionData.user.password;    
    }    
    
    res.render('dashboard', { 
        title: 'Dashboard', 
        user: user, 
        sessionData: sessionData 
    });
};

router.get('/', showLoginForm);
router.post('/', loginValidation, processLogin);

export default router;
export { processLogout, showDashboard };