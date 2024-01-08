const parsedCourseNames = Object.entries(courses).map(c => c[0] + " " + c[1].courseName).concat(["Complementary Courses", "ENR-SCI-XX Enriched Science"]);
const colours = ["red", "blue", "green", "orange", "purple", "teal", "brown", "crimson", "indigo", "cyan", "stone"];
var currentColour = 0;
const complementaryRegex = /[A-Z0-9]{3}-B[XW][ACLMPSTX]-(?:03|DW)/;

var courseSchedule, savedSchedules;
var customCourseCount = 0;
const courseSchedule_key = "lucas/courseSchedule";
const schedules_key = "lucas/schedule/list";
const semester_key = "lucas/schedule/sem";

/* -------------- UPDATE FOR NEW SEMESTERS -------------- */

const current_semester = "W2024"; // <-- UPDATE HERE FOR NEW SEMESTERS
const last_semester = "F2023"; // <-- AND HERE

/* -------------- UPDATE FOR NEW SEMESTERS -------------- */

var tutorialRunning = false, tutorialStep = 0;

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
    // Run on startup

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

        localStorage.setItem(schedules_key, "{}");
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
            createCourseBubbles(i, course, courseSchedule[i].c);
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
    /*
    if (localStorage.getItem("lucas/schedule/seenExport") != "true" &&
        localStorage.getItem("lucas/schedule/seenIntro") == "true") {
        $("#navbar-menu").popover("dispose");
        $("#navbar-menu").popover({
            title: "New! Export your schedule",
            content: "You can now export your schedule as a PNG or print it from this menu",
            bondary: "viewport",
            trigger: "manual"
        });
        $("#navbar-menu").popover("show");

        setTimeout(() => {
            $("#navbar-menu").popover("dispose");
            $("#navbar-menu").popover({
                title: "Tutorial",
                content: "If your browser cookies are enabled, your schedule will be saved on this device. You can clear it from this menu.<br>You can also export or print your schedule.<br><button class='btn btn-link' onclick='tutorial(5)'>Finish</button>",
                html: true,
                sanitize: false,
                trigger: "manual",
                offset: "3",
                boundary: "viewport"
            });

            localStorage.setItem("lucas/schedule/seenExport", "true");
        }, 10000);
    }
    */
}

startUp();

function tutorial(step = 0) {
    $(".tutorial").popover("hide");
    tutorialStep = step;

    switch (step) {
        case 0 :
            $("#course").focus();
            $("#course").popover("show");
            break;
        
        case 1 :
            $("#course-search-day").popover("show");
            break;

        case 2 :
            $("#course-options").popover("show");
            break;

        case 3 :
            $(".course-bubble.tutorial").first().popover("show");
            break;

        case 4 :
            $("#schedule-courses-header").popover("show");
            break;

        case 5 :
            $("#navbar-menu").popover("show");
            break;

        case 6 :
            tutorialRunning = false;
            tutorialStep = 0;
            break;
    }
}
function startTutorial() {
    if (tutorialRunning) return;
    tutorialRunning = true;
    tutorial();
}

