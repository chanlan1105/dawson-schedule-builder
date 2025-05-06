import { courseSchedule_key, schedules_key } from "./config.js";
import { displayCourseBubbles } from "./ui.js";
import { courses } from "../Data/w2025.js";

/**
 * Adds a course to the schedule.
 * @param {string} courseCode The course code.
 * @param {Course} course The course to add.
 * @returns {void}
 */
export function addCourse(courseCode, course) {
    if (courseCode in window.courseSchedule) return alert("You already have that course in your schedule.");

    const res = displayCourseBubbles(courseCode, {
        code: courseCode,
        ...course
    }, null, "main");

    if (!res) return;

    const intensive = course.intensive ?? false;

    // Add course to schedule and localStorage
    window.courseSchedule[courseCode] = {
        s: Number(course.ID),
        i: intensive,
        c: intensive ? undefined : res
    };
    localStorage.setItem(courseSchedule_key, JSON.stringify(window.courseSchedule));

    // Allow user to select another course
    $("#course-options").html("");
    $(".course-search-options button.active").removeClass("active");
    $("#course-search-accordion .collapse.show").collapse("hide");
    $("#course-complementary-warning").hide();
    $("#course").val("").focus();
}

/**
 * Removes a course from the schedule.
 * @param {string} courseCode The course code to remove.
 * @returns {void}
 */
export function removeCourse(courseCode) {
    if (!(courseCode in window.courseSchedule)) return alert("You do not have this course in your schedule.");

    confirm(`Are you sure you want to remove course ${courseCode} from your schedule?`).then(res => {
        if (res) {
            // Remove bubbles from schedule
            $(`.course-bubble.${courseCode}`).parent().css("grid-row", "");
            $(`.course-bubble.${courseCode}, .course-section.${courseCode}, .intensive-section.${courseCode}`).remove();
            $(`.blocked.${courseCode}`).removeClass();

            // Remove course from courseSchedule
            delete window.courseSchedule[courseCode];
            localStorage.setItem(courseSchedule_key, JSON.stringify(window.courseSchedule));
        }
    });
}

/**
 * Clears the schedule.
 * @param {boolean} force Set to `true` to forcefully clear the schedule without waiting for user confirmation.
 */
export function clearSchedule(force=false) {
    function doIt() {
        // Remove all bubbles from schedule
        $(`.course-bubble`).parent().css("grid-row", "");
        $(`.course-bubble`).remove();
        $(`.blocked`).removeClass();

        // Remove intensives
        $("#schedule-intensives").html("");

        // Clear course list 
        $("#schedule-courses").html("");

        // Remove all courses from courseSchedule
        window.courseSchedule = {};
        customCourseCount = 0;
        localStorage.setItem(courseSchedule_key, JSON.stringify(window.courseSchedule));
    }

    if (!force) {
        confirm("Are you sure you want to remove all courses from your schedule and start again from scratch?").then(res => {
            res && doIt();
        });
    }
    else doIt();
}

$("#clear-schedule-btn").on("click", () => clearSchedule());