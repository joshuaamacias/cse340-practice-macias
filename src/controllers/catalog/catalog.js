// Update these imports:
import { getAllCourses, getCourseBySlug } from '../../models/catalog/courses.js';
import { getSectionsByCourseSlug } from '../../models/catalog/catalog.js';

// Route handler for the course catalog list page
const catalogPage = async (req, res) => {
    // Model functions are async, so we must await them
    const courses = await getAllCourses();

    res.render('catalog/list', {
        title: 'Course Catalog',
        courses: courses
    });
};

// Route handler for individual course detail pages
const courseDetailPage = async (req, res, next) => {
    try {
        const courseSlug = req.params.slugId;

        // 1. Fetch the course details from the Catalog Model
        const course = await getCourseBySlug(courseSlug);

        // Check if the course object is empty or doesn't exist
        if (!course || Object.keys(course).length === 0) {
            const err = new Error(`Course ${courseSlug} not found`);
            err.status = 404;
            return next(err);
        }

        // 2. Fetch sections from the Catalog Model
        // Pass the sortBy parameter directly to the model - PostgreSQL handles the sorting
        const sortBy = req.query.sort || 'time';
        
        let sections = [];
        try {
            sections = await getSectionsByCourseSlug(courseSlug, sortBy);
        } catch (sectionError) {
            console.error("Warning: Could not fetch sections:", sectionError.message);
            // Fallback to empty array so the page doesn't crash
            sections = []; 
        }

        // 3. Render the course detail view (even if sections array is empty)
        res.render('catalog/detail', {
            title: `${course.course_code || course.courseCode || ''} - ${course.name}`,
            course: course,
            sections: sections || [],
            currentSort: sortBy
        });

    } catch (error) {
        // Pass unexpected server/database bugs to your global Express error handler
        next(error);
    }
};

export { catalogPage, courseDetailPage };