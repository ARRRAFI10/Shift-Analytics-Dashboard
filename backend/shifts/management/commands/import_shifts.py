from django.core.management.base import BaseCommand, CommandError

from shifts.services import cleaning


class Command(BaseCommand):
    help = "Read the configured shift spreadsheet, clean it, and load it into the DB."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--path",
            help="Override DATA_FILE_PATH for this run.",
            default=None,
        )

    def handle(self, *args, **options) -> None:
        try:
            outcome = cleaning.import_from_file(options["path"])
        except FileNotFoundError as exc:
            raise CommandError(f"Data file not found: {exc}") from exc

        result = outcome.result
        actions: dict[str, int] = {}
        for issue in result.issues:
            actions[issue.action_taken] = actions.get(issue.action_taken, 0) + 1

        self.stdout.write(self.style.SUCCESS(
            f"Imported {len(result.records)} analytical records "
            f"(dataset #{outcome.dataset_id})."
        ))
        breakdown = ", ".join(f"{k}: {v}" for k, v in sorted(actions.items())) or "none"
        self.stdout.write(f"Logged {len(result.issues)} ingestion issues ({breakdown}).")
