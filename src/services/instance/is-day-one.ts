/** SQL expression for isDayOne; requires `activity_definition` and `av` (activity_version) aliases. */
export const sqlIsDayOne = (instanceAlias = "instance") => `(CASE
    WHEN activity_definition.path = 'pantheon' THEN
        ${instanceAlias}.date_completed < (
            COALESCE(av.release_date_override, activity_definition.release_date) + INTERVAL '1 day'
        )
    ELSE
        ${instanceAlias}.date_completed < COALESCE(activity_definition.day_one_end, TIMESTAMP 'epoch')
END)`

export const SQL_IS_PANTHEON = `(activity_definition.path = 'pantheon')`

/** @deprecated Use sqlIsDayOne() */
export const SQL_IS_DAY_ONE = sqlIsDayOne()
