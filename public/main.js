import { courseSchedule_key, schedules_key, semester_key, current_semester, last_semester } from "./js/config.js";

import { tutorial, startTutorial } from "./js/tutorial.js";
window.tutorial = tutorial;
window.startTutorial = startTutorial;

import { displayCourseBubbles, changeBubbleColour } from "./js/ui.js";
window.changeBubbleColour = changeBubbleColour;

window.currentColour = 0;

window.courseSchedule = {}, window.savedSchedules = [], window.courseCache = {};
window.customCourseCount = 0;

window.tutorialRunning = false;
window.tutorialStep = 0;

// After 750 ms, show "still loading" alert to user.
const loadingTimeout = setTimeout(() => {
    $("#main-page-loading-alert").show().addClass("shake");
}, 750);

// Object of courseCode: courseName
window.courseList = await (await fetch("/courses", { method: "GET" })).json();
// Array of "courseCode courseName"
window.parsedCourseNames = Object.entries(window.courseList).map(c => c[0] + " " + c[1]).concat(["Complementary Courses"]);

import "./js/schedule.js";
import "./js/savedSchedules.js";
import "./js/customCourse.js";
import "./js/export.js";

await import("./js/search.js");

String.prototype.safe = function() {
    return $("<div>").text(this).html();
}
Object.defineProperty(Object.prototype, "deepCopy", {
    value: function() {
        return JSON.parse(JSON.stringify(this));
    },
    enumerable: false
});

$("#intro-modal").on("hide.bs.modal", () => {
    localStorage.setItem("lucas/schedule/seenIntro", "true");
    localStorage.setItem("lucas/schedule/seenColour", "true");
});

async function startUp() {
    const $col = [$("<div></div>"), $("<div></div>"), $("<div></div>"), $("<div></div>"), $("<div></div>"), $("<div></div>")];

    for (let i = 8; i <= 18; i += 0.5) {
        const $time = $("<div></div>");
        const $day = $("<div></div>");

        $col[0].append($time);

        $col[1].append($day.clone().attr("id", `p-m${Math.floor(i)}${i % 1 == 0 ? "00" : "30"}`));
        $col[2].append($day.clone().attr("id", `p-t${Math.floor(i)}${i % 1 == 0 ? "00" : "30"}`));
        $col[3].append($day.clone().attr("id", `p-w${Math.floor(i)}${i % 1 == 0 ? "00" : "30"}`));
        $col[4].append($day.clone().attr("id", `p-r${Math.floor(i)}${i % 1 == 0 ? "00" : "30"}`));
        $col[5].append($day.clone().attr("id", `p-f${Math.floor(i)}${i % 1 == 0 ? "00" : "30"}`));
    }

    $("#schedule-preview").append(...$col);

    // Initiate datetimepickers
    $("#course-start-min").datetimepicker({
        format: "H[:]mm",
        stepping: 30,
        defaultDate: moment({ hour: 8 }),
        minDate: moment({ hour: 0 }),
        maxDate: moment({ hour: 18 })
    });
    $("#course-end-max").datetimepicker({
        format: "H[:]mm",
        stepping: 30,
        defaultDate: moment({ hour: 18 }),
        minDate: moment({ hour: 8 }),
        maxDate: moment({ hour: 24 })
    });

    $("#course-start-min").datetimepicker("date", moment({ hour: 8 }));
    $("#course-end-max").datetimepicker("date", moment({ hour: 18 }));

    $("#course-start-min").on("change.datetimepicker", e => {
        $("#course-end-max").datetimepicker("minDate", e.date);
    });
    $("#course-end-max").on("change.datetimepicker", e => {
        $("#course-start-min").datetimepicker("maxDate", e.date);
    });

    if (localStorage.getItem(semester_key) != current_semester) {
        // User is still on previous semester.
        // Reset the localstorage data.

        if (localStorage.getItem("lucas/schedule/seenIntro") == "true") {
            // New semester and returning user.
            alert(`Welcome to the new semester. Your old ${last_semester} schedules will be erased so you can start fresh for ${current_semester}.`);
        }

        localStorage.setItem(schedules_key, "[]");
        localStorage.setItem(courseSchedule_key, "{}");

        localStorage.setItem(semester_key, current_semester);
    }

    // Load schedule from localStorage
    try {
        window.courseSchedule = JSON.parse(localStorage.getItem(courseSchedule_key) ?? `{}`);
        window.customCourseCount = Object.values(courseSchedule).filter(c => "custom" in c).length;
        window.savedSchedules = JSON.parse(localStorage.getItem(schedules_key) ?? "[]");
    }
    catch (err) {
        console.error(err);
        window.courseSchedule = {};
        window.savedSchedules = [];
    }

    if (Object.keys(window.courseSchedule)) {
        // There are one or more courses already loaded

        const courses = await (await fetch("/course/schedule", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
                Object.fromEntries(
                    Object.entries(window.courseSchedule)
                        .filter(([_, { s }]) => s)          // Fetch only non-custom courses from database
                        .map(([code, { s }]) => [code, s])
                )
            )
        })).json();

        // Create bubbles for fetched courses
        Object.entries(courses).forEach(([code, section]) => {
            displayCourseBubbles(code, section, window.courseSchedule[code].c, "main");
        });

        // Create bubbles for custom courses
        Object.entries(window.courseSchedule).filter(([_, { custom }]) => custom).forEach(([code, { c, custom }]) => {
            displayCourseBubbles(code, custom, c, "main");
        });
    }

    // Check if first time user
    if (localStorage.getItem("lucas/schedule/seenIntro") != "true") {
        $("#intro-modal").modal("show");
    }

    // Check for "new" message
    if (localStorage.getItem("lucas/schedule/seenColour") != "true" &&
        localStorage.getItem("lucas/schedule/seenIntro") == "true") {
        $("#schedule-courses-header").popover("dispose");
        $("#schedule-courses-header").popover({
            title: "New! Customize the colours",
            content: "You can now customize the colour of each of your courses from this menu",
            boundary: "viewport",
            trigger: "manual",
            placement: "top"
        });

        $("#schedule-courses-header").popover("show");

        setTimeout(() => {
            $("#schedule-courses-header").popover("dispose");
            $("#schedule-courses-header").popover({
                title: "Tutorial",
                content: "Scroll down: Customize the colour of the course bubble here.<br><button class='btn btn-link' onclick='tutorial(5)'>Next</button>",
                html: true,
                sanitize: false,
                trigger: "manual",
                offset: "3",
                boundary: "viewport",
                placement: "top"
            });

            localStorage.setItem("lucas/schedule/seenColour", "true");
        }, 12000);
    }
}
await startUp();

// Cancel showing loading alert once complete.
clearTimeout(loadingTimeout);
$("#main-page-loading-alert").removeClass("shake").hide();