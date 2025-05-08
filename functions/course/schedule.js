import * as courses from "../../Data/w2025.json";

export async function onRequestPost(context) {
    // For a given courseSchedule = { courseCode: section }, grab corresponding data
    // from the courses database.

    const courseSchedule = await context.request.json();

    return new Response(JSON.stringify(
        Object.fromEntries(Object.entries(courseSchedule).map(([courseCode, section]) => {
            return [
                courseCode,
                courses[courseCode].sections.filter(s => +s.ID == section)?.[0]
            ];
        }))
    ));
}