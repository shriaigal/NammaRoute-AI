"""
Prediction Service - AI demand / crowd predictions.

These are PREDICTIONS based on available time/day signals — not live
crowd measurements. They are clearly labelled as AI PREDICTION.
"""
from utils.time_utils import now_ist, peak_label, is_peak_hour, current_datetime_label
from services.ai_service import ai_service


def _time_signals() -> dict:
    now = now_ist()
    return {
        "current_datetime": current_datetime_label(),
        "hour": now.hour,
        "day_of_week": now.strftime("%A"),
        "is_weekend": now.weekday() >= 5,
        "peak_period": peak_label(),
        "is_peak_hour": is_peak_hour(),
    }


def predict_station_demand(station_name: str, station_code: str,
                           line: str) -> dict:
    """
    Return an AI demand prediction for a specific station.
    Clearly labelled as a PREDICTION — not live measurement.
    """
    signals = _time_signals()

    context = {
        "intent": "DEMAND_PREDICTION",
        "station_name": station_name,
        "station_code": station_code,
        "line": line,
        **signals,
        "note": (
            "You are generating an AI demand PREDICTION based on time signals. "
            "There is NO live crowd data available. "
            "Base your prediction on general knowledge of metro usage patterns "
            "(peak vs off-peak, weekday vs weekend). "
            "Clearly label this as an AI PREDICTION. "
            "Never claim this is a live crowd measurement. "
            "Be brief (2-3 sentences)."
        ),
    }

    fallback = _rule_based_demand(station_name, signals)

    if not ai_service.is_configured():
        return {
            "type": "ai_prediction",
            "station": station_name,
            "prediction": fallback,
            "confidence": "low",
            "signals": signals,
            "disclaimer": "AI PREDICTION — not live crowd data. No AI configured.",
        }

    question = (
        f"Based on the current time ({signals['current_datetime']}), "
        f"what is the expected demand level at {station_name} metro station "
        f"on the {line}? This is during {signals['peak_period']}."
    )

    result = ai_service.safe_call(
        user_message=question,
        context_facts=context,
        web_access=False,
        fallback_text=fallback,
    )

    return {
        "type": "ai_prediction",
        "station": station_name,
        "prediction": result["answer"],
        "confidence": "medium" if result["source"] == "rapidapi" else "low",
        "signals": signals,
        "disclaimer": (
            "AI PREDICTION — based on time-of-day and day-of-week signals. "
            "Not a live crowd measurement."
        ),
    }


def predict_network_demand() -> dict:
    """Return a general network demand prediction."""
    signals = _time_signals()
    fallback = _rule_based_network_demand(signals)

    if not ai_service.is_configured():
        return {
            "type": "ai_prediction",
            "prediction": fallback,
            "signals": signals,
            "disclaimer": "AI PREDICTION — not live ridership data.",
        }

    context = {
        "intent": "NETWORK_DEMAND_PREDICTION",
        **signals,
        "note": (
            "Generate a brief Namma Metro network demand prediction "
            "based on the current time signals. "
            "Cover all three lines (Purple, Green, Yellow). "
            "Clearly label as AI PREDICTION. 3-4 sentences max."
        ),
    }

    question = (
        f"What is the expected overall demand for Namma Metro "
        f"right now ({signals['current_datetime']}, {signals['peak_period']})?"
    )

    result = ai_service.safe_call(
        user_message=question,
        context_facts=context,
        web_access=False,
        fallback_text=fallback,
    )

    return {
        "type": "ai_prediction",
        "prediction": result["answer"],
        "signals": signals,
        "disclaimer": (
            "AI PREDICTION — based on time-of-day signals. "
            "Not live ridership data."
        ),
    }


def _rule_based_demand(station_name: str, signals: dict) -> str:
    if signals["is_peak_hour"]:
        level = "high"
        tip = "Consider waiting 15-20 minutes for a less crowded train if possible."
    elif signals["is_weekend"]:
        level = "moderate"
        tip = "Weekend traffic is generally lighter than weekday peak hours."
    else:
        level = "moderate to low"
        tip = "Off-peak hours typically offer a more comfortable journey."

    return (
        f"AI PREDICTION: Based on the current time ({signals['peak_period']}), "
        f"demand at {station_name} is expected to be {level}. "
        f"{tip} "
        f"(This is an AI prediction based on time-of-day patterns — "
        f"not live crowd data.)"
    )


def _rule_based_network_demand(signals: dict) -> str:
    if signals["is_peak_hour"]:
        return (
            f"AI PREDICTION: During {signals['peak_period']}, demand is expected "
            "to be high across all three Namma Metro lines. Interchange stations "
            "(Majestic, RV Road) typically see the highest footfall. "
            "(Not live ridership data.)"
        )
    if signals["is_weekend"]:
        return (
            "AI PREDICTION: Weekend demand is generally moderate. "
            "Shopping and entertainment hubs like MG Road and Indiranagar may "
            "see higher footfall in the afternoon. (Not live ridership data.)"
        )
    return (
        f"AI PREDICTION: During off-peak hours ({signals['peak_period']}), "
        "Namma Metro demand is expected to be moderate. "
        "Journey times are typically more comfortable outside peak hours. "
        "(Not live ridership data.)"
    )
