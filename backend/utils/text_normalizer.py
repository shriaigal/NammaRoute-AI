"""
Text normalisation and fuzzy station-name matching.

Implements the typo / alias resolution required by the specification:
  "white field" → Whitefield (Kadugodi)
  "jallahalli"  → Jalahalli
  "majestic"    → Nadaprabhu Kempegowda Station, Majestic
  etc.
"""
import re
import unicodedata

# ── Known alias mappings ───────────────────────────────────────────────────────
# Maps lower-case alias → fragment that appears in the official station_name
STATION_ALIASES: dict[str, str] = {
    # Majestic / KSR / KGWA
    "majestic":                    "kempegowda station, majestic",
    "kempegowda majestic":         "kempegowda station, majestic",
    "kempegowda station":          "kempegowda station, majestic",
    "nadaprabhu kempegowda":       "kempegowda station, majestic",
    "kgwa":                        "kempegowda station, majestic",

    # KSR / City Railway Station
    "city railway station":        "krantivira sangolli rayanna",
    "ksr station":                 "krantivira sangolli rayanna",
    "ksr":                         "krantivira sangolli rayanna",

    # KR Market
    "kr market":                   "krishna rajendra market",
    "k r market":                  "krishna rajendra market",
    "krmarket":                    "krishna rajendra market",

    # Vidhana Soudha
    "vidhana soudha":              "vidhana soudha",
    "vidhanasoudha":               "vidhana soudha",

    # MG Road
    "mg road":                     "mahatma gandhi road",
    "mgroad":                      "mahatma gandhi road",

    # Whitefield / Kadugodi
    "whitefield":                  "whitefield (kadugodi)",
    "white field":                 "whitefield (kadugodi)",
    "whitefield metro":            "whitefield (kadugodi)",
    "white field metro":           "whitefield (kadugodi)",
    "whitefield station":          "whitefield (kadugodi)",
    "white field station":         "whitefield (kadugodi)",
    "kadugodi":                    "whitefield (kadugodi)",

    # Jalahalli
    "jalahalli":                   "jalahalli",
    "jallahalli":                  "jalahalli",
    "jalahali":                    "jalahalli",
    "jallahali":                   "jalahalli",
    "jalhalli":                    "jalahalli",

    # KR Pura
    "kr pura":                     "krishnarajapura",
    "k.r.pura":                    "krishnarajapura",
    "kr puram":                    "krishnarajapura",
    "krpura":                      "krishnarajapura",

    # RV Road
    "rv road":                     "rashtreeya vidyalaya road",
    "rvroad":                      "rashtreeya vidyalaya road",
    "ragi gudda":                  "ragigudda",
    "ragigudda":                   "ragigudda",

    # Silk Board
    "silk board":                  "central silk board",
    "silkboard":                   "central silk board",

    # Central College
    "central college":             "visvesvaraya stn., central college",

    # Jayadeva
    "jayadeva":                    "jayadeva hospital",

    # Electronic City
    "electronic city":             "electronic city",
    "ecity":                       "electronic city",

    # Ragi Gudda / Ragigudda
    "ragi gudda":                  "ragigudda",

    # Bommasandra
    "bommasandra":                 "bommasandra",

    # Hoodi
    "hoodi":                       "hoodi",

    # Baiyappanahalli
    "baiyappanahalli":             "baiyappanahalli",
    "byappanahalli":               "baiyappanahalli",
    "bypl":                        "baiyappanahalli",

    # Yeshwanthpur
    "yeshwanthpur":                "yeshwanthpur",
    "yeshvanthpur":                "yeshwanthpur",

    # Lalbagh
    "lalbagh":                     "lalbagh",
    "lalbaugh":                    "lalbagh",
}

# Words to strip before matching
NOISE_WORDS = {
    "station", "metro", "stn", "please", "the", "to", "from", "a", "an",
    "namma", "stop", "halt",
}


def normalize(text: str) -> str:
    """Lower-case, ASCII-fold, collapse whitespace, strip trailing punctuation."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[?.!,;:\"']+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_query(text: str) -> str:
    """Normalize then strip leading/trailing noise words."""
    words = normalize(text).split()
    while words and words[0] in NOISE_WORDS:
        words.pop(0)
    while words and words[-1] in NOISE_WORDS:
        words.pop()
    return " ".join(words)


def apply_aliases(query: str) -> str:
    """Expand known aliases. Returns the alias target (still lower-case fragment)."""
    q = clean_query(query)
    if q in STATION_ALIASES:
        return STATION_ALIASES[q]
    # try longer prefixes / infixes
    for alias, target in STATION_ALIASES.items():
        if alias in q:
            return target
    return q


def word_tokens(text: str) -> set[str]:
    return set(normalize(text).split())


def _edit_distance(a: str, b: str) -> int:
    """Simple Levenshtein distance."""
    if len(a) > len(b):
        a, b = b, a
    prev = list(range(len(a) + 1))
    for j, cb in enumerate(b):
        curr = [j + 1]
        for i, ca in enumerate(a):
            curr.append(min(prev[i + 1] + 1, curr[-1] + 1,
                            prev[i] + (0 if ca == cb else 1)))
        prev = curr
    return prev[-1]


def find_station_matches(query: str, stations: list[dict]) -> list[dict]:
    """
    Return an ordered list of station dicts that match *query*.

    Priority:
      1. Exact code match
      2. Exact name match (normalized)
      3. Alias expansion → exact name match
      4. Substring containment (query in name or name in query)
      5. Word-overlap ≥ 50 %
      6. Edit-distance ≤ 2 on individual words (typo tolerance)

    Each tier is exhausted before the next is tried.
    An empty list means "no match at all".
    A list with 2+ entries means "ambiguous".
    """
    if not query or not query.strip():
        return []

    q_raw = normalize(query)
    q_clean = clean_query(query)
    q_alias = apply_aliases(query)

    # ── Tier 1: exact station code ────────────────────────────────────────────
    code_matches = [
        s for s in stations
        if s["station_code"].lower() == q_raw
    ]
    if code_matches:
        return code_matches

    # ── Tier 2: exact name (normalized) ──────────────────────────────────────
    exact = [
        s for s in stations
        if normalize(s["station_name"]) == q_raw
        or normalize(s["station_name"]) == q_clean
        or normalize(s["station_name"]) == q_alias
    ]
    if exact:
        return exact

    # ── Tier 3: alias resolves to exact name substring ────────────────────────
    alias_matches = [
        s for s in stations
        if q_alias and q_alias in normalize(s["station_name"])
    ]
    if len(alias_matches) == 1:
        return alias_matches
    if len(alias_matches) > 1:
        # tighten: prefer word-boundary containment
        tight = [
            s for s in alias_matches
            if re.search(r"\b" + re.escape(q_alias) + r"\b",
                         normalize(s["station_name"]))
        ]
        if tight:
            return tight if len(tight) == 1 else alias_matches

    # ── Tier 4: substring containment ────────────────────────────────────────
    substr = [
        s for s in stations
        if q_clean in normalize(s["station_name"])
        or (len(q_clean) > 3 and normalize(s["station_name"]) in q_clean)
    ]
    if len(substr) == 1:
        return substr
    if len(substr) > 1:
        # prefer tighter word-boundary matches
        tight = [
            s for s in substr
            if re.search(r"\b" + re.escape(q_clean) + r"\b",
                         normalize(s["station_name"]))
        ]
        if len(tight) == 1:
            return tight
        return substr if substr else alias_matches

    # ── Tier 5: word overlap ≥ 50 % ──────────────────────────────────────────
    q_words = word_tokens(q_clean) - NOISE_WORDS
    if q_words:
        overlap_matches = []
        for s in stations:
            name_words = word_tokens(s["station_name"]) - NOISE_WORDS
            if not name_words:
                continue
            common = q_words & name_words
            ratio = len(common) / min(len(q_words), len(name_words))
            if ratio >= 0.5:
                overlap_matches.append((ratio, s))
        if overlap_matches:
            # return the best match(es)
            best_ratio = max(r for r, _ in overlap_matches)
            best = [s for r, s in overlap_matches if r == best_ratio]
            if len(best) == 1:
                return best
            if len(best) > 1:
                return best

    # ── Tier 6: edit-distance tolerance on individual query words ─────────────
    q_words = [w for w in normalize(q_clean).split() if len(w) >= 3]
    if q_words:
        typo_matches = []
        for s in stations:
            name_words = [w for w in normalize(s["station_name"]).split()
                          if len(w) >= 3]
            for qw in q_words:
                for nw in name_words:
                    dist = _edit_distance(qw, nw)
                    # allow 1 edit per 4 chars, max 2
                    threshold = min(2, max(1, len(qw) // 4))
                    if dist <= threshold:
                        typo_matches.append(s)
                        break
                else:
                    continue
                break
        unique_typo = list({s["station_code"]: s for s in typo_matches}.values())
        if len(unique_typo) == 1:
            return unique_typo
        if len(unique_typo) > 1:
            return unique_typo

    return []
