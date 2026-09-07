"""
Time utilities for NammaRoute AI.
All user-facing times use IST (Asia/Kolkata, UTC+5:30).
"""
from datetime import datetime, timezone, timedelta

_IST_OFFSET = timedelta(hours=5, minutes=30)
_IST = timezone(_IST_OFFSET)


def now_ist() -> datetime:
    """Return current datetime in IST."""
    return datetime.now(_IST)


def now_iso_ist() -> str:
    return now_ist().isoformat()


def current_date_label() -> str:
    """E.g. '5 September 2026'"""
    dt = now_ist()
    return dt.strftime("%d %B %Y").lstrip("0")


def current_time_label() -> str:
    """E.g. '14:35 IST'"""
    dt = now_ist()
    return dt.strftime("%H:%M IST")


def current_datetime_label() -> str:
    """E.g. '5 September 2026, 14:35 IST'"""
    return f"{current_date_label()}, {current_time_label()}"


def is_peak_hour() -> bool:
    """True if it's morning (8-10) or evening (18-20) peak."""
    h = now_ist().hour
    return (8 <= h < 10) or (18 <= h < 20)


def peak_label() -> str:
    h = now_ist().hour
    if 8 <= h < 10:
        return "Morning Peak"
    if 18 <= h < 20:
        return "Evening Peak"
    if 6 <= h < 8 or 10 <= h < 12:
        return "Off-Peak (Morning)"
    if 12 <= h < 15:
        return "Midday Off-Peak"
    if 15 <= h < 18:
        return "Afternoon"
    if 20 <= h < 23:
        return "Evening Off-Peak"
    return "Night / Off-Peak"
