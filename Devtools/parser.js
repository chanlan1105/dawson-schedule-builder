function parse() {

    $("#junk").html($("#response").val());

    var courses = {};

    $(".course-wrap").each(function() {
        const $course = $(this);

        const courseNum = $course.find(".cnumber")[0].innerText;
        const courseName = $course.find(".ctitle")[0].innerText;
        
        let sections = [];

        $course.find(".section-details").each(function() {
            const $section = $(this);

            const _text = $section.html().replace(/^ +/gm, "").replace(/[\t|\n|\r]+/g, "");
            const ID = _text.match(/(?<=<label class="col-md-2">Section<\/label><div class="col-md-10"><strong>)[0-9]{5}(?=<\/strong><\/div>)/)?.[0];
            const title = _text.match(/(?<=<label class="col-md-2">Section Title<\/label><div class="col-md-10">).+?(?=<\/div>)/)?.[0];
            const teacher = _text.match(/(?<=<label class="col-md-2">Teachers?<\/label><div class="col-md-10">).+?(?=<\/div>)/)?.[0];
            const note = _text.match(/(?<=<label class="col-md-2">Comment<\/label><div class="col-md-10">).+?(?=<\/div>)/)?.[0];

            const intensive = /(?<=<label class="col-md-2">Section Title<\/label><div class="col-md-10">).+\((intensive|pre-semester|compressed)\).+(?=<\/div>)/i.test(_text) ? true : undefined;

            let schedule = [];
            $section.find(".schedule-details tr").each(function() {
                const $row = $(this);

                if (!intensive) {
                    const day = ({monday: "M", tuesday: "T", wednesday: "W", thursday: "R", friday: "F"})[$row.find("[data-label=\"Day\"]")[0].innerText.toLowerCase()];
                    const [startTime, endTime] = $row.find("[data-label=\"Time\"]")[0].innerText.split(" - ").map(t => {
                        const time = t.substring(0, t.indexOf(" "));
                        let [hrs, min] = time.split(":");

                        if (t.includes("PM") && hrs != "12") hrs = Number(hrs) + 12;

                        return `${hrs}${min}`;
                    });

                    schedule.push([ day, startTime, endTime ]);
                }
                else {
                    const day = $row.find("[data-label=\"Day\"]")[0].innerText + " " + $row.find("[data-label=\"Start Date\"]")[0].innerText;
                    const time = $row.find("[data-label=\"Time\"]")[0].innerText;
                    const room = $row.find("[data-label=\"Room\"]")[0].innerText;

                    schedule.push([ day, time, room ]);
                }
            });

            // Remove duplicates in Schedule
            schedule = schedule.map(JSON.stringify).filter((e,i,a) => i === a.indexOf(e)).map(JSON.parse);

            sections.push({
                ID,
                title,
                teacher,
                schedule,
                note,
                intensive
            });
        });

        courses[courseNum] = { courseName, sections }; 
    });

    console.log(courses);

    $("#junk").html("");

}