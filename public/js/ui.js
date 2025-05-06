import { colours, courseSchedule_key } from "./config.js";
import { checkConflict } from "./conflict.js";
import { addCourse, removeCourse } from "./schedule.js";

/**
 * 
 * @param {String} courseCode The course code
 * @param {Course[]} options Array of possible sections to choose from
 * @param {Boolean} [complementary=false] If the user is searching for a complementary course
 * @returns {void}
 */
export function createCourseOptionTiles(courseCode, options, complementary = false) {
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
        $title.text(options[i].title ?? window.courseList[courseCode]);
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
            previewCourse($(this), courseCode, options[i]);

            // Preview the course
            cancelPreview();
            displayCourseBubbles(courseCode, {
                code: courseCode,
                ...options[i]
            }, null, "preview");
        });

        _$card.appendTo("#course-options");
    }

    // Check for tutorial
    if (tutorialRunning && tutorialStep == 1) {
        tutorial(2);
    }
}

/**
 * Use to create jQuery course bubbles.
 * 
 * @param {String} courseCode The course code
 * @param {Course} course Details of the course
 * @param {String} colour Colour of the bubble
 * @param {Boolean} [options.stub=false] Set to `true` to display a shortened bubble only containing course title
 * @param {Boolean} [options.preview=false] Set to `true` to display a translucent pulsating bubble for preview
 * 
 * @returns {Object} elements The jQuery elements
 * @returns {jQuery} elements.$bubble The course bubble
 * @returns {jQuery} elements.$title The jQuery element corresponding to course title
 * @returns {jQuery} elements.$code The jQuery element corresponding to course code
 * @returns {jQuery} elements.$teacher The jQuery element corresponding to teacher
 * @returns {String} elements.colour The bubble colour
 */
function createCourseBubbles(courseCode, course, colour, options = {stub: false, preview: false}) {
    if (course.intensive && !preview) {
        // If intensive course, go to intensive function
        return addIntensive(course.code, course.ID);
    }
    else if (course.intensive) {
        // Cannot preview an intensive course.
        return;
    }

    // Prep jQuery elements
    const $div = $("<div></div>"), $delete = $("<icon></icon>").addClass("course-delete").text("clear");
    const $bubble = $div.clone(), $title = $div.clone(), $code = $div.clone(), $teacher = $div.clone();
    if (!colour || !colour in colours) colour = colours[Object.values(window.courseSchedule).filter(c => !c.i).length % colours.length];

    $bubble.addClass(`course-bubble course-bubble-${colour} ${courseCode}`);
    $title.addClass("course-title");
    $code.addClass("course-code");
    $teacher.addClass("course-teacher");

    $title.text(course.title || window.courseList[course.code]);
    if (course.code && course.ID) $code.text(`${course.code} sect. ${Number(course.ID)}`);
    else if (course.code) $code.text(`${course.code}`);
    else if (course.ID) $code.text(`Section ${Number(course.ID)}`);
    $teacher.text(course.teacher);

    if (!options.preview && !options.stub) $bubble.append($delete);
    
    $bubble.append($title);

    if (!options.stub) $bubble.append($code, $teacher);

    return { $bubble, $title, $code, $teacher, colour };
}

/**
 * Adds an intensive course to the bottom of the schedule.
 * @param {Course} course The course to add.
 * @returns true
 */
function addIntensive(course) {
    const { code: courseCode, ID: section } = course;

    // Prep jQuery elements
    const [$intensive, $details, $title, $code, $teacher] = Array(5).fill(null).map(() => $("<div></div>"));
    
    $intensive.addClass(`intensive-section course-section ${courseCode}`);
    $details.addClass("course-details");
    $title.addClass("course-title");
    $code.addClass("course-code");
    $teacher.addClass("course-teacher");

    $title.text(course.title || window.courseList[courseCode]);
    $code.text(courseCode + " sect. " + Number(section));
    $teacher.text(course.teacher);

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

    // Attach event listeners
    $title.on("click", () => {
        removeCourse(courseCode);
    });

    return true;
}

/**
 * Appends jQuery course bubbles created by `createCourseBubbles` into a predefined parent element.
 * 
 * @param {string} courseCode The course code
 * @param {Course} course Details of the course
 * @param {string} _colour Desired bubble colour
 * @param {string} element `preview` | `main`
 * @returns {string} colour The colour of the bubble
 */
