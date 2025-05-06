
/**
 * Checks if a given course schedule conflicts with already selected courses
 * @param {Array} schedule The course schedule, as defined in JSON data
 * @returns {boolean}
 */
export function checkConflict(schedule) {
    for (let i in schedule) {
        const conflict = $(`#${schedule[i][0].toLowerCase()}${schedule[i][1]}`).nextUntil(`#${schedule[i][0].toLowerCase()}${schedule[i][2]}`).addBack().filter(".blocked");

        if (conflict.length) return true;
    }
    return false;
}

/**
 * Finds all timeslots that conflict with a given course schedule.
 * @param {Array} schedule The course schedule, as defined in JSON data.
 * @returns {Array} globalConflict Timeslots that conflict with the given course schedule
 */
export function findConflict(schedule) {
    let globalConflict = [];
    for (let i in schedule) {
        const conflict = $(`#${schedule[i][0].toLowerCase()}${schedule[i][1]}`).nextUntil(`#${schedule[i][0].toLowerCase()}${schedule[i][2]}`).addBack().filter(".blocked");
        globalConflict.push(...conflict);
    }
    return globalConflict;
}