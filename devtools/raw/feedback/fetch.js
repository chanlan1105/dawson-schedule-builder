import { parse } from "cookie";
import { jwtVerify } from "jose";

export async function onRequestGet({ request, env }) {
    // No cookies were passed.
    if (!request.headers.get("Cookie")?.length) {
        return new Response("Forbidden", { status: 403 });
    }

    const cookies = parse(request.headers.get("Cookie"));

    // No authtoken found.
    if (!cookies["authtoken"]) {
        return new Response("Forbidden", { status: 403 });
    }

    // Validate the authenticity of the JWT.
    const secret = new TextEncoder().encode(env.JWT_ENCODING_SECRET);
    const { payload } = await jwtVerify(cookies["authtoken"], secret);

    // JWT is valid but admin permissions have not been granted.
    if (!payload.admin) return new Response("Forbidden", { status: 403 });

    // JWT is valid. Fetch feedback responses from database.
    const dbResults = await env.DB.prepare("SELECT * FROM Feedback").run();
    if (!dbResults.success) return new Response("Internal server error", { status: 500 });

    return new Response(JSON.stringify(dbResults.results), {
        headers: {
            "Content-Type": "application/json"
        }
    });
}