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
            "accept-language": "en-CA,en;q=0.9,fr-CA;q=0.8,fr;q=0.7,es-US;q=0.6,es;q=0.5,en-GB;q=0.4,en-US;q=0.3",
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest",
            "cookie": "wordpress_sec_64850283c7b20f24c222d31d9820bac3=2238762%7C1767153899%7CcJURuXCMqUU0mgdPZRr5AFuWzsOgKBNlv4R6T0CsKRb%7C5c88f967e1c363dc1957a08d625d55d2d384fc9851167bd9de943319dd057962; wordpress_test_cookie=WP%20Cookie%20check; wordpress_sec_64850283c7b20f24c222d31d9820bac3=2238762%7C1767153899%7CcJURuXCMqUU0mgdPZRr5AFuWzsOgKBNlv4R6T0CsKRb%7C5c88f967e1c363dc1957a08d625d55d2d384fc9851167bd9de943319dd057962; wordpress_logged_in_64850283c7b20f24c222d31d9820bac3=2238762%7C1767153899%7CcJURuXCMqUU0mgdPZRr5AFuWzsOgKBNlv4R6T0CsKRb%7C400de2810ad69bbf0ca324f0729dbd63ba402d87bc96ce5fbde54b90098d0d3b; dawson_tta={}",
            "Referer": "https://timetable.dawsoncollege.qc.ca/"
        },
        "body": "action=timetable_search&nonce=62c4db9f3c&specific_ed=&discipline=&general_ed=&special_ed=&certificates=&learning_comm=&course_title=-&section=&teacher=&intensive=&seats=",
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

    console.log("Saving data...");

    const filename = `./Data/${term[0].toLowerCase()}${year}.json`;

    fs.writeFileSync(filename, JSON.stringify(courses));

    console.log("Done!");
})();