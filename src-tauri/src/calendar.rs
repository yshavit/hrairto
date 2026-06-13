//! Fiscal-calendar math: converting timestamps to quarters and vice versa.
//!
//! All timezone-aware date arithmetic uses `chrono-tz` so there is one
//! authoritative implementation that both the app and any future CLI can share.
//! The TypeScript layer receives precomputed [`QuarterDisplay`] values and never
//! needs to perform fiscal-calendar math itself.

use chrono::{Datelike, NaiveDate, TimeZone, Utc};
use chrono_tz::Tz;

use crate::models::stored::{Calendar, Epoch};
use crate::models::views::QuarterDisplay;

fn parse_tz(calendar: &Calendar) -> Result<Tz, String> {
    crate::models::stored::parse_timezone(&calendar.timezone)
}

// UTC timestamp (ms) for local midnight on the 1st of a calendar month.
//
// Uses `.earliest()` to handle the (rare) case where DST falls on the 1st:
// if the clock is ambiguous we take the earlier of the two possible midnights;
// if the clock skips over midnight (no such instant exists) we panic, which
// would only happen in a timezone where the government moves clocks forward
// by exactly 24 h at midnight on the 1st—an event with no real-world precedent.
fn start_of_month(cal_year: i32, cal_month: u32, tz: Tz) -> Epoch {
    let naive = NaiveDate::from_ymd_opt(cal_year, cal_month, 1)
        .expect("quarter boundary dates are always valid")
        .and_hms_opt(0, 0, 0)
        .expect("midnight is always a valid time");
    Epoch(
        tz.from_local_datetime(&naive)
            .earliest()
            .expect("midnight on the 1st of a month exists in all real-world timezones")
            .timestamp_millis(),
    )
}

// Calendar month/year of the first day of a fiscal quarter.
fn quarter_start_date(fiscal_year: i32, quarter: u8, qsm: u8) -> (i32, u32) {
    let month_index = (qsm as u32 - 1) + (quarter as u32 - 1) * 3;
    (fiscal_year + (month_index / 12) as i32, month_index % 12 + 1)
}

// English-only for now. When i18n is added, pass calendar.locale here and use
// an ICU-based formatter instead of this static lookup.
fn month_abbr(month: u32) -> &'static str {
    [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ][(month - 1) as usize]
}

/// Return the [`QuarterDisplay`] for a specific fiscal quarter and year.
pub fn quarter_info(quarter: u8, fiscal_year: u32, calendar: &Calendar) -> Result<QuarterDisplay, String> {
    let tz = parse_tz(calendar)?;
    let qsm = calendar.quarter_start_month;

    let (s_year, s_month) = quarter_start_date(fiscal_year as i32, quarter, qsm);
    let start_at = start_of_month(s_year, s_month, tz);

    let (next_q, next_y) = if quarter < 4 {
        (quarter + 1, fiscal_year)
    } else {
        (1, fiscal_year + 1)
    };
    let (e_year, e_month) = quarter_start_date(next_y as i32, next_q, qsm);
    let end_at = start_of_month(e_year, e_month, tz);

    // Third month of the quarter (for "Apr–Jun" range in the label)
    let m3_month = (s_month - 1 + 2) % 12 + 1;
    let label = format!("Q{quarter} · {}–{}", month_abbr(s_month), month_abbr(m3_month));

    Ok(QuarterDisplay {
        quarter,
        year: fiscal_year,
        label,
        start_at,
        end_at,
    })
}

/// Return the [`QuarterDisplay`] for the fiscal quarter that contains `timestamp`.
pub fn quarter_for_timestamp(timestamp: Epoch, calendar: &Calendar) -> Result<QuarterDisplay, String> {
    let tz = parse_tz(calendar)?;
    let dt = Utc
        .timestamp_millis_opt(timestamp.0)
        .single()
        .ok_or_else(|| format!("invalid timestamp: {}", timestamp.0))?
        .with_timezone(&tz);

    let cal_year = dt.year();
    let cal_month = dt.month() as u8;
    let qsm = calendar.quarter_start_month;

    // monthOffset 0–11: distance (in months) from the fiscal year start
    let month_offset = (cal_month + 12 - qsm) % 12;
    let quarter = month_offset / 3 + 1;

    // Fiscal year = calendar year in which fiscal Q1 begins.
    // If the current calendar month precedes the fiscal year start, we're still
    // in the previous fiscal year.
    let fiscal_year = if cal_month < qsm { cal_year - 1 } else { cal_year } as u32;

    quarter_info(quarter, fiscal_year, calendar)
}

