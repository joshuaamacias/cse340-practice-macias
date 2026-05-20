// Update these imports:
import { getAllCourses, getCourseBySlug } from '../../models/catalog/courses.js';
import { getSectionsByCourseSlug } from '../../models/catalog/catalog.js';


// Route handler for the course catalog list page
const catalogPage = async (req, res) => {
    // Model functions are async, so we must await them
    const courses = await getAllCourses();



    res.render('catalog', {
        title: 'Course Catalog',
        courses: courses
    });
};

// Route handler for individual course detail pages
const courseDetailPage = async (req, res, next) => {
    const courseSlug = req.params.slugId;

    // Model functions are async, so we must await them
    const course = await getCourseBySlug(courseSlug);

     // console.log(course); // Debugging line to check what we got back from the Model

    // Our model returns empty object {} when not found, not null
    // Check if the object is empty using Object.keys()
    if (Object.keys(course).length === 0) {
        const err = new Error(`Course ${courseSlug} not found`);
        err.status = 404;
        return next(err);
    }

    // Get sections (course offerings) separately from the catalog
    // Pass the sortBy parameter directly to the model - PostgreSQL handles the sorting
    const sortBy = req.query.sort || 'time';
    const sections = await getSectionsByCourseSlug(courseSlug, sortBy);


     if (Object.keys(sections).length === 0) {
        const err = new Error(`Course ${courseSlug} not found`);
        err.status = 404;
        return next(err);
    }

    // console.log(sections); // Debugging line to check what we got back from the Model

    res.render('course-detail', {
        title: `${course.courseCode} - ${course.name}`,
        course: course,
        sections: sections,
        currentSort: sortBy
    });
};

export { catalogPage, courseDetailPage };