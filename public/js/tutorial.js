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

export function tutorial(step = 0) {
    $(".tutorial").popover("hide");
    window.tutorialStep = step;

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
            window.tutorialRunning = false;
            window.tutorialStep = 0;
            break;
    }
}
export function startTutorial() {
    if (window.tutorialRunning) return;
    window.tutorialRunning = true;
    tutorial();
}