import { body, validationResult } from 'express-validator';
import { findUserByEmail, verifyPassword } from '../../models/forms/login.js';
import { Router } from 'express';

const router = Router();

/** * Validation rules for login form 
 */
const loginValidation = [    
    body('email')        
        .trim()        
        .isEmail()        
        .withMessage('Please provide a valid email address')        
        .normalizeEmail(),    
    body('password')        
        .isLength({ min: 8 })        
        .withMessage('Password is required')
];

/** * Display the login form. 
 */
const showLoginForm = (req, res) => {    
    // Render the login form view (forms/login/form)    
    // Pass title: 'User Login'
    res.render('forms/login/form', { title: 'User Login' });
};

/** * Process login form submission. 
 */
const processLogin = async (req, res) => {    
    // Check for validation errors    
    const errors = validationResult(req);    
    if (!errors.isEmpty()) {        
        // Log validation errors to console        
        console.error('Login validation errors:', errors.array());
        // Redirect back to /login        
        return res.redirect('/login');    
    }    
    
    // Extract email and password from req.body    
    const { email, password } = req.body;

    try {        
        // Find user by email using findUserByEmail()        
        const user = await findUserByEmail(email);

        // If not found, log "User not found" and redirect to /login        
        if (!user) {
            console.log(`Login failure: User not found for email [${email}]`);
            return res.redirect('/login');
        }

        // Verify password using verifyPassword(password, user.password)        
        const isPasswordValid = await verifyPassword(password, user.password);

        // If password incorrect, log "Invalid password" and redirect to /login        
        if (!isPasswordValid) {
            console.log(`Login failure: Invalid password provided for user [${email}]`);
            return res.redirect('/login');
        }

        // SECURITY: Remove password from user object before storing in session        
        delete user.password;        
        
        // Store user in session: req.session.user = user        
        req.session.user = user;

        // Redirect to /dashboard    
        res.redirect('/dashboard');
    } catch (error) {        
        // Model functions do not catch errors, so handle them here        
        // Log error to console        
        console.error('System error encountered during processLogin:', error);
        // Redirect to /login    
        res.redirect('/login');
    }
};

/** * Handle user logout. 
 * * NOTE: connect.sid is the default session cookie name since we did not 
 * specify a custom name when creating the session in server.js. 
 */
const processLogout = (req, res) => {    
    // First, check if there is a session object on the request    
    if (!req.session) {        
        // If no session exists, there's nothing to destroy,        
        // so we just redirect the user back to the home page        
        return res.redirect('/');    
    }    
    
    // Call destroy() to remove this session from the store (PostgreSQL in our case)    
    req.session.destroy((err) => {        
        if (err) {            
            // If something goes wrong while removing the session from the database:            
            console.error('Error destroying session:', err);            
            /** * Clear the session cookie from the browser anyway, so the client             
             * does not keep sending an invalid session ID.             
             */            
            res.clearCookie('connect.sid');            
            /** * Normally we would respond with a 500 error since logout did not fully succeed.             
             * Example: return res.status(500).send('Error logging out');             
             * * Since this is a practice site, we will redirect to the home page anyway.             
             */            
            return res.redirect('/');        
        }        
        // If session destruction succeeded, clear the session cookie from the browser        
        res.clearCookie('connect.sid');        
        // Redirect the user to the home page        
        res.redirect('/');    
    });
};

/** * Display protected dashboard (requires login). 
 */
const showDashboard = (req, res) => {    
    const user = req.session.user;    
    const sessionData = req.session;    
    
    // Security check! Ensure user and sessionData do not contain password field    
    if (user && user.password) {        
        console.error('Security error: password found in user object');        
        delete user.password;    
    }    
    if (sessionData.user && sessionData.user.password) {        
        console.error('Security error: password found in sessionData.user');        
        delete sessionData.user.password;    
    }    
    
    // Render the dashboard view (dashboard)    
    // Pass title: 'Dashboard', user, and sessionData to template
    res.render('dashboard', { 
        title: 'Dashboard', 
        user: user, 
        sessionData: sessionData 
    });
};

// Routes
router.get('/', showLoginForm);
router.post('/', loginValidation, processLogin);

// Export router as default, and specific functions for root-level routes
export default router;
export { processLogout, showDashboard };