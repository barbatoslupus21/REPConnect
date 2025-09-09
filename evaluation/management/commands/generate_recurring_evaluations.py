from django.core.management.base import BaseCommand
from django.utils import timezone
from evaluation.utils import create_missing_instances, update_overdue_instances
from evaluation.models import Evaluation

class Command(BaseCommand):
    help = 'Generate recurring evaluation instances for all active evaluations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--evaluation-id',
            type=int,
            help='Generate instances for a specific evaluation ID only',
        )
        parser.add_argument(
            '--update-overdue',
            action='store_true',
            help='Update overdue evaluation instances',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS(
                f'Starting recurring evaluation generation at {timezone.now()}'
            )
        )

        # Update overdue instances first
        if options['update_overdue']:
            updated_count = update_overdue_instances()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Updated {updated_count} overdue evaluation instances'
                )
            )

        # Generate missing instances
        if options['evaluation_id']:
            try:
                evaluation = Evaluation.objects.get(
                    id=options['evaluation_id'], 
                    is_active=True
                )
                from evaluation.utils import create_evaluation_instances
                created = create_evaluation_instances(evaluation)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created {created} instances for evaluation "{evaluation.title}"'
                    )
                )
            except Evaluation.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f'Evaluation with ID {options["evaluation_id"]} not found or inactive'
                    )
                )
        else:
            total_created = create_missing_instances()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created {total_created} total evaluation instances'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'Recurring evaluation generation completed at {timezone.now()}'
            )
        )
