from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, True),
    SECRET_KEY=(str, "dev-insecure-change-me"),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    DATA_FILE_PATH=(str, "data/shift_data.xlsx"),
    DISPLAY_TIMEZONE=(str, "UTC"),
    HOURS_TOLERANCE=(float, 0.1),
    MAX_SHIFT_HOURS=(float, 16.0),
    STREAK_TARGET_CATEGORY=(str, "Breakdown"),
    MIN_STREAK_DAYS=(int, 2),
    NON_PRODUCTIVE_CATEGORIES=(list, ["Breakdown", "Unknown Failure"]),
    MAX_RETAINED_DATASETS=(int, 10),
    CORS_ALLOWED_ORIGINS=(
        list,
        ["http://localhost:5173", "http://127.0.0.1:5173"],
    ),
)

environ.Env.read_env(BASE_DIR / ".env")

DEBUG = env("DEBUG")
SECRET_KEY = env("SECRET_KEY")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "rest_framework",
    "django_filters",
    "corsheaders",
    "shifts",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    }
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# We standardise on UTC end to end. The data is UTC; storing and serialising in
# UTC avoids the silent local-time conversions the brief warns against.
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_PAGINATION_CLASS": "shifts.pagination.DefaultPagination",
    "PAGE_SIZE": 25,
    "UNAUTHENTICATED_USER": None,
}

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")

# --- Domain configuration consumed by the cleaning/analytics services ---
DATA_FILE_PATH = env("DATA_FILE_PATH")
DISPLAY_TIMEZONE = env("DISPLAY_TIMEZONE")
HOURS_TOLERANCE = env("HOURS_TOLERANCE")
MAX_SHIFT_HOURS = env("MAX_SHIFT_HOURS")
STREAK_TARGET_CATEGORY = env("STREAK_TARGET_CATEGORY")
MIN_STREAK_DAYS = env("MIN_STREAK_DAYS")
NON_PRODUCTIVE_CATEGORIES = env("NON_PRODUCTIVE_CATEGORIES")
# How many imported dataset versions to retain before pruning the oldest.
MAX_RETAINED_DATASETS = env("MAX_RETAINED_DATASETS")

# Deterministic, colour-blind-friendly palette. Categories are mapped onto this
# list by stable hashing (see shifts/colors.py), so new reasons get a colour for
# free and the assignment never shifts between runs.
CATEGORY_COLOR_PALETTE = [
    "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed",
    "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
    "#0d9488", "#c026d3", "#ca8a04", "#9333ea", "#059669",
    "#e11d48", "#1d4ed8", "#b45309", "#15803d", "#a21caf",
]
