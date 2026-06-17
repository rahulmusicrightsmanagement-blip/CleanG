"""Header normalization and a domain synonym dictionary for music metadata.

The synonym groups are the single most important piece of the auto-mapper:
they let us match columns that are semantically equal but share no characters
(e.g. input "Artist Name" -> master "Singer", "Lyric Writer" -> "Lyricist").
"""

import re

_NON_ALNUM = re.compile(r"[^a-z0-9]+")
# Split camelCase / letter-digit boundaries: "AlbumName" -> "Album Name",
# "ISRC2" -> "ISRC 2", so headers without separators still tokenize cleanly.
_CAMEL = re.compile(r"(?<=[a-z])(?=[A-Z])|(?<=[A-Za-z])(?=[0-9])|(?<=[0-9])(?=[A-Za-z])")

# Tiny domain stopword list — noise words that shouldn't drive a match on their own.
_STOPWORDS = {"the", "of", "a", "an", "name", "no", "number", "code", "id"}


def normalize(header: str) -> str:
    """Lowercase, split camelCase, drop punctuation, collapse whitespace."""
    if header is None:
        return ""
    text = _CAMEL.sub(" ", str(header).strip())
    text = _NON_ALNUM.sub(" ", text.lower())
    return " ".join(text.split())


def singularize(token: str) -> str:
    """Crude plural -> singular so "singers"/"artists" match "singer"/"artist"."""
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 4 and token.endswith("ses"):
        return token[:-2]
    if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token


def tokenize(header: str) -> set[str]:
    return {singularize(t) for t in normalize(header).split()}


def content_tokens(header: str) -> set[str]:
    """Meaningful tokens only (stopwords removed) for similarity scoring."""
    return {t for t in tokenize(header) if t not in _STOPWORDS}


# Each master column maps to a set of alternative phrases an input file might use.
# Keys are the canonical master column names exactly as they appear in the
# master output format. Values are extra synonyms (the canonical name itself is
# always included automatically).
SYNONYMS: dict[str, list[str]] = {
    "Record #": ["record number", "record no", "rec no", "sr no", "serial no",
                 "sl no", "s no", "srno", "record", "sno", "row number"],
    "Label": ["record label", "label name"],
    "ISRC": ["isrc code", "isrc no", "isrc number"],
    "Date Submitted": ["submitted date", "submission date", "submitted on",
                       "date of submission", "submit date"],
    "UPC": ["upc code", "ean", "barcode", "upc ean", "ean code"],
    "Album cat. No.": ["album catalog number", "album cat no", "catalog no",
                       "catalogue no", "cat no", "album catalogue number",
                       "album catalog no", "catalog number"],
    "Album Name": ["album", "album title"],
    "Track Name": ["track", "song name", "song title", "title", "song",
                   "track title"],
    "Release Date": ["release dt", "date of release", "released on", "release"],
    "Singer": ["artist", "artist name", "vocalist", "performer", "singer name",
               "singers", "artists", "vocal artist"],
    "Audio Duration (mm:sec)": ["duration", "audio duration", "track duration",
                                "length", "audio length", "runtime",
                                "song duration"],
    "Content Type": ["content"],
    "Vocal / Instrumental": ["vocal instrumental", "vocal or instrumental",
                             "vocals instrumental"],
    "Language": ["lang"],
    "Genre": ["genres", "music genre"],
    "Lyricist": ["lyric writer", "lyrics writer", "lyrics", "lyric",
                 "written by", "penned by", "writer", "lyricists",
                 "lyrics by", "lyric by"],
    "Composer": ["music composer", "composed by", "music director", "composers",
                 "music", "composition"],
    "Territory Rights": ["territory", "rights territory", "territory right",
                         "rights"],
    "God Name": ["deity", "deity name", "god"],
    "Audio folder (path)": ["audio folder", "audio path", "audio file path",
                            "audio folder path"],
    "JPG folder (path)": ["jpg folder", "image folder", "artwork folder",
                          "jpg path", "image path", "jpg folder path",
                          "artwork path", "cover folder"],
    "LRC File (path)": ["lrc file", "lrc path", "lyric file", "lrc"],
    "Lyrical Video (path)": ["lyrical video", "lyric video", "video path",
                             "lyrical video path"],
    "Go Live Date": ["golive date", "live date", "go live", "golive",
                     "go live dt"],
    "Revenue Share": ["rev share", "revenue sharing", "royalty share"],
    "Revenue Split": ["rev split", "revenue splitting", "royalty split"],
    "Distributor": ["distribution", "distributed by"],
    "Territory Restriction": ["territory restrictions", "restricted territory",
                              "territory restrict"],
    "Lead Artist": ["primary artist", "main artist", "featured artist",
                    "lead singer", "lead", "feat artist"],
    "Agreement No.": ["agreement number", "contract no", "contract number",
                      "agreement", "agreement no"],
}


def synonym_set(master_column: str) -> set[str]:
    """Normalized set of accepted phrases for a master column (incl. itself)."""
    phrases = [master_column] + SYNONYMS.get(master_column, [])
    return {normalize(p) for p in phrases}


def synonym_tokens(master_column: str) -> set[str]:
    """Every meaningful token across a master column's name + all its synonyms.

    This is what lets a fuzzy header like "Artist Names" light up "Singer": the
    expanded token pool for Singer contains {singer, artist, vocalist, performer},
    so the input tokens find a strong per-word match even with no exact phrase.
    """
    toks: set[str] = set()
    for phrase in [master_column] + SYNONYMS.get(master_column, []):
        toks |= content_tokens(phrase)
    return toks
