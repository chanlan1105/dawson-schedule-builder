if (typeof html2canvas == 'undefined') {
    throw new Error("This export module requires html2canvas be initiated prior to this script\nhttps://html2canvas.hertzen.com/");
}

if (typeof jsPDF == 'undefined') {
    throw new Error("This export module requires jsPDF be initiated prior to this script\nhttps://github.com/parallax/jsPDF");
}

function saveAsImg(el) {
    html2canvas(el, {
        scale: 2
    }).then(canvas => {
        const image = canvas.toDataURL();

        const link = document.createElement("a");
        link.href = image;
        link.download = "schedule";
        link.click();
        link.remove();
    });
}

function saveAsPDF(el) {
    const doc = new jsPDF("p", "pt", "a4");
    html2canvas(el).then(function(canvas) {
        const imgData = canvas.toDataURL("image/png");
        doc.addImage(imgData, "PNG", 0, 0);
        doc.save("schedule.pdf");
    });
}

function print(el) {
    const popup = window.open("", "printdialog", "height=400,width=600");
    popup.document.write(`
    <html>
    <head>
        <title>Schedule</title>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" />
        <link rel="stylesheet" type="text/css" href="public.css" />
    </head>
    <body>
    ${el.innerHTML}
    </body>
    `);
    popup.document.close();
    popup.focus();
    window.setTimeout(() => {
        popup.print();
        popup.close();
    }, 1500);

    return;
}