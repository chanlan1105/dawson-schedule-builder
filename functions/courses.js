import * as courses from "../Data/w2025.json";

export function onRequest(context) {
    if (context.request.method != "GET") {
        return new Response("Method not allowed", { status: 405 });
    }

    return new Response(JSON.stringify(
        Object.fromEntries(Object.entries(courses).map(c => [c[0], c[1].courseName]))
    ));
}