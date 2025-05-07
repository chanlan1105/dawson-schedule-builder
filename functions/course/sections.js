import * as courses from "../../Data/w2025.json";

export async function onRequest(context) {
    if (context.request.method != "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    const { courseCode } = await context.request.json();

    if (!courseCode) {
        return new Response("Missing 'courseCode' property in request body", { status: 400 });
    }

    if (!(courseCode in courses)) {
        return new Response(JSON.stringify({}), { status: 404 });
    }

    const res = {};
    res[courseCode] = courses[courseCode].sections;

    return new Response(JSON.stringify(res));
}