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
          "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          "cookie": "wordpress_sec_64850283c7b20f24c222d31d9820bac3=2238762%7C1750008292%7CKGgyu4iL4qkNU4BydjvlXaGRUuNT00C7aqbPG1LAUCA%7C65c6606c5101dac7d4629bbc7b73030e143c4b3ab975ccbe4db034ddab4797e9; _ga_9CR35XX79D=GS2.3.s1746738385$o2$g1$t1746738388$j0$l0$h0; _ga=GA1.1.469098945.1745511425; _ga_RYQY8EEFVG=GS2.1.s1747525396$o1$g1$t1747525413$j43$l0$h0$dtBmh4sa1Fty58-0UWoZYMKL8U-4_eYJVwg; _ga_Z66L6Q4BDL=GS2.1.s1749131620$o5$g1$t1749131737$j60$l0$h0; _ga_5RDDCMFRZC=GS2.1.s1749131620$o5$g1$t1749131737$j60$l0$h0; wordpress_test_cookie=WP%20Cookie%20check; wordpress_sec_64850283c7b20f24c222d31d9820bac3=2238762%7C1750008292%7CKGgyu4iL4qkNU4BydjvlXaGRUuNT00C7aqbPG1LAUCA%7C65c6606c5101dac7d4629bbc7b73030e143c4b3ab975ccbe4db034ddab4797e9; wordpress_logged_in_64850283c7b20f24c222d31d9820bac3=2238762%7C1750008292%7CKGgyu4iL4qkNU4BydjvlXaGRUuNT00C7aqbPG1LAUCA%7C1aaa70921a22b75884733d5477a47b42a5e6041e4c1ff4f7a27d4a2aba14db21; dawson_tta={}",
          "Referer": "https://timetable.dawsoncollege.qc.ca/",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": "action=timetable_search&nonce=2b75480be5&specific_ed=&discipline=&general_ed=&special_ed=&certificates=&learning_comm=&course_title=-&section=&teacher=&intensive=&seats=",
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