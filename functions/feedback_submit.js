export async function onRequestPost({ request, env }) {
    const formData = await request.formData();
    const { name, email, type, feedback, "g-recaptcha-response": captcha } = Object.fromEntries(formData);

    // Verify captcha
    const captchaVerification = await (await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${env.CAPTCHA_SECRET}&response=${captcha}`
    })).json();

    console.log(captchaVerification, captcha, Object.fromEntries(formData));

    if (captchaVerification.success) {
        // Save data to database
        await env.DB
            .prepare("INSERT INTO Feedback (user_name, user_email, category, feedback) VALUES (?1, ?2, ?3, ?4)")
            .bind(name, email, type, feedback)
            .run();

        return new Response("ok");
    }
    else {
        return new Response("captcha");
    }
}