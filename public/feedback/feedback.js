// Show maximum character indicator
const maxChar = 1250;

$("#feedback-char-remaining").text(maxChar);

$("#feedback").on("input", function() {
    const charRemaining = maxChar - $(this).val().length;

    $("#feedback-char-remaining").text(charRemaining);
});
$("#feedback").on("keydown", function(e) {
    const charRemaining = maxChar - $(this).val().length;
    if (charRemaining == 0 && e.key != "Backspace") {
        $("#feedback-char-remaining").parent().removeClass("headShake");
        setTimeout(() => $("#feedback-char-remaining").parent().addClass("headShake"), 50);
        return false;
    }
});

// Handle form submit.
$("#feedback-form").on("submit", function(e) {
    e.preventDefault();

    if ($("#g-recaptcha-response").val() == "" || grecaptcha.getResponse() == "") {
        $("#invalid-captcha").show();
        return;
    }

    const formData = new FormData(e.target);

    console.log(formData);

    fetch("/feedback/submit", {
        method: "POST",
        body: formData
    }).then(async res => {
        const data = await res.text();

        if (data == "ok") {
            $("#feedback-form").hide();
            $("#feedback-received").show();
        }
        else if (data == "captcha") {
            grecaptcha.reset();
            $("#captcha-error").show();
        }
    });
});

// Handle successful form submission.
if (location.search.includes("received")) {
    history.replaceState({}, document.title, location.pathname);
    $("#feedback-form").hide();
    $("#feedback-received").show();
}