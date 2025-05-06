import { colours, complementaryRegex, courseSchedule_key, schedules_key, semester_key, current_semester } from "./js/config.js";

import { courses } from "./Data/w2025.js";

import { tutorial, startTutorial } from "./js/tutorial.js";
window.tutorial = tutorial;
window.startTutorial = startTutorial;

import { createCourseOptionTiles, displayCourseBubbles, changeBubbleColour } from "./js/ui.js";
window.changeBubbleColour = changeBubbleColour;

import "./js/schedule.js";
import "./js/savedSchedules.js";
import "./js/customCourse.js";
import "./js/export.js";

window.currentColour = 0;

window.courseSchedule = {}, window.savedSchedules = [];
window.customCourseCount = 0;

window.tutorialRunning = false;
window.tutorialStep = 0;

// Object of courseCode: courseName
window.courseList = await (await fetch("/courses", { method: "GET" })).json();
// Array of "courseCode courseName"
window.parsedCourseNames = Object.entries(window.courseList).map(c => c[0] + " " + c[1]).concat(["Complementary Courses", "ENR-SCI-XX Enriched Science"]);

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
    localStorage.setItem("lucas/schedule/seenExport", "true");
    localStorage.setItem("lucas/schedule/seenColour", "true");
});

function startUp() {
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
    courses["ENR-SCI-XX"] = {
        "courseName": "Enriched Science",
        "sections": [
            {
                "ID": "00001",
                "teacher": "Chris Whittaker, Carmen Leung",
                "schedule": [
                    [
                        "W",
                        "1300",
                        "1430"
                    ],
                    [
                        "F",
                        "1300",
                        "1430"
                    ],
                    [
                        "F",
                        "1430",
                        "1730"
                    ]
                ],
                "note": "Select this course to add the Enriched Science seminar and activity periods to your mock schedule."
            }
        ]
    };

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
        courseSchedule = JSON.parse(localStorage.getItem(courseSchedule_key) ?? `{}`);

        // Fix courseSchedule to new format if needed
        if (typeof Object.values(courseSchedule)[0] == 'number') {
            let counter = 0;
            for (let i in courseSchedule) {
                courseSchedule[i] = {
                    s: courseSchedule[i],
                    i: courses[i].sections.filter(s => s.ID == courseSchedule[i])[0].intensive,
                    c: colours[counter % colours.length]
                };
                counter ++;
            }
            localStorage.setItem(courseSchedule_key, JSON.stringify(courseSchedule));
        }

        customCourseCount = Object.values(courseSchedule).filter(c => "custom" in c).length;

        savedSchedules = JSON.parse(localStorage.getItem(schedules_key) ?? "[]");
    }
    catch (err) {
        console.error(err);
        courseSchedule = {};
        savedSchedules = [];
    }

    if (Object.keys(courseSchedule)) {
        // There are one or more courses already loaded
        
        for (let i in courseSchedule) {
            const course = courseSchedule[i].custom ?? {code: i, ...courses[i].sections.filter(s => s.ID == courseSchedule[i].s)[0]};
            displayCourseBubbles(i, course, courseSchedule[i].c, "main");
        }
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
startUp();

// ------------------------------------------------------



function searchSection(courseCode, section) {
    const option = courses[courseCode].sections.filter(s => s.ID == section);
    createCourseOptionTiles(courseCode, option);
}
function searchTeachers(courseCode, teachers) {
    const options = courses[courseCode].sections.filter(s => teachers.includes(s.teacher));
    createCourseOptionTiles(courseCode, options);
}
function searchDay(courseCode, days, strict, complementary = false) {
    const intensive = courses[courseCode].sections.filter(s => s.intensive);
    const options = courses[courseCode].sections.filter(s => !s.intensive).filter(s => {
        // Find class times that match specified days
        const matchedSchedule = s.schedule.filter(t => days.includes(t[0].toLowerCase()));

        if (strict && matchedSchedule.length == s.schedule.length || !strict && matchedSchedule.length) return true;
        else return false;
    });

    createCourseOptionTiles(courseCode, intensive.concat(options), complementary);

    return options.length;
}
function searchBest(courseCode, params, complementary = false) {
    // Deconstruct params
    const { before, after, startTime, endTime } = params;

    // Start by eliminating all courses that conflict, without intensives
    let fit = courses[courseCode].sections.filter(s => !s.intensive).filter(s => !checkConflict(s.schedule)).map(s => {
        // For sections with more than one scheduled class on the same day,
        // combine all the scheduled classes for this algorithm ONLY
        // into one entry per day.
        const _s = s.deepCopy();
        _s.redSched = Object.values(_s.schedule.reduce((g, t) => {
            if (g[t[0]]) {
                // If an entry with current day exists:
                g[t[0]].s.push(t[1]);
                g[t[0]].e.push(t[2]);
            }
            else {
                // Otherwise:
                g[t[0]] = { d: t[0], s: [ t[1] ], e: [ t[2] ]};
            }

            return g;
        }, {})).map(t => [t.d, Math.min(...t.s), Math.max(...t.e)]);
        return _s;
    });

    // Filter courses that start at or after allowed start time
    fit = fit.filter(s => {
        // Find times in schedule that match condition. If they all match, that section is valid
        const timesFit = s.redSched.filter(t => Number(t[1]) >= Number(startTime));

        if (timesFit.length == s.redSched.length) return true;
        else return false;
    });

    // Filter courses that end at or before allowed end time
    fit = fit.filter(s => {
        // Find times in schedule that match condition. If they all match, that section is valid
        const timesFit = s.redSched.filter(t => Number(t[2]) <= Number(endTime));

        if (timesFit.length == s.redSched.length) return true;
        else return false;
    });

    // Find courses that match break before condition
    fit = fit.filter(s => {
        // Find times in schedule that match condition. If they all match, that section is valid.

        const timesFit = s.redSched.filter(t => {
            // If this is the first class of the day, keep.
            if (t[1] == "800") return true;

            const coursesBefore = $(`#${t[0].toLowerCase()}800`).nextUntil(`#${t[0].toLowerCase()}${t[1]}`).addBack().filter(".blocked");
            if (coursesBefore.length == 0) return true;

            // Otherwise, there is at least one course scheduled before this one.
            // Check to see if it is within the break period.
            const blocks = before.map(b => b / 30);

            // Check to find any courses conflicting with the minimum break period.
            const coursesViolateMinBreak = $(`#${t[0].toLowerCase()}${t[1]}`).prevAll().slice(0, blocks[0]).filter(".blocked");
            if (coursesViolateMinBreak.length != 0) return false;

            // Check to see if there is a course within the maximum break period.
            const coursesWithinMaxBreak = $(`#${t[0].toLowerCase()}${t[1]}`).prevAll().slice(blocks[0], blocks[1] + 1).filter(".blocked");
            if (coursesWithinMaxBreak.length == 0) return false;

            // If we made it here, then the course matches!
            return true;
        });

        // Check to see if all times in the section's schedule match the conditions
        if (timesFit.length == s.redSched.length) return true;
        else return false;
    });

    // Now find courses that match break after condition
    fit = fit.filter(s => {
        // Find times in schedule that match condition. If they all match, that section is valid.
        const timesFit = s.redSched.filter(t => {
            // If this is the last class of the day, keep.
            if (t[2] == "1800") return true;

            const coursesAfter = $(`#${t[0].toLowerCase()}${t[2]}`).nextUntil(`#${t[0].toLowerCase()}1800`).addBack().filter(".blocked");
            if (coursesAfter.length == 0) return true;

            // Otherwise, there is at least one course scheduled after this one.
            // Check to see if it is within the break period.
            const blocks = after.map(a => a / 30);

            // Check to find any courses conflicting with the minimum break period.
            const coursesViolateMinBreak = $(`#${t[0].toLowerCase()}${t[2]}`).nextAll().slice(0, blocks[0]).filter(".blocked");
            if (coursesViolateMinBreak.length != 0) return false;

            // Check to see if there is a course within the maximum break period.
            const coursesWithinMaxBreak = $(`#${t[0].toLowerCase()}${t[2]}`).nextAll().slice(blocks[0], blocks[1] + 1).filter(".blocked");
            if (coursesWithinMaxBreak.length == 0) return false;

            // If we made it here, then the course matches!
            return true;
        });

        // Check to see if all times in the section's schedule match the conditions
        if (timesFit.length == s.redSched.length) return true;
        else return false;
    });

    const options = courses[courseCode].sections.filter(s => s.intensive).concat(fit);
    createCourseOptionTiles(courseCode, options, complementary);

    return options.length;
}
function searchAll(courseCode, complementary = false) {
    const options = courses[courseCode].sections;
    createCourseOptionTiles(courseCode, options, complementary);
}

autocomplete($("#course"), parsedCourseNames, 3, function() {
    // Reset course option tiles when searching a new course

    $("#course-options").html("");
    $(".course-search-options button.active").removeClass("active");
    $("#course-search-accordion .collapse.show").collapse("hide");
    $("#course-search-accordion .invalid-feedback").hide();
    $("#course-search-accordion").removeClass("validated");

    if (tutorialRunning && tutorialStep == 0) {
        tutorial(1);
    }

    if ($("#course").val() == "Complementary Courses") {
        $("#course-search-section, #course-search-teacher").prop("disabled", true);
        $("#course-complementary-warning").show();
    }
    else {
        $("#course-search-section, #course-search-teacher").prop("disabled", false);
        $("#course-complementary-warning").hide();
    }
});

$(".course-search-options button").on("click", function() {
    const courseCode = $("#course").val().match(/([A-Z0-9]{3}-){2}[A-Z0-9]{2}(?= )/)?.[0];
    const complementary = $("#course").val() == "Complementary Courses";

    if (!complementary && (!courseCode || !(courseCode in courses))) return $("#course-error").show();
    else if (courseCode in courseSchedule) return $("#course-duplicate").show();

    $("#course-error, #course-duplicate").hide();

    if ($(this).hasClass("active")) return;

    $(".course-search-options button").removeClass("active");
    $(this).addClass("active");

    $("#course-options").html("");

    switch ($(this).attr("id")) {
        case "course-search-section" :
            const sections = courses[courseCode].sections.map(s => [s.ID, `${s.ID} Teacher: ${s.teacher[0]}. ${s.teacher.substring(s.teacher.indexOf(" "))}`]);

            $("#course-section").html("<option disabled selected>Select</option>");
            sections.forEach(s => {
                $("#course-section").append($("<option></option>").val(s[0]).text(s[1]));
            });

            $("#course-section").off("change").on("change", function() {
                searchSection(courseCode, $(this).val());
            });

            $("#course-search-section-accordion").collapse("show");
            break;

        case "course-search-teacher" :
            const teachers = [...new Set(courses[courseCode].sections.map(s => s.teacher))];

            $("#course-teacher").html("");
            teachers.forEach(t => {
                $("#course-teacher").append($("<option></option>").val(t).text(t));
            });

            $("#course-teacher").off("change").on("change", function() {
                searchTeachers(courseCode, $(this).val());
            });
            
            $("#course-search-teacher-accordion").collapse("show");
            break;

        case "course-search-day" :
            $("#course-search-day-accordion").collapse("show");
            break;

        case "course-search-best" :
            $("#course-search-best-accordion").collapse("show");
            break;

        case "course-search-all" :
            $("#course-search-accordion .collapse").collapse("hide");

            if (complementary) {
                Object.keys(courses).filter(code => complementaryRegex.test(code)).forEach(code => searchAll(code, true));
            }
            else {
                searchAll(courseCode);
            }
            break;
    }
    
});

$("#course-search-day-btn").on("click", function() {
    const selectedDays = $("input[name='course-search-day']:checked").toArray().map(c => c.value);
    if (!selectedDays.length) return $("#course-search-day-err").hide();

    $("#course-search-day-accordion .invalid-feedback").hide();

    $(this).prop("disabled", true).html("Searching&hellip;");

    const strict = $("#course-search-day-strict").is(":checked");

    const courseCode = $("#course").val().match(/([A-Z0-9]{3}-){2}[A-Z0-9]{2}(?= )/)?.[0];
    const complementary = $("#course").val() == "Complementary Courses";

    if (!complementary && (!courseCode || !(courseCode in courses))) return $("#course-error").show();
    else if (courseCode in courseSchedule) return $("#course-duplicate").show();

    $("#course-error, #course-duplicate").hide();

    complementary && $("#course-options").html("");

    const res = complementary ?
        Object.keys(courses)
            .filter(code => complementaryRegex.test(code))
            .map(code => searchDay(code, selectedDays, strict, true)) :
        searchDay(courseCode, selectedDays, strict);

    if (!complementary && !res || complementary && !res.filter(l => l).length) $("#course-search-day-empty").show();

    $(this).prop("disabled", false).text("Search");
});
$("#course-search-best-btn").on("click", function() {
    if ($("#course-search-best-accordion").has("input:invalid").length) {
        // Check if there are any problems with user inputs,
        // if so, show error message.
        $("#course-search-best-err").show();
        $("#course-search-best-accordion").addClass("validated");
        return;
    }

    $("#course-search-best-accordion .invalid-feedback").hide();

    $(this).prop("disabled", true).html("Searching&hellip;");

    const before = [
        $("#course-break-before-min").val(),
        $("#course-break-before-max").val()
    ];
    const after = [
        $("#course-break-after-min").val(),
        $("#course-break-after-max").val()
    ];
    const startTime = $("#course-start-min").datetimepicker("date").format("Hmm");
    const endTime = $("#course-end-max").datetimepicker("date").format("Hmm");

    const courseCode = $("#course").val().match(/([A-Z0-9]{3}-){2}[A-Z0-9]{2}(?= )/)?.[0];
    const complementary = $("#course").val() == "Complementary Courses";

    if (!complementary && (!courseCode || !(courseCode in courses))) return $("#course-error").show();
    else if (courseCode in courseSchedule) return $("#course-duplicate").show();

    $("#course-error, #course-duplicate").hide();

    complementary && $("#course-options").html("");

    const res = complementary ?
        Object.keys(courses)
            .filter(code => complementaryRegex.test(code))
            .map(code => searchBest(code, { before, after, startTime, endTime }, true)) :
        searchBest(courseCode, { before, after, startTime, endTime });

    if (!complementary && !res || complementary && !res.filter(l => l).length) $("#course-search-best-empty").show();

    $(this).prop("disabled", false).text("Search");
});
$("#course-break-before-min").on("change", function() {
    $("#course-break-before-max").attr("min", $(this).val());
});
$("#course-break-after-min").on("change", function() {
    $("#course-break-after-max").attr("min", $(this).val());
});
$("#course-break-before-max").on("change", function() {
    $("#course-break-before-min").attr("max", $(this).val());
});
$("#course-break-after-max").on("change", function() {
    $("#course-break-after-min").attr("max", $(this).val());
});