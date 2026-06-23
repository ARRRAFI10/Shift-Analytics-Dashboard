import hashlib

from django.conf import settings


def color_for_category(name: str) -> str:
    """Map a category name onto the configured palette deterministically.

    A stable hash (not Python's salted hash()) keeps the colour identical across
    processes and runs, so a reason always renders the same and brand-new reasons
    pick up a colour without any code change.
    """
    palette = settings.CATEGORY_COLOR_PALETTE
    digest = hashlib.md5(name.strip().lower().encode("utf-8")).hexdigest()
    return palette[int(digest, 16) % len(palette)]
