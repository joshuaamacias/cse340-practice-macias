// 1. Import the data functions from our Faculty Model
import { getFacultyBySlug, getSortedFaculty } from '../../models/faculty/faculty.js';

// 2. Route handler for the main faculty list page (/faculty)
const facultyListPage = async (req, res) => {
    // We'll set up sorting using a query parameter. If none is provided, default to 'name'
    const sortBy = req.query.sort || 'department'; // You can change this default to 'name' if you prefer
    
    // Get the array of faculty from the Model
    const facultyMembers = await getSortedFaculty(sortBy);

    // Send that data to the View
    res.render('faculty/list', {
        title: 'Faculty Directory',
        faculty: facultyMembers,
        currentSort: sortBy // We'll pass this so the view knows which sort is active
    });
};

// 3. Route handler for individual faculty profiles (/faculty/:facultyId)
const facultyDetailPage =  async (req, res, next) => {
    // Grab the ID from the URL (e.g., 'brother-jack')
    const facultySlug = req.params.facultySlug;
    
    // Ask the Model to find this specific faculty member
    const facultyMember = await getFacultyBySlug(facultySlug);
    console.log(facultyMember); // Debugging line to check what we got back from the Model


    // 4. Proper error handling for invalid IDs
    if (!Object.keys(facultyMember).length === 0) {
        // If the Model returns null, trigger a 404 error (which will show your nice 404.ejs page!)
        const error = new Error('Faculty member not found');
        error.status = 404;
        return next(error);
    }

    // If they exist, send their data to the Detail View
    res.render('faculty/detail', {
        title: `${facultyMember.name} - Profile`,
        faculty: facultyMember
    });
};

// 5. Export both functions so our router can use them
export { facultyListPage, facultyDetailPage };