function createCourseOptionTiles(courseCode, options, complementary = false) {
    // Creates the clickable options upon searching for a course

    const $card = $("<div></div>").addClass("card");
    const $cardBody = $("<div></div>").addClass("card-body");

    if (!complementary) $("#course-options").html("");

    // Create one tile per course option
    for (let i in options) {
        const $teacher = $("<p></p>").addClass("course-option-teacher");
        const $section = $("<p></p>").addClass("course-option-section");
        const $times = $("<p></p>").addClass("course-option-schedule");
        const $title = $("<p></p>").addClass("course-option-title");
        const $note = $("<p></p>").addClass("course-option-note");

        // Populate tile with appropriate information
        $title.text(options[i].title ?? courses[courseCode].courseName);
        $teacher.text(`Teacher: ${options[i].teacher}`);
        $section.html(complementary ? `${courseCode} sect. ${options[i].ID}` : `Section: ${options[i].ID}`);
        $note.html(options[i].note);

        if (options[i].intensive) {
            $times.text("This is an intensive, pre-semester, or compressed course. You can find the details of this course as well as Dawson's Intensive and Compressed Course Policy in the Timetable and Registration Guide.");
        }
        else {
            $times.html(options[i].schedule.map(d =>
                `${({ M: "Mon", T: "Tues", W: "Wed", R: "Thurs", F: "Fri" })[d[0]]} ${d.slice(1).map(t => t.slice(0, -2) + ":" + t.slice(-2)).join("-")}<br>`
            ));
        }
        
        // Create an instance of a card and append elements
        const _$cardBody = $cardBody.clone();
        (options[i].title || complementary) && _$cardBody.append("<icon>article</icon>", $title);
        _$cardBody.append("<icon>person_outline</icon>", $teacher, "<icon>tag</icon>", $section, "<icon>schedule</icon>", $times);
        options[i].note && _$cardBody.append("<icon>notes</icon>", $note);

        const _$card = $card.clone();
        _$card.append(_$cardBody);
        if (options[i].intensive) {
            _$card.addClass("intensive");
        }

        // Onclick handler: Allow the user to add the course to their schedule, if applicable
        _$card.on("click", function() {
            if ($(this).hasClass("active")) return;
            confirmAdd($(this), courseCode, +options[i].ID);
        });

        _$card.appendTo("#course-options");
    }

    // Check for tutorial
    if (tutorialRunning && tutorialStep == 1) {
        tutorial(2);
    }
}

function checkConflict(schedule) {
    for (let i in schedule) {
        const conflict = $(`#${schedule[i][0].toLowerCase()}${schedule[i][1]}`).nextUntil(`#${schedule[i][0].toLowerCase()}${schedule[i][2]}`).addBack().filter(".blocked");

        if (conflict.length) return true;
    }
    return false;
}
function findConflict(schedule) {
    let globalConflict = [];
    for (let i in schedule) {
        const conflict = $(`#${schedule[i][0].toLowerCase()}${schedule[i][1]}`).nextUntil(`#${schedule[i][0].toLowerCase()}${schedule[i][2]}`).addBack().filter(".blocked");
        globalConflict.push(...conflict);
    }
    return globalConflict;
}

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

/*
function previewCourseBubbles(courseCode, section) {
    // Find course from dataset
    const course = courses[courseCode].sections.filter(s => s.ID == section)[0];

    // Check for conflicts
    const conflict = checkConflict(course.schedule);
    if (conflict) {
        // Add conflict tiles and displace existing course tiles
        const conflictTiles = findConflict(course.schedule);

        conflictTiles.forEach(t => {
            const courseStartTile = $(t).prev(".blocked:not(.hidden):not(.conflict)");
            
            // Reduce the "size" of the start tile by 1
            const size = courseStartTile.css("grid-row").match(/(?<=span )[0-9]+/)[0];
            courseStartTile.css("grid-row", `auto / span ${size - 1}`);

            // Create conflict tile and append
            const $conflictBubble = $("<div></div>");
            $conflictBubble.addClass("course-bubble course-bubble-conflict");
            $conflictBubble.text("CONFLICT");

            $(t).removeClass("hidden").addClass("conflict").append($conflictBubble);
        });
    }

    // Create preview course bubble
    for (let i in course.schedule) {
        const hrs = course.schedule[i][2].slice(0, -2) - course.schedule[i][1].slice(0, -2);
        const mins = course.schedule[i][2].slice(-2) - course.schedule[i][1].slice(-2);
        const blocks = hrs * 2 + mins / 30;

        // Hide appropriate schedule boxes
        $(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).nextUntil(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][2]}`).addClass(`hidden blocked ${courseCode}`);

        // Extend the first schedule box and add the course bubble
        $(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).css("grid-row", `auto / span ${blocks}`).addClass(`blocked ${courseCode}`);
        $(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).append($bubble.clone());
    }
}
*/

function createCourseBubbles(courseId, course, colour) {
    if (course.intensive) {
        // If intensive course, go to intensive function
        return addIntensive(course.code, course.ID);
    }

    // Prep jQuery elements
    const $div = $("<div></div>"), $delete = $("<icon></icon>").addClass("course-delete").text("clear");
    const $bubble = $div.clone(), $title = $div.clone(), $code = $div.clone(), $teacher = $div.clone();
    if (!colour || !colour in colours) colour = colours[Object.values(courseSchedule).filter(c => !c.i).length % colours.length];

    $delete.attr("onclick", `removeCourse("${courseId}")`);

    $bubble.addClass(`course-bubble course-bubble-${colour} ${courseId}`);
    $title.addClass("course-title");
    $code.addClass("course-code");
    $teacher.addClass("course-teacher");

    $title.text(course.title || courses[course.code].courseName);
    if (course.code && course.ID) $code.text(`${course.code} sect. ${Number(course.ID)}`);
    else if (course.code) $code.text(`${course.code}`);
    else if (course.ID) $code.text(`Section ${Number(course.ID)}`);
    $teacher.text(course.teacher);

    $bubble.append($delete, $title, $code, $teacher);

    // Check for conflicts
    const conflict = checkConflict(course.schedule);
    if (conflict) {
        alert("This course conflicts with one or more courses already in your schedule");
        return false;
    }
    else if (conflict) return false;

    // If no conflict, create course bubble.
    for (let i in course.schedule) {
        const hrs = course.schedule[i][2].slice(0, -2) - course.schedule[i][1].slice(0, -2);
        const mins = course.schedule[i][2].slice(-2) - course.schedule[i][1].slice(-2);
        const blocks = hrs * 2 + mins / 30;

        // Hide appropriate schedule boxes
        $(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).nextUntil(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][2]}`).addClass(`hidden blocked ${courseId}`);

        // Extend the first schedule box and add the course bubble
        $(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).css("grid-row", `auto / span ${blocks}`).addClass(`blocked ${courseId}`);
        $(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).append($bubble.clone());
    }

    // Add course to course list
    const $section = $("<div></div>").addClass(`course-section ${courseId}`);
    const $details = $("<div></div>").addClass("course-details");
    const $controls = $("<div></div>").addClass("course-controls");
    const $colour_btn = $("<button><icon>format_color_fill</icon></button>").addClass("course-colour");
    $colour_btn.css("background-color", `var(--bubble-${colour})`);
    $colour_btn.popover({
        content:
        `<div class="course-colour-options ${courseId}">
            ${colours.map(c => `<div class="course-colour-option-${c}" onclick="changeBubbleColour('${courseId}', '${c}')" style="background-color: var(--bubble-${c})">
                ${c == colour ? `<icon>check</icon>` : ``}
            </div>`).join("")}
        </div>`,
        html: true,
        sanitize: false,
        trigger: "focus",
        boundary: "viewport"
    });
    $details.append($title.clone().attr("onclick", `removeCourse('${courseId}')`), $code, $teacher);
    $controls.append($colour_btn);
    $section.append($details, $controls);

    $("#schedule-courses").append($section);

    // Check for tutorial
    if (tutorialRunning && tutorialStep == 2) {
        $(".course-bubble").first().addClass("tutorial").popover({
            title: "Tutorial",
            content: "You can remove this course by hovering or tapping and clicking on the X in the top right corner.<br><button class='btn btn-link' onclick='tutorial(4)'>Next</button>",
            html: true,
            sanitize: false,
            trigger: "manual",
            offset: "3",
            boundary: "viewport"
        });

        tutorial(3);
    }

    return colour;
}
function loadCourseBubbles(courseId, course, colour) {
    // Prep jQuery elements
    if (course.intensive) return;

    const $div = $("<div></div>");
    const $bubble = $div.clone(), $title = $div.clone();
    if (!colour || !colour in colours) colour = colours[Object.values(courseSchedule).filter(c => !c.i).length % colours.length];

    $bubble.addClass(`course-bubble course-bubble-${colour} ${courseId}`);
    $title.addClass("course-title");

    $title.text(course.title || courses[course.code].courseName);

    $bubble.append($title);

    // If no conflict, create course bubble.
    for (let i in course.schedule) {
        const hrs = course.schedule[i][2].slice(0, -2) - course.schedule[i][1].slice(0, -2);
        const mins = course.schedule[i][2].slice(-2) - course.schedule[i][1].slice(-2);
        const blocks = hrs * 2 + mins / 30;

        // Hide appropriate schedule boxes
        $(`#l-${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).nextUntil(`#l-${course.schedule[i][0].toLowerCase()}${course.schedule[i][2]}`).addClass(`hidden blocked ${courseId}`);

        // Extend the first schedule box and add the course bubble
        $(`#l-${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).css("grid-row", `auto / span ${blocks}`).addClass(`blocked ${courseId} ${courseId}`);
        $(`#l-${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).append($bubble.clone());
    }

    return colour;
}
function changeBubbleColour(courseCode, colour) {
    if (!courseCode in courseSchedule) return alert("That course doesn't seem to be in your schedule.");
    if (!colour in colours) return alert("Sorry, that colour isn't available.");

    // Remove existing colour from bubbles
    $(`.course-bubble.${courseCode}`).removeClass((i, className) => (className.match(/course-bubble-\S+/g) || []).join(" "));

    // Add new colour to bubbles
    $(`.course-bubble.${courseCode}`).addClass(`course-bubble-${colour}`);
    $(`.course-section.${courseCode} .course-colour`).css("background-color", `var(--bubble-${colour})`);
    $(`.course-section.${courseCode} .course-colour`).popover("dispose");
    $(`.course-section.${courseCode} .course-colour`).popover({
        content:
        `<div class="course-colour-options ${courseCode}">
            ${colours.map(c => `<div class="course-colour-option-${c}" onclick="changeBubbleColour('${courseCode}', '${c}')" style="background-color: var(--bubble-${c})">
                ${c == colour ? `<icon>check</icon>` : ``}
            </div>`).join("")}
        </div>`,
        html: true,
        sanitize: false,
        trigger: "focus",
        boundary: "viewport"
    });
    $(`.course-colour-options.${courseCode} > div`).html("");
    $(`.course-colour-options.${courseCode} .course-colour-option-${colour}`).html("<icon>check</icon>");

    // Save to schedule
    courseSchedule[courseCode].c = colour;
    localStorage.setItem(courseSchedule_key, JSON.stringify(courseSchedule));
}
function addIntensive(courseCode, section) {
    // Retrieve course from database
    const course = courses[courseCode].sections.filter(s => s.ID == section)[0];

    // Prep jQuery elements
    const [$intensive, $details, $title, $code, $teacher] = Array(5).fill(null).map(() => $("<div></div>"));
    
    $intensive.addClass(`intensive-section course-section ${courseCode}`);
    $details.addClass("course-details");
    $title.addClass("course-title");
    $code.addClass("course-code");
    $teacher.addClass("course-teacher");

    $title.text(course.title || courses[courseCode].courseName);
    $code.text(courseCode + " sect. " + Number(section));
    $teacher.text(course.teacher);

    $title.attr("onclick", `removeCourse("${courseCode}")`);

    const $times = $("<table></table>");
    const $thead = $("<thead></thead>");
    const $tbody = $("<tbody></tbody>");

    $times.addClass("intensive-times");

    $thead.append( $("<tr></tr>").append("<th>Date</th>", "<th>Time</th>", "<th>Location</th>") );

    // Loop through schedule
    for (let i in course.schedule) {
        const $el = course.schedule[i].map(t => `<td>${t}</td>`);
        $tbody.append( $("<tr></tr>").append(...$el) );
    }

    // Append elements
    $details.append($title, $code, $teacher);
    $times.append($thead, $tbody);
    $intensive.append($details, $times);
    $("#schedule-intensives").append($intensive);

    return true;
}
function cancelPreview() {
    $(`.course-bubble.preview`).parent().css("grid-row", "");
    $(`.course-bubble.preview`).remove();
    $(`.blocked.preview`).removeClass();
}
function addCourse(courseCode, section) {
    if (courseCode in courseSchedule) return alert("You already have that course in your schedule.");

    const course = courses[courseCode].sections.filter(s => s.ID == section)[0];
    const res = createCourseBubbles(courseCode, {
        code: courseCode,
        ...course
    });

    if (!res) return;

    const intensive = courses[courseCode].sections.filter(s => s.ID == section)[0].intensive ?? false;

    // Add course to schedule and localStorage
    courseSchedule[courseCode] = {
        s: Number(section),
        i: intensive,
        c: intensive ? undefined : res
    };
    localStorage.setItem(courseSchedule_key, JSON.stringify(courseSchedule));

    // Allow user to select another course
    $("#course-options").html("");
    $(".course-search-options button.active").removeClass("active");
    $("#course-search-accordion .collapse.show").collapse("hide");
    $("#course-complementary-warning").hide();
    $("#course").val("").focus();
}
function removeCourse(courseCode) {
    if (!(courseCode in courseSchedule)) return alert("You do not have this course in your schedule.");

    confirm(`Are you sure you want to remove course ${courseCode} from your schedule?`).then(res => {
        if (res) {
            // Remove bubbles from schedule
            $(`.course-bubble.${courseCode}`).parent().css("grid-row", "");
            $(`.course-bubble.${courseCode}, .course-section.${courseCode}, .intensive-section.${courseCode}`).remove();
            $(`.blocked.${courseCode}`).removeClass();

            // Remove course from courseSchedule
            delete courseSchedule[courseCode];
            localStorage.setItem(courseSchedule_key, JSON.stringify(courseSchedule));
        }
    });
}
function clearSchedule(force) {
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
        courseSchedule = {};
        customCourseCount = 0;
        localStorage.setItem(courseSchedule_key, JSON.stringify(courseSchedule));
    }

    if (!force) {
        confirm("Are you sure you want to remove all courses from your schedule and start again from scratch?").then(res => {
            res && doIt();
        });
    }
    else doIt();
}
function clearLoadBubbles() {
    $("#load-schedule-main .course-bubble").parent().css("grid-row", "");
    $("#load-schedule-main .course-bubble").remove();
    $("#load-schedule-main .blocked").removeClass();
}
function confirmAdd($el, courseCode, section) {
    // cancelPreview();

    $("#course-options > .active .course-confirm-btns").remove();
    $("#course-options > .active").removeClass("active");

    const $confirm = $("<div></div>").addClass("course-confirm-btns");
    const $text = $("<p></p>").html("Are you sure you want to add this course? You can always remove it later.");
    const $buttons = $("<div></div>").addClass("btn-group btn-group-sm");
    const $yesBtn = $("<button></button>").addClass("btn btn-success").text("Add course");
    const $noBtn = $("<button></button>").addClass("btn btn-danger").text("Cancel");

    $yesBtn.on("click", e => {
        e.stopImmediatePropagation();
        addCourse(courseCode, section);

        $yesBtn.prop("disabled", true);
    });
    $noBtn.on("click", e => {
        e.stopImmediatePropagation();

        $confirm.remove();
        $el.removeClass("active");

        // cancelPreview();
    });

    $buttons.append($yesBtn, $noBtn);
    $confirm.append($text, $buttons);

    $el.append($confirm).addClass("active");
}

async function saveSchedule() {
    const name = await prompt("What would you like to name this schedule?", "Schedule #1");
    if (!name) return;

    // Check for duplicate saved schedule name
    if (savedSchedules.filter(s => s.n == name).length &&
        await confirm(`You already have a schedule called ${name}. Would you like to overwrite it?`)) {
        savedSchedules = savedSchedules.filter(s => s.n != name);
    }
    else if (savedSchedules.filter(s => s.n == name).length) return;

    savedSchedules.push({
        n: name,
        s: courseSchedule
    });

    // Save to localStorage
    localStorage.setItem(schedules_key, JSON.stringify(savedSchedules));

    // Check if user wants to clear schedule to start from scratch
    await confirm("--save--") && clearSchedule(true);   
}
function loadScheduleModal() {
    if (savedSchedules.length == 0) return alert("You have no saved schedules.");

    clearLoadBubbles();

    // Add options to schedule select
    $("#load-schedule-select").html("<option selected disabled>Select</option>");
    savedSchedules.forEach(s => {
        const $option = $("<option></option>").text(s.n).val(s.n);
        $("#load-schedule-select").append($option);
    });

    $("#load-schedule-modal").modal("show");
}
async function deleteSavedSchedule() {
    if (!await confirm("Are you sure you want to delete this saved schedule?")) return false;
    
    savedSchedules = savedSchedules.filter(s => s.n != $("#load-schedule-select").val());
    localStorage.setItem(schedules_key, JSON.stringify(savedSchedules));

    clearLoadBubbles();

    // Add options to schedule select
    $("#load-schedule-select").html("<option selected disabled>Select</option>");
    savedSchedules.forEach(s => {
        const $option = $("<option></option>").text(s.n).val(s.n);
        $("#load-schedule-select").append($option);
    });
}
function loadSchedule() {
    const schedule = savedSchedules.filter(s => s.n == $("#load-schedule-select").val())[0].s;

    clearSchedule(true);

    for (let i in schedule) {
        const course = schedule[i].custom ?? {code: i, ...courses[i].sections.filter(s => s.ID == schedule[i].s)[0]};
        createCourseBubbles(i, course, schedule[i].c);
    }

    customCourseCount = Object.values(schedule).filter(c => "custom" in c).length;

    // Write to localStorage
    courseSchedule = {...schedule};
    localStorage.setItem(courseSchedule_key, JSON.stringify(courseSchedule));

    $("#load-schedule-modal").modal("hide");
    clearLoadBubbles();
}
$("#load-schedule-select").on("change", function() {
    clearLoadBubbles();

    const schedule = savedSchedules.filter(s => s.n == $(this).val())[0].s;
    
    for (let i in schedule) {
        const course = schedule[i].custom ?? {code: i, ...courses[i].sections.filter(s => s.ID == schedule[i].s)[0]};
        loadCourseBubbles(i, course, schedule[i].c);
    }
});

$("#course-manual").on("click", function() {
    $("#custom-course-modal").modal("show");
});
$("#custom-course-time-btn").on("click", function() {
    const $remove = $("<icon>delete</icon>");
    $remove.on("click", function() {
        $(this).closest("tr").remove();
    });

    const $daySelect = $("<select required></select>").addClass("form-control form-control-sm").append("<option value='' disabled selected>Select</option>");

    for (let i of [["M", "Monday"], ["T", "Tuesday"], ["W", "Wednesday"], ["R", "Thursday"], ["F", "Friday"]]) {
        const $option = $("<option></option").val(i[0]).text(i[1]);
        $daySelect.append($option);
    }

    const $startTime = $("<input type='text' required readonly>").addClass("datetimepicker-input form-control form-control-sm custom-course-start-time");
    const $endTime = $("<input type='text' required readonly>").addClass("datetimepicker-input form-control form-control-sm custom-course-end-time");

    // Initiate datetimepickers
    $startTime.datetimepicker({
        format: "H:mm",
        stepping: 30,
        minDate: moment({ hour: 8 }),
        maxDate: moment({ hour: 18, second: 59 }),
        useCurrent: false,
        ignoreReadonly: true
    });
    $startTime.on("focus", function() {
        $(this).datetimepicker("show");
    });
    $startTime.on("focusout", function() {
        $(this).datetimepicker("hide");
    });
    $endTime.datetimepicker({
        format: "H:mm",
        stepping: 30,
        minDate: moment({ hour: 8 }),
        maxDate: moment({ hour: 18, second: 59 }),
        useCurrent: false,
        ignoreReadonly: true
    });
    $endTime.on("focus", function() {
        $(this).datetimepicker("date", $startTime.datetimepicker("date"));
        $(this).datetimepicker("show");
    });
    $endTime.on("focusout", function() {
        $(this).datetimepicker("hide");
    });

    // Link datetimepickers
    $startTime.on("change.datetimepicker", function(e) {
        $endTime.datetimepicker("minDate", e.date);
    });
    $endTime.on("change.datetimepicker", function(e) {
        $startTime.datetimepicker("maxDate", e.date);
    });

    const $row = $("<tr></tr>");
    $row.append($("<td></td>").append($remove), $("<td></td>").append($daySelect), $("<td></td>").append($startTime), $("<td></td>").append($endTime));

    $("#custom-course-time-table tbody").append($row);
});
function createCustomCourse() {
    // Add invalid class to empty timepicker textboxes
    // and remove it from textboxes which have been filled
    $("#custom-course-time-table input.invalid").filter(function() {
        return $(this).val();
    }).removeClass("invalid");
    $("#custom-course-time-table input").filter(function() {
        return !$(this).val();
    }).addClass("invalid");

    // Add validated class to modal
    $("#custom-course-modal").addClass("validated");

    // Check for invalid fields
    if ($("#custom-course-modal").has(":invalid").length) return;

    // If there are no invalid fields, create the custom course
    let course = {
        title: $("#custom-course-title").val(),
        schedule: []
    };

    $("#custom-course-code").val() && (course.code = $("#custom-course-code").val());
    $("#custom-course-section").val() && (course.ID = $("#custom-course-section").val());
    $("#custom-course-teacher").val() && (course.teacher = $("#custom-course-teacher").val());

    // Loop through schedule and check for conflicts
    $("#custom-course-time-table tbody tr").each(function() {
        const timeslot = [
            $(this).find("select").val().toUpperCase(),
            $(this).find("input.custom-course-start-time").datetimepicker("date").format("Hmm"),
            $(this).find("input.custom-course-end-time").datetimepicker("date").format("Hmm")
        ];
        checkConflict([timeslot]) && $(this).find("input").addClass("invalid");
        course.schedule.push(timeslot);
    });

    // Check for invalid again
    if ($("#custom-course-modal").has(":invalid, .invalid").length) return $("#custom-course-modal .modal-body small").eq(1).addClass("font-weight-bold text-danger");

    // Otherwise save the course!
    const colour = colours[Object.values(courseSchedule).filter(c => !c.i).length % colours.length];
    courseSchedule[`CUSTOM-${customCourseCount}`] = {
        custom: {...course},
        c: colour
    };

    localStorage.setItem(courseSchedule_key, JSON.stringify(courseSchedule));

    // Create course bubbles
    createCourseBubbles(`CUSTOM-${customCourseCount}`, {...course}, colour);

    // Clear fields and reset modal
    $("#custom-course-modal input").val("");
    $("#custom-course-time-table > tbody tr").remove();
    $("#custom-course-modal").removeClass("validated").modal("hide");
}

function exportSchedule(type) {
    switch (type) {
        case "img" :
            confirm("Exclude intensive courses? (Recommended: Yes)").then(res => {
                if (res) $("#schedule-intensives, #schedule-intensives-header").hide();

                // Prep elements for export to image
                $("main").addClass("export");
                saveAsImg($("main")[0]);

                // Return elements to their original state
                $("main").removeClass("export");
                $("#schedule-intensives, #schedule-intensives-header").show();
            });
            
            break;
        
        case "pdf" :
            return alert("This function is not been fully developed. You can save your schedule as a PDF by selecting the \"Print\" option, and choosing \"Save as PDF\" from the print dialog box.");

            // Prep elements for export
            $("#schedule").addClass("export");
            saveAsPDF($("#schedule")[0]);

            // Return elements to their original state
            $("#schedule").removeClass("export");
            break;

        case "print" :
            // Prep elements for export
            $("main").addClass("export");
            $("#course-options-sidebar, .course-delete, #schedule-course-list").hide();
            print($("main")[0]);

            // Return elements to their original state
            $("main").removeClass("export");
            $("#course-options-sidebar, .course-delete, #schedule-course-list").show();
            break;
    }
}