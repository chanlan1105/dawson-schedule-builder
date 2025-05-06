import { colours, courseSchedule_key } from "./config.js";
import { checkConflict } from "./conflict.js";
import { displayCourseBubbles } from "./ui.js";

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

/**
 * Adds a custom course to the schedule.
 * @returns {void}
 */
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
    const colour = colours[Object.values(window.courseSchedule).filter(c => !c.i).length % colours.length];
    window.courseSchedule[`CUSTOM-${window.customCourseCount}`] = {
        custom: {...course},
        c: colour
    };

    localStorage.setItem(courseSchedule_key, JSON.stringify(window.courseSchedule));

    // Create course bubbles
    displayCourseBubbles(`CUSTOM-${window.customCourseCount}`, {...course}, colour, "main");

    // Clear fields and reset modal
    $("#custom-course-modal input").val("");
    $("#custom-course-time-table > tbody tr").remove();
    $("#custom-course-modal").removeClass("validated").modal("hide");
}

$("#create-custom-course-btn").on("click", () => createCustomCourse());