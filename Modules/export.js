if (typeof html2canvas == 'undefined') {
    throw new Error("This export module requires html2canvas be initiated prior to this script\nhttps://html2canvas.hertzen.com/");
}

var Canvas;
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