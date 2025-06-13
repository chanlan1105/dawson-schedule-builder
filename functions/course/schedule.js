import * as courses from "../../Data/f2025.json";

export async function onRequestPost(context) {
    // For a given courseSchedule = { courseCode: section }, grab corresponding data
    // from the courses database.

    const courseSchedule = await context.request.json();

    return new Response(JSON.stringify(
        Object.fromEntries(Object.entries(courseSchedule).map(([courseCode, section]) => {
            if (Array.isArray(section)) {
                // More than one section was requested.

                return [
                    courseCode,
                    courses[courseCode].sections.filter(s => section.includes(+s.ID))
                ];
            }
            else {
                // Only one section was requested.

                return [
                    courseCode,
                    courses[courseCode].sections.filter(s => +s.ID == section)?.[0]
                ];
            }
        }))
    ));
}