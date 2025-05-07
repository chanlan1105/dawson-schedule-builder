import { checkConflict } from "./conflict.js";
import { createCourseOptionTiles } from "./ui.js";

/**
 * @todo Move complementary course fetching to the backend
 * @todo Check for other places where courses are accessed, move to backend
 */

/**
 * The sections of the selected course.
 * @type {{courseCode: Course[]}}
 */
let selectedCourseSections;

function searchSection(courseCode, section) {
    createCourseOptionTiles(courseCode, selectedCourseSections[courseCode].filter(s => s.ID == section));
}
function searchTeachers(courseCode, teachers) {
    const options = selectedCourseSections[courseCode].filter(s => teachers.includes(s.teacher));
    createCourseOptionTiles(courseCode, options);
}
function searchDay(courseCode, days, strict, complementary = false) {
    const intensive = selectedCourseSections[courseCode].filter(s => s.intensive);
    const options = selectedCourseSections[courseCode].filter(s => !s.intensive).filter(s => {
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
    let fit = selectedCourseSections[courseCode].filter(s => !s.intensive).filter(s => !checkConflict(s.schedule)).map(s => {
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

    const options = selectedCourseSections[courseCode].filter(s => s.intensive).concat(fit);
    createCourseOptionTiles(courseCode, options, complementary);

    return options.length;
}
function searchAll(courseCode, complementary = false) {
    const options = selectedCourseSections[courseCode];
    createCourseOptionTiles(courseCode, options, complementary);
}

$(".course-search-options button").on("click", function() {
    const courseCode = $("#course").val().match(/([A-Z0-9]{3}-){2}[A-Z0-9]{2}(?= )/)?.[0];
    const complementary = $("#course").val() == "Complementary Courses";

    if ($(this).hasClass("active")) return;

    $(".course-search-options button.active").removeClass("active");
    $(this).addClass("active");

    $("#course-options").html("");

    switch ($(this).attr("id")) {
        case "course-search-section" :
            const sections = selectedCourseSections[courseCode].map(s => [s.ID, `${s.ID} Teacher: ${s.teacher[0]}. ${s.teacher.substring(s.teacher.indexOf(" ")+1)}`]);

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
            const teachers = [...new Set(selectedCourseSections[courseCode].map(s => s.teacher))];

            $("#course-teacher").html("");
            teachers.sort((a, b) => a < b ? -1 : 1).forEach(t => {
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
                Object.keys(selectedCourseSections).forEach(code => searchAll(code, true));
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

    $("#course-not-found, #course-duplicate").hide();

    complementary && $("#course-options").html("");

    const res = complementary ?
        Object.keys(selectedCourseSections)
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

    complementary && $("#course-options").html("");

    const res = complementary ?
        Object.keys(selectedCourseSections)
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

autocomplete($("#course"), window.parsedCourseNames, 3, async function() {
    // Reset course option tiles when searching a new course
    $("#course-options").html("");
    $(".course-search-options button.active").removeClass("active");
    $("#course-search-accordion .collapse.show").collapse("hide");
    $("#course-search-accordion .invalid-feedback").hide();
    $("#course-search-accordion").removeClass("validated");

    if (tutorialRunning && tutorialStep == 0) {
        tutorial(1);
    }

    const courseCode = $("#course").val().match(/([A-Z0-9]{3}-){2}[A-Z0-9]{2}(?= )/)?.[0];
    const complementary = $("#course").val() == "Complementary Courses";

    if (courseCode in window.courseSchedule) {
        // Course already exists in the user's schedule. They must remove it before searching again.
        return $("#course-duplicate").show();
    }

    // Fetch course sections from server
    await fetch(complementary ? "/course/complementary" : "/course/sections", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: complementary ? undefined : JSON.stringify({
            courseCode
        })
    }).then(res => {
        if (res.status == 200) {
            // HTTP 200, course sections were successfully retrieved. Parse JSON and store to global variable.
            res.json().then(sections => {
                selectedCourseSections = sections;

                // Allow user to continue search.
                if ($("#course").val() == "Complementary Courses") {
                    $("#course-options-container > .autocomplete > .invalid-feedback").hide();
                    $(".course-search-options > button:not(#course-search-section, #course-search-teacher)").prop("disabled", false);
                    $("#course-complementary-warning").show();
                }
                else {
                    $("#course-options-container > .autocomplete > .invalid-feedback").hide();
                    $(".course-search-options > button").prop("disabled", false);
                    $("#course-complementary-warning").hide();
                }
            });
        }
        else if (res.status == 404) {
            // Could not find the course.
            $("#course-not-found").show();
        }
        else {
            // An unknown error has occurred.
            $("#course-error").show();
        }
    });
});
$("#course").on("input", () => {
    $(".course-search-options > button").prop("disabled", true);
});