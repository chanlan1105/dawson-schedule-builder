function exportSchedule(type) {
    switch (type) {
        case "img" :
            confirm("Exclude intensive courses? (Recommended: Yes)").then(res => {
                if (res) $("#schedule-intensives, #schedule-intensives-header").hide();

                // Prep elements for export to image
                $("main").addClass("export");
                saveAsImg($("main")[0]);

                // Return elements to their original state
                $("main").removeClass("export");
                $("#schedule-intensives, #schedule-intensives-header").show();
            });
            
            break;
        
        case "pdf" :
            return alert("This function is not been fully developed. You can save your schedule as a PDF by selecting the \"Print\" option, and choosing \"Save as PDF\" from the print dialog box.");

            // Prep elements for export
            $("#schedule").addClass("export");
            saveAsPDF($("#schedule")[0]);

            // Return elements to their original state
            $("#schedule").removeClass("export");
            break;

        case "print" :
            // Prep elements for export
            $("main").addClass("export");
            $("#course-options-sidebar, .course-delete, #schedule-course-list").hide();
            print($("main")[0]);

            // Return elements to their original state
            $("main").removeClass("export");
            $("#course-options-sidebar, .course-delete, #schedule-course-list").show();
            break;
    }
}

$("#export-img-btn").on("click", () => exportSchedule("img"));
$("#export-print-btn").on("click", () => exportSchedule("print"));