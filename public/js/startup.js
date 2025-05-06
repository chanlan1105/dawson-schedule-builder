import { courses } from "../Data/w2025.js";
import { current_semester, semester_key } from "./config.js";

/**
 * Configuration; Run on startup
 */
export default function startUp() {
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

    // Add the "fake" Enriched Science course
    // courses["ENR-SCI-XX"] = {
    //     "courseName": "Enriched Science",
    //     "sections": [
    //         {
    //             "ID": "00001",
    //             "teacher": "Chris Whittaker, Carmen Leung",
    //             "schedule": [
    //                 [
    //                     "W",
    //                     "1300",
    //                     "1430"
    //                 ],
    //                 [
    //                     "F",
    //                     "1300",
    //                     "1430"
    //                 ],
    //                 [
    //                     "F",
    //                     "1430",
    //                     "1730"
    //                 ]
    //             ],
    //             "note": "Select this course to add the Enriched Science seminar and activity periods to your mock schedule."
    //         }
    //     ]
    // };

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

        alert(`Welcome to the new semester. Your old schedules ${last_semester} will be erased so you can start fresh for ${current_semester}.`);

        localStorage.setItem(schedules_key, "[]");
        localStorage.setItem(courseSchedule_key, "{}");

        localStorage.setItem(semester_key, current_semester);
    }

    // Load schedule from localStorage
    try {
        window.courseSchedule = JSON.parse(localStorage.getItem(courseSchedule_key) ?? `{}`);

        // Fix courseSchedule to new format if needed
        if (typeof Object.values(window.courseSchedule)[0] == 'number') {
            let counter = 0;
            for (let i in window.courseSchedule) {
                window.courseSchedule[i] = {
                    s: window.courseSchedule[i],
                    i: courses[i].sections.filter(s => s.ID == window.courseSchedule[i])[0].intensive,
                    c: colours[counter % colours.length]
                };
                counter ++;
            }
            localStorage.setItem(courseSchedule_key, JSON.stringify(window.courseSchedule));
        }

        window.customCourseCount = Object.values(window.courseSchedule).filter(c => "custom" in c).length;

        window.savedSchedules = JSON.parse(localStorage.getItem(schedules_key) ?? "[]");
    }
    catch (err) {
        console.error(err);
        window.courseSchedule = {};
        window.savedSchedules = [];
    }

    if (Object.keys(window.courseSchedule)) {
        // There are one or more courses already loaded
        
        for (let i in courseSchedule) {
            const course = courseSchedule[i].custom ?? {code: i, ...courses[i].sections.filter(s => s.ID == courseSchedule[i].s)[0]};
            displayCourseBubbles(i, course, courseSchedule[i].c, "main");
        }
    }

    // Initiate tutorial
    $("#course, #course-search-day, #course-options, #navbar-menu").addClass("tutorial");
    $("#course").popover({
        title: "Tutorial",
        content: "Start by typing the name of a course or its code. Then select your course from the dropdown menu. Tip: Searching for a complementary course? Type \"Complementary\".",
        trigger: "manual",
        offset: "3",
        boundary: "viewport"
    });
    $("#course-search-day").popover({
        title: "Tutorial",
        content: "Select a search option to filter through the available sections of the course.",
        trigger: "manual",
        placement: "top",
        offset: "3",
        boundary: "viewport"
    });
    $("#course-options").popover({
        title: "Tutorial",
        content: "Select a section to add the course to your schedule.",
        trigger: "manual",
        offset: "3",
        boundary: "viewport"
    });
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
    $("#navbar-menu").popover({
        title: "Tutorial",
        content: "If your browser cookies are enabled, your schedule will be saved on this device. You can clear it from this menu.<br>You can also export or print your schedule.<br><button class='btn btn-link' onclick='tutorial(6)'>Finish</button>",
        html: true,
        sanitize: false,
        trigger: "manual",
        offset: "3",
        boundary: "viewport"
    });

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