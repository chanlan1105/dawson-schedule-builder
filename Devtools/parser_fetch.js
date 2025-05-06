/**
 * parser_fetch.js
 * Uses Node.js fetch() API to pull Timetable data from Omnivox.
 * Must be signed in to Omnivox for authentication.
 * 
 * Auth not working? Sign in to Omnivox and follow the steps outlined
 * in ./info.txt. Use Chrome Devtools and copy the search.php request as 
 * fetch (Node.JS). Update the code as needed.
 */

const cheerio = require("cheerio");
const fs = require("fs");

(async () => {
    console.log("Fetching timetable data...");

    const timetable_data = await (await fetch("https://timetable.dawsoncollege.qc.ca/wp-content/plugins/timetable/search.php", {
        "headers": {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9,fr-CA;q=0.8,fr;q=0.7,es-US;q=0.6,es;q=0.5",
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest",
            "cookie": "wordpress_sec_64850283c7b20f24c222d31d9820bac3=2238762%7C1745787230%7C4aYneRki3uUfOdWvbCbXtEcB4EYtVvl3FJ1zZoLSZtt%7C1958a7fc2efd44fe8e59fa3871b8b4452948edf0a63d897f10afe1d092493805; _ga_9CR35XX79D=GS1.3.1745511425.1.0.1745511425.0.0.0; wordpress_test_cookie=WP%20Cookie%20check; dawson_tta={}; _ga=GA1.1.469098945.1745511425; _ga_5RDDCMFRZC=GS1.1.1745593398.2.0.1745593398.0.0.0; _ga_Z66L6Q4BDL=GS1.1.1745593398.2.0.1745593398.0.0.0; wordpress_sec_64850283c7b20f24c222d31d9820bac3=2238762%7C1745787230%7C4aYneRki3uUfOdWvbCbXtEcB4EYtVvl3FJ1zZoLSZtt%7C1958a7fc2efd44fe8e59fa3871b8b4452948edf0a63d897f10afe1d092493805; wordpress_logged_in_64850283c7b20f24c222d31d9820bac3=2238762%7C1745787230%7C4aYneRki3uUfOdWvbCbXtEcB4EYtVvl3FJ1zZoLSZtt%7C5adbdbd35e92ff3f9b4db81751ac68d667f6182384ef8215119314ef733fcbae",
            "Referer": "https://timetable.dawsoncollege.qc.ca/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": "action=timetable_search&nonce=b95901777e&specific_ed=&discipline=&general_ed=&special_ed=&certificates=&learning_comm=&course_title=-&section=&teacher=&intensive=&seats=",
        "method": "POST"
    })).text();
    
    const $ = cheerio.load(timetable_data);

    // Check to make sure that data was loaded properly from timetable.
    let data_fetch_error = false;
    $(".alert.alert-danger").each(function() {
        if ($(this).text().match("error occurred with your request")) {
            console.log("Failed to obtain timetable data. It is possible that authentication failed.");
            console.log(timetable_data);
            data_fetch_error = true;
            return false;
        }
    });
    if (data_fetch_error) return;

    const [ term, year ] = $("h2:first").text().match(/(Winter|Fall|Summer) ([0-9]{4})/i).slice(1);

    console.log(`Successfuly fetched timetable data for term ${term} ${year}.`);
    console.log("Parsing data...");

    var courses = {};

    $(".course-wrap").each(function() {
        const $course = $(this);

        const courseNum = $course.find(".cnumber").text();
        const courseName = $course.find(".ctitle").text();
        
        let sections = [];

        $course.find(".section-details").each(function() {
            const $section = $(this);

            const _text = $section.html().replace(/^ +/gm, "").replace(/[\t|\n|\r]+/g, "");
            const ID = _text.match(/(?<=<label class="col-md-2">Section<\/label><div class="col-md-10"><strong>)[0-9]{5}(?=<\/strong><\/div>)/)?.[0];
            const title = _text.match(/(?<=<label class="col-md-2">Section Title<\/label><div class="col-md-10">).+?(?=<\/div>)/)?.[0];
            const teacher = _text.match(/(?<=<label class="col-md-2">Teachers?<\/label><div class="col-md-10">).+?(?=<\/div>)/)?.[0];
            const note = _text.match(/(?<=<label class="col-md-2">Comment<\/label><div class="col-md-10">).+?(?=<\/div>)/)?.[0];

            const intensive = /<td data-label="Type">intensive<\/td>/i.test(_text) ? true : undefined;

            let schedule = [];
            $section.find(".schedule-details tr").each(function() {
                const $row = $(this);

                if (!intensive) {
                    const day = ({monday: "M", tuesday: "T", wednesday: "W", thursday: "R", friday: "F"})[$row.find("[data-label=\"Day\"]").text().toLowerCase()];
                    const [startTime, endTime] = $row.find("[data-label=\"Time\"]").text().split(" - ").map(t => {
                        const time = t.substring(0, t.indexOf(" "));
                        let [hrs, min] = time.split(":");

                        if (t.includes("PM") && hrs != "12") hrs = Number(hrs) + 12;

                        return `${hrs}${min}`;
                    });

                    schedule.push([ day, startTime, endTime ]);
                }
                else {
                    const day = $row.find("[data-label=\"Day\"]").text() + " " + $row.find("[data-label=\"Start Date\"]").text();
                    const time = $row.find("[data-label=\"Time\"]").text();
                    const room = $row.find("[data-label=\"Room\"]").text();

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

    console.log("Saving data...");

    const filename = `Data/${term[0].toLowerCase()}${year}.json`;

    fs.writeFileSync(filename, JSON.stringify(courses));

    console.log("Done!");
})();