/// Return an ordered list of quarters centred on `now`, suitable for the
/// scrolling strip. The result contains `past_count + 1 + future_count` entries.
pub fn quarters_to_display(
    calendar: &Calendar,
    now: Epoch,
    past_count: usize,
    future_count: usize,
) -> Result<Vec<QuarterDisplay>, String> {
    let current = quarter_for_timestamp(now, calendar)?;
    // Convert (year, quarter) to a monotonic index so stepping is simple arithmetic.
    let base = current.year as i32 * 4 + (current.quarter as i32 - 1);
    let total = past_count + 1 + future_count;

    (0..total)
        .map(|i| {
            let idx = base - past_count as i32 + i as i32;
            // div_euclid / rem_euclid give correct results for negative idx
            let y = idx.div_euclid(4) as u32;
            let q = (idx.rem_euclid(4) + 1) as u8;
            quarter_info(q, y, calendar)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::stored::{Calendar, CalendarId};
    use chrono::{TimeZone, Utc};
    use uuid::Uuid;

    fn utc_cal(qsm: u8) -> Calendar {
        Calendar {
            id: CalendarId(Uuid::nil()),
            name: "Test".to_string(),
            quarter_start_month: qsm,
            timezone: "UTC".to_string(),
            locale: "en-US".to_string(),
        }
    }

    // Epoch for midnight UTC on a given date.
    fn ms(year: i32, month: u32, day: u32) -> Epoch {
        Epoch(
            Utc.with_ymd_and_hms(year, month, day, 0, 0, 0)
                .single()
                .expect("valid date")
                .timestamp_millis(),
        )
    }

    // --- quarter_for_timestamp: standard calendar year ---

    #[test]
    fn standard_calendar_four_quarters() {
        let cal = utc_cal(1);
        let cases = [(1, 15, 1), (4, 15, 2), (7, 15, 3), (10, 15, 4)];
        for (month, day, expected_q) in cases {
            let q = quarter_for_timestamp(ms(2025, month, day), &cal).unwrap();
            assert_eq!(q.quarter, expected_q, "month {month}");
            assert_eq!(q.year, 2025, "month {month}");
        }
    }

    // --- quarter_for_timestamp: February fiscal year ---

    #[test]
    fn february_fiscal_basic_quarters() {
        let cal = utc_cal(2);
        assert_eq!(quarter_for_timestamp(ms(2025, 2, 15), &cal).unwrap().quarter, 1);
        assert_eq!(quarter_for_timestamp(ms(2025, 5, 15), &cal).unwrap().quarter, 2);
        assert_eq!(quarter_for_timestamp(ms(2025, 8, 15), &cal).unwrap().quarter, 3);
        assert_eq!(quarter_for_timestamp(ms(2025, 11, 15), &cal).unwrap().quarter, 4);
    }

    #[test]
    fn january_is_q4_of_previous_fiscal_year() {
        // Jan 2026 is fiscal Q4 of FY2025 (Q4 = Nov 2025 – Jan 2026)
        let q = quarter_for_timestamp(ms(2026, 1, 15), &utc_cal(2)).unwrap();
        assert_eq!(q.quarter, 4);
        assert_eq!(q.year, 2025);
    }

    // --- quarter boundary edge cases ---

    #[test]
    fn last_ms_of_q1_is_still_q1() {
        let cal = utc_cal(1);
        let last_ms_of_q1 = Epoch(ms(2025, 4, 1).0 - 1);
        let q = quarter_for_timestamp(last_ms_of_q1, &cal).unwrap();
        assert_eq!(q.quarter, 1);
        assert_eq!(q.year, 2025);
    }

    #[test]
    fn first_ms_of_q2_is_q2() {
        let q = quarter_for_timestamp(ms(2025, 4, 1), &utc_cal(1)).unwrap();
        assert_eq!(q.quarter, 2);
        assert_eq!(q.year, 2025);
    }

    #[test]
    fn last_ms_of_q4_is_not_next_year() {
        let last_ms_of_q4 = Epoch(ms(2026, 1, 1).0 - 1);
        let q = quarter_for_timestamp(last_ms_of_q4, &utc_cal(1)).unwrap();
        assert_eq!(q.quarter, 4);
        assert_eq!(q.year, 2025);
    }

    // --- year rollover ---

    #[test]
    fn year_rollover_standard() {
        let cal = utc_cal(1);
        let q4 = quarter_for_timestamp(ms(2025, 12, 31), &cal).unwrap();
        let q1 = quarter_for_timestamp(ms(2026, 1, 1), &cal).unwrap();
        assert_eq!((q4.quarter, q4.year), (4, 2025));
        assert_eq!((q1.quarter, q1.year), (1, 2026));
    }

    #[test]
    fn year_rollover_february_fiscal() {
        // FY2025 Q4 ends Jan 31 2026; FY2026 Q1 starts Feb 1 2026
        let cal = utc_cal(2);
        let q4 = quarter_for_timestamp(ms(2026, 1, 31), &cal).unwrap();
        let q1 = quarter_for_timestamp(ms(2026, 2, 1), &cal).unwrap();
        assert_eq!((q4.quarter, q4.year), (4, 2025));
        assert_eq!((q1.quarter, q1.year), (1, 2026));
    }

    // --- quarter_info boundaries and labels ---

    #[test]
    fn standard_q1_boundaries() {
        let q = quarter_info(1, 2025, &utc_cal(1)).unwrap();
        assert_eq!(q.start_at.0, ms(2025, 1, 1).0);
        assert_eq!(q.end_at.0, ms(2025, 4, 1).0);
    }

    #[test]
    fn consecutive_quarters_share_boundary() {
        let cal = utc_cal(1);
        let q1 = quarter_info(1, 2025, &cal).unwrap();
        let q2 = quarter_info(2, 2025, &cal).unwrap();
        let q4 = quarter_info(4, 2025, &cal).unwrap();
        let q1_next = quarter_info(1, 2026, &cal).unwrap();
        assert_eq!(q1.end_at.0, q2.start_at.0);
        assert_eq!(q4.end_at.0, q1_next.start_at.0);
    }

    #[test]
    fn february_fiscal_q4_boundaries() {
        // Q4 FY2025 = Nov 1 2025 – Feb 1 2026 (exclusive)
        let q = quarter_info(4, 2025, &utc_cal(2)).unwrap();
        assert_eq!(q.start_at.0, ms(2025, 11, 1).0);
        assert_eq!(q.end_at.0, ms(2026, 2, 1).0);
    }

    #[test]
    fn quarter_labels() {
        assert_eq!(quarter_info(1, 2025, &utc_cal(1)).unwrap().label, "Q1 · Jan–Mar");
        assert_eq!(quarter_info(2, 2025, &utc_cal(1)).unwrap().label, "Q2 · Apr–Jun");
        // Q4 of February fiscal spans Nov–Jan
        assert_eq!(quarter_info(4, 2025, &utc_cal(2)).unwrap().label, "Q4 · Nov–Jan");
    }

    // --- quarters_to_display ---

    #[test]
    fn display_count_and_chronological_order() {
        let now = ms(2025, 6, 15);
        let quarters = quarters_to_display(&utc_cal(1), now, 1, 2).unwrap();
        assert_eq!(quarters.len(), 4);
        for i in 1..quarters.len() {
            assert!(quarters[i].start_at.0 > quarters[i - 1].start_at.0);
        }
    }

    #[test]
    fn consecutive_display_quarters_share_boundary() {
        let now = ms(2025, 6, 15);
        let quarters = quarters_to_display(&utc_cal(1), now, 1, 3).unwrap();
        for i in 1..quarters.len() {
            assert_eq!(quarters[i].start_at.0, quarters[i - 1].end_at.0);
        }
    }

    #[test]
    fn current_quarter_is_at_past_count_index() {
        let now = ms(2025, 6, 15); // Q2 2025
        let past_count = 1;
        let quarters = quarters_to_display(&utc_cal(1), now, past_count, 2).unwrap();
        let current = &quarters[past_count];
        assert!(now.0 >= current.start_at.0);
        assert!(now.0 < current.end_at.0);
    }
}