export function displayCourseBubbles(courseCode, course, _colour, element) {    
    if (course.intensive && element == "main") {
        // If intensive course, go to intensive function
        return addIntensive(course.code, course.ID);
    }
    else if (course.intensive) {
        // Intensive courses are generally not added as bubbles.
        return;
    }

    const { $bubble, $title, $code, $teacher, colour } = createCourseBubbles(courseCode, course, _colour, { stub: element == "load", preview: element == "preview" });

    if (element == "preview") $bubble.addClass("preview");

    // Check for conflicts
    const conflict = checkConflict(course.schedule);
    if (conflict && element == "main") {
        alert("This course conflicts with one or more courses already in your schedule");
        return false;
    }

    // If no conflict, create course bubble.
    const elPrefix = ({main: "", load: "l-", preview: "p-"})[element];

    for (let i in course.schedule) {
        const hrs = course.schedule[i][2].slice(0, -2) - course.schedule[i][1].slice(0, -2);
        const mins = course.schedule[i][2].slice(-2) - course.schedule[i][1].slice(-2);
        const blocks = hrs * 2 + mins / 30;

        // Hide appropriate schedule boxes
        $(`#${elPrefix}${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).nextUntil(`#${elPrefix}${course.schedule[i][0].toLowerCase()}${course.schedule[i][2]}`).addClass(`hidden blocked ${courseCode}`);

        // Create a copy of the course bubble to append
        const _$bubble = $bubble.clone();

        // Extend the first schedule box and add the course bubble
        $(`#${elPrefix}${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).css("grid-row", `auto / span ${blocks}`).addClass(`blocked ${courseCode}`);
        $(`#${elPrefix}${course.schedule[i][0].toLowerCase()}${course.schedule[i][1]}`).append(_$bubble);

        // Attach event listeners
        _$bubble.find(".course-delete").first().on("click", () => {
            removeCourse(courseCode);
        });
    }

    // Add course to course list, if applicable
    if (element == "main") {
        const $section = $("<div></div>").addClass(`course-section ${courseCode}`);
        const $details = $("<div></div>").addClass("course-details");
        const $controls = $("<div></div>").addClass("course-controls");
        const $colour_btn = $("<button><icon>format_color_fill</icon></button>").addClass("course-colour");
        $colour_btn.css("background-color", `var(--bubble-${colour})`);
        $colour_btn.popover({
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
        $details.append($title.clone().on("click", () => removeCourse(courseCode)), $code, $teacher);
        $controls.append($colour_btn);
        $section.append($details, $controls);
    
        $("#schedule-courses").append($section);
    
        // Check for tutorial
        if (window.tutorialRunning && window.tutorialStep == 2) {
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

    return colour;
}

/**
 * Changes the colour of course bubbles
 * @param {string} courseCode The course code
 * @param {string} colour The desired colour
 * @returns {void}
 */
export function changeBubbleColour(courseCode, colour) {
    if (!courseCode in window.courseSchedule) return alert("That course doesn't seem to be in your schedule.");
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
    window.courseSchedule[courseCode].c = colour;
    localStorage.setItem(courseSchedule_key, JSON.stringify(window.courseSchedule));
}

/**
 * Previews a course section and adds buttons to confirm adding the course to the schedule
 * @param {jQuery} $el The course option tile to add confirmation buttons to
 * @param {string} courseCode The course code
 * @param {Course} course The course details.
 */
function previewCourse($el, courseCode, course) {
    $("#course-options > .active .course-confirm-btns").remove();
    $("#course-options > .active").removeClass("active");

    const $confirm = $("<div></div>").addClass("course-confirm-btns");
    const $text = $("<p></p>").html("Are you sure you want to add this course? You can always remove it later.");
    const $buttons = $("<div></div>").addClass("btn-group btn-group-sm");
    const $yesBtn = $("<button></button>").addClass("btn btn-success").text("Add course");
    const $noBtn = $("<button></button>").addClass("btn btn-danger").text("Cancel");

    $yesBtn.on("click", e => {
        e.stopImmediatePropagation();
        cancelPreview();

        addCourse(courseCode, course);

        $yesBtn.prop("disabled", true);
    });
    $noBtn.on("click", e => {
        e.stopImmediatePropagation();

        $confirm.remove();
        $el.removeClass("active");

        cancelPreview();
    });

    $buttons.append($yesBtn, $noBtn);
    $confirm.append($text, $buttons);

    $el.append($confirm).addClass("active");
}

/**
 * Removes all previewed courses.
 */
function cancelPreview() {
    $(`.course-bubble.preview`).parent().css("grid-row", "");
    $(`.course-bubble.preview`).remove();
    $(`#schedule-preview .blocked`).removeClass();
}