const parsedCourseNames = Object.entries(courses).map(c => c[0] + " " + c[1].courseName).concat(["Complementary Courses", "ENR-SCI-XX Enriched Science"]);
const colours = ["red", "blue", "green", "orange", "purple", "teal", "yellow", "cyan", "lime"];
var currentColour = 0;
const complementaryRegex = /[A-Z0-9]{3}-B[XW][ACLMPSTX]-(?:03|DW)/;

var courseSchedule;
const courseSchedule_key = "lucas/courseSchedule";

var tutorialRunning = false, tutorialStep = 0;

String.prototype.safe = function() {
    return $("<div>").text(this).html();
}

$("#intro-modal").on("hide.bs.modal", () => {
    localStorage.setItem("lucas/schedule/seenIntro", "true");
    localStorage.setItem("lucas/schedule/seenExport", "true");
});

function startUp() {
    // Run on startup

    // Originally used to create the schedule grid, not needed anymore as the grid is directly in the static HTML
    /*
    const $col = [$("<div></div>"), $("<div></div>"), $("<div></div>"), $("<div></div>"), $("<div></div>"), $("<div></div>")];

    for (let i = 8; i <= 18; i += 0.5) {
        const $time = $("<div></div>");
        const $day = $("<div></div>");

        $time.text(`${Math.floor(i)}:${i % 1 == 0 ? "00" : "30"}`);
        $col[0].append($time);

        $col[1].append($day.clone().attr("id", `m${Math.floor(i)}${i % 1 == 0 ? "00" : "30"}`));
        $col[2].append($day.clone().attr("id", `t${Math.floor(i)}${i % 1 == 0 ? "00" : "30"}`));
        $col[3].append($day.clone().attr("id", `w${Math.floor(i)}${i % 1 == 0 ? "00" : "30"}`));
        $col[4].append($day.clone().attr("id", `r${Math.floor(i)}${i % 1 == 0 ? "00" : "30"}`));
        $col[5].append($day.clone().attr("id", `f${Math.floor(i)}${i % 1 == 0 ? "00" : "30"}`));
    }

    $("#schedule-main").append(...$col);
    */

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
                ]
            }
        ]
    };

    // Load schedule from localStorage
    try {
        courseSchedule = JSON.parse(localStorage.getItem(courseSchedule_key) ?? `{}`);
    }
    catch (err) {
        console.error(err);
        courseSchedule = {};
    }

    if (Object.keys(courseSchedule)) {
        // There are one or more courses already loaded
        
        for (let i in courseSchedule) {
            createCourseBubbles(i, courseSchedule[i]);
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
    $("#navbar-menu").popover({
        title: "Tutorial",
        content: "If your browser cookies are enabled, your schedule will be saved on this device. You can clear it from this menu.<br>You can also export or print your schedule.<br><button class='btn btn-link' onclick='tutorial(5)'>Finish</button>",
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
}

startUp();

function tutorial(step = 0) {
    $(".tutorial").popover("hide");
    tutorialStep = step;

    switch (step) {
        case 0 :
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
            $("#navbar-menu").popover("show");
            break;

        case 5 :
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
        const $info = $("<p></p>");
        const $times = $("<p></p>");
        const $title = $("<p></p>");

        // Populate tile with appropriate information
        $title.text(options[i].title ?? courses[courseCode].courseName);
        $info.html(`Teacher: ${options[i].teacher}<br>${complementary ? `${courseCode} sect. ${options[i].ID}` : `Section: ${options[i].ID}`}`);

        if (options[i].intensive) {
            $times.text("This is an intensive, pre-semester, or compressed course. You can find the details of this course as well as Dawson's Intensive and Compressed Course Policy in the Timetable and Registration Guide.");
        }
        else {
            $times.html(options[i].schedule.map(d =>
                `${({ M: "Mon", T: "Tues", W: "Wed", R: "Thurs", F: "Fri" })[d[0]]} ${d.slice(1).map(t => t.slice(0, -2) + ":" + t.slice(-2)).join("-")}<br>`
            ));
        }
        
        // Onclick handler: Allow the user to add the course to their schedule, if applicable
        const _$cardBody = $cardBody.clone();
        (options[i].title || complementary) && _$cardBody.append($title);
        _$cardBody.append($info, $times);

        const _$card = $card.clone();
        _$card.append(_$cardBody);
        if (options[i].intensive) {
            _$card.addClass("intensive");
        }

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
function searchBest(courseCode, before, after, complementary = false) {
    // Start by eliminating all courses that conflict, without intensives
    let fit = courses[courseCode].sections.filter(s => !s.intensive).filter(s => !checkConflict(s.schedule));

    // Find courses that match break before condition
    fit = fit.filter(s => {
        // Find times in schedule that match condition. If they all match, that section is valid.
        const timesFit = s.schedule.filter(t => {
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
        if (timesFit.length == s.schedule.length) return true;
        else return false;
    });

    // Now find courses that match break after condition
    fit = fit.filter(s => {
        // Find times in schedule that match condition. If they all match, that section is valid.
        const timesFit = s.schedule.filter(t => {
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
        if (timesFit.length == s.schedule.length) return true;
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

    const res = complementary ?
        Object.keys(courses)
            .filter(code => complementaryRegex.test(code))
            .map(code => searchDay(code, selectedDays, strict, true)) :
        searchDay(courseCode, selectedDays, strict);

    if (!complementary && !res || complementary && !res.filter(l => l).length) $("#course-search-day-empty").show();

    $(this).prop("disabled", false).text("Search");
});
$("#course-search-best-btn").on("click", function() {
    if ($("#course-search-best-accordion").has("input:invalid").length) return $("#course-search-best-err").show();

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

    const courseCode = $("#course").val().match(/([A-Z0-9]{3}-){2}[A-Z0-9]{2}(?= )/)?.[0];
    const complementary = $("#course").val() == "Complementary Courses";

    if (!complementary && (!courseCode || !(courseCode in courses))) return $("#course-error").show();
    else if (courseCode in courseSchedule) return $("#course-duplicate").show();

    $("#course-error, #course-duplicate").hide();

    const res = complementary ?
        Object.keys(courses)
            .filter(code => complementaryRegex.test(code))
            .map(code => searchBest(code, before, after, true)) :
        searchBest(courseCode, before, after);

    if (!complementary && !res || complementary && !res.filter(l => l).length) $("#course-search-day-empty").show();

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

function createCourseBubbles(courseCode, section, preview) {
    // Find course from dataset and prep jQuery elements
    const course = courses[courseCode].sections.filter(s => s.ID == section)[0];

    if (course.intensive) {
        // If intensive course, go to intensive function
        return addIntensive(courseCode, section);
    }

    const $div = $("<div></div>"), $delete = $("<icon></icon>").addClass("course-delete").text("clear");
    const $bubble = $div.clone(), $title = $div.clone(), $code = $div.clone(), $teacher = $div.clone();

    $delete.attr("onclick", `removeCourse("${courseCode}")`);

    $bubble.addClass(`course-bubble course-bubble-${colours[currentColour % colours.length]} ${courseCode}`);
    $title.addClass("course-title");
    $code.addClass("course-code");
    $teacher.addClass("course-teacher");

    $title.text(course.title || courses[courseCode].courseName);
    $code.text(courseCode + " sect. " + Number(section));
    $teacher.text(course.teacher);

    $bubble.append($delete, $title, $code, $teacher);

    if (preview) $bubble.addClass("preview");

    // Check for conflicts
    const conflict = checkConflict(course.schedule);
    if (conflict && !preview) {
        alert("This course conflicts with one or more courses already in your schedule");
        return false;
    }
    else if (conflict && preview) return false;

    // If no conflict, create course bubble.
    for (let i in course.schedule) {
        const hrs = course.schedule[i][2].slice(0, -2) - course.schedule[i][1].slice(0, -2);
        const mins = course.schedule[i][2].slice(-2) - course.schedule[i][1].slice(-2);
        const blocks = hrs * 2 + mins / 30;

        // Hide appropriate schedule boxes
        $(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).nextUntil(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][2]}`).addClass(`hidden blocked ${courseCode} ${preview ? "preview" : ""}`);

        // Extend the first schedule box and add the course bubble
        $(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).css("grid-row", `auto / span ${blocks}`).addClass(`blocked ${courseCode} ${courseCode} ${preview ? "preview" : ""}`);
        $(`#${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).append($bubble.clone());
    }

    if (!preview) {
        // Increment colour counter
        currentColour ++;

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
    }

    return true;
}
function addIntensive(courseCode, section) {
    // Retrieve course from database
    const course = courses[courseCode].sections.filter(s => s.ID == section)[0];

    // Prep jQuery elements
    const [$intensive, $details, $title, $code, $teacher] = Array(5).fill(null).map(() => $("<div></div>"));
    
    $intensive.addClass(`intensive-section ${courseCode}`);
    $details.addClass("intensive-details");
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

    const res = createCourseBubbles(courseCode, section);

    if (!res) return;

    // Add course to schedule and localStorage
    courseSchedule[courseCode] = Number(section);
    localStorage.setItem(courseSchedule_key, JSON.stringify(courseSchedule));

    // Allow user to select another course
    $("#course-options").html("");
    $(".course-search-options button.active").removeClass("active");
    $("#course-search-accordion .collapse.show").collapse("hide");
    $("#course").val("").focus();
}
function removeCourse(courseCode) {
    if (!(courseCode in courseSchedule)) return alert("You do not have this course in your schedule.");

    confirm(`Are you sure you want to remove course ${courseCode} from your schedule?`).then(res => {
        if (res) {
            // Remove bubbles from schedule
            $(`.course-bubble.${courseCode}`).parent().css("grid-row", "");
            $(`.course-bubble.${courseCode}, .intensive-section.${courseCode}`).remove();
            $(`.blocked.${courseCode}`).removeClass("hidden blocked");

            // Remove course from courseSchedule
            delete courseSchedule[courseCode];
            localStorage.setItem(courseSchedule_key, JSON.stringify(courseSchedule));
        }
    });
}
function clearSchedule() {
    confirm("Are you sure you want to remove all courses from your schedule and start again from scratch?").then(res => {
        if (res) {
            // Remove all bubbles from schedule
            $(`.course-bubble`).parent().css("grid-row", "");
            $(`.course-bubble`).remove();
            $(`.blocked`).removeClass("hidden blocked");

            // Remove all courses from courseSchedule
            courseSchedule = {};
            localStorage.setItem(courseSchedule_key, JSON.stringify(courseSchedule));
        }
    });
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

    // createCourseBubbles(courseCode, section, true);
}

function exportSchedule(type) {
    switch (type) {
        case "img" :
            confirm("Exclude intensive courses? (Recommended: Yes)").then(res => {
                if (res) $("#schedule-intensives, #schedule-intensives-header").hide();

                // Prep elements for export to image
                $("#schedule").addClass("export");
                saveAsImg($("#schedule")[0]);

                // Return elements to their original state
                $("#schedule").removeClass("export");
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
            $("#schedule").addClass("export");
            print($("#schedule")[0]);

            // Return elements to their original state
            $("#schedule").removeClass("export");
            break;
    }
}