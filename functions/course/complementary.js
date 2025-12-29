import * as courses from "../../Data/w2026.json";
import { complementaryRegex } from "../../public/js/config.js";

export async function onRequest(context) {
    if (context.request.method != "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    return new Response(JSON.stringify(
        Object.fromEntries(Object.entries(courses)
            .filter(([code]) => complementaryRegex.test(code))
            .map(([code, { sections }]) => [code, sections]))
    ));
}