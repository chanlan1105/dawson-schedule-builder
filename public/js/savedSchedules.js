import { courseSchedule_key, schedules_key } from "./config.js";
import { clearSchedule } from "./schedule.js";
import { displayCourseBubbles } from "./ui.js";

/**
 * Clears course bubbles from the "load schedule" modal.
 */
function clearLoadBubbles() {
    $("#load-schedule-main .course-bubble").parent().css("grid-row", "");
    $("#load-schedule-main .course-bubble").remove();
    $("#load-schedule-main .blocked").removeClass();
}

/**
 * Saves the current schedule for later reference
 * @returns {void}
 */
async function saveSchedule() {
    const name = await prompt("What would you like to name this schedule?", "Schedule #1");
    if (!name) return;

    // Check for duplicate saved schedule name
    if (window.savedSchedules.filter(s => s.n == name).length &&
        await confirm(`You already have a schedule called ${name}. Would you like to overwrite it?`)) {
        window.savedSchedules = window.savedSchedules.filter(s => s.n != name);
    }
    else if (window.savedSchedules.filter(s => s.n == name).length) return;

    window.savedSchedules.push({
        n: name,
        s: window.courseSchedule
    });

    // Save to localStorage
    localStorage.setItem(schedules_key, JSON.stringify(window.savedSchedules));

    // Check if user wants to clear schedule to start from scratch
    await confirm("--save--") && clearSchedule(true);   
}

/**
 * Fetches course details from saved schedules and saves them into local cache.
 */
async function fetchScheduleCourses() {
    const coursesToFetch = {};

    window.savedSchedules.forEach(({s: schedule}) => {
        Object.entries(schedule).forEach(([courseCode, {s: section}]) => {
            // Check if this is a custom course.
            if (!section) return;

            // Check if the section already exists in cache.
            if (courseCode in window.courseCache && window.courseCache[courseCode].find(s => +s.ID == section)) {
                // Found the course section in cache, skip over.
                return;
            }

            // Add this course section to the coursesToFetch.
            if (courseCode in coursesToFetch) {
                coursesToFetch[courseCode].push(section);
            }
            else {
                coursesToFetch[courseCode] = [section];
            }
        });
    });

    // Fetch course details from server.
    const courses = await (await fetch("/course/schedule", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(coursesToFetch)
    })).json();

    // Save fetched courses into cache.
    Object.entries(courses).forEach(([courseCode, sections]) => {
        if (!(courseCode in window.courseCache)) {
            window.courseCache[courseCode] = [];
        }

        window.courseCache[courseCode].push(...sections);
    });
}

/**
 * Opens the "load schedule" modal.
 * @returns {void}
 */
function loadScheduleModal() {
    if (window.savedSchedules.length == 0) return alert("You have no saved schedules.");

    clearLoadBubbles();

    // Add options to schedule select
    $("#load-schedule-select").html("<option selected disabled>Select</option>");
    window.savedSchedules.forEach(s => {
        const $option = $("<option></option>").text(s.n).val(s.n);
        $("#load-schedule-select").append($option);
    });

    // Fetch courses from saved schedules from server.
    fetchScheduleCourses();

    // Don't allow schedules to be deleted or loaded until one is actually selected
    $("#delete-saved-schedule-btn, #load-saved-schedule-btn").prop("disabled", true);

    $("#load-schedule-modal").modal("show");
}

/**
 * Deletes the actively selected saved schedule.
 * @returns {void | false}
 */
async function deleteSavedSchedule() {
    // Make sure a schedule is actually selected.
    if (!$("#load-schedule-select").val()) return false;

    if (!await confirm("Are you sure you want to delete this saved schedule?")) return false;
    
    window.savedSchedules = window.savedSchedules.filter(s => s.n != $("#load-schedule-select").val());
    localStorage.setItem(schedules_key, JSON.stringify(window.savedSchedules));

    clearLoadBubbles();

    // Add options to schedule select
    $("#load-schedule-select").html("<option selected disabled>Select</option>");
    window.savedSchedules.forEach(s => {
        const $option = $("<option></option>").text(s.n).val(s.n);
        $("#load-schedule-select").append($option);
    });
}

/**
 * Loads a saved schedule.
 */
export function loadSchedule() {
    // Make sure a schedule is actually selected.
    if (!$("#load-schedule-select").val()) return false;    

    const schedule = window.savedSchedules.filter(s => s.n == $("#load-schedule-select").val())[0].s;

    clearSchedule(true);

    for (let i in schedule) {
        const course = schedule[i].custom ?? {code: i, ...window.courseCache[i].filter(s => s.ID == schedule[i].s)[0]};
        displayCourseBubbles(i, course, schedule[i].c, "main");
    }

    window.customCourseCount = Object.values(schedule).filter(c => "custom" in c).length;

    // Write to localStorage
    window.courseSchedule = {...schedule};
    localStorage.setItem(courseSchedule_key, JSON.stringify(window.courseSchedule));

    $("#load-schedule-modal").modal("hide");
    clearLoadBubbles();
}

$("#load-schedule-select").on("change", function() {
    clearLoadBubbles();

    const schedule = window.savedSchedules.filter(s => s.n == $(this).val())[0].s;
    
    for (let i in schedule) {
        const course = schedule[i].custom ?? {code: i, ...window.courseCache[i].filter(s => s.ID == schedule[i].s)[0]};
        displayCourseBubbles(i, course, schedule[i].c, "load");
    }

    $("#delete-saved-schedule-btn, #load-saved-schedule-btn").prop("disabled", false);
});
$("#load-schedule-btn").on("click", () => loadScheduleModal());
$("#save-schedule-btn").on("click", () => saveSchedule());
$("#delete-saved-schedule-btn").on("click", () => deleteSavedSchedule());
$("#load-saved-schedule-btn").on("click", () => loadSchedule());