/**
 * @typedef {Object} Course
 * @prop {string} ID Course section with leading zeroes.
 * @prop {string} teacher Course teacher.
 * @prop {[string, string, string][]} schedule Array of class schedules. Each element is an array containing: \
 * `[0]` Day of the week ("M", "T", "W", "R", "F") \
 * `[1]` Start time in HHMM format ("1300") \
 * `[2]` End time in HHMM format ("1430")
 * @prop {boolean} [intensive=true] If the course is intensive. 
 */