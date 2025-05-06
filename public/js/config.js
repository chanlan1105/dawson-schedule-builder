/** Array of different colours recognized by UI */
export const colours = ["red", "blue", "green", "orange", "purple", "teal", "brown", "crimson", "indigo", "cyan", "stone"];

/** Regex to find complementary courses by course code */
export const complementaryRegex = /[A-Z0-9]{3}-B[XW][ACLMPSTX]-(?:03|DW)/;

export const courseSchedule_key = "lucas/courseSchedule";
export const schedules_key = "lucas/schedule/list";
export const semester_key = "lucas/schedule/sem";

export const current_semester = "W2025"; // <-- UPDATE HERE FOR NEW SEMESTERS
export const last_semester = "W2024-B"; // <-- AND HERE