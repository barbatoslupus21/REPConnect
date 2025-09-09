from django.core.management.base import BaseCommand
from django.utils import timezone
from evaluation.models import Evaluation, EvaluationInstance

class Command(BaseCommand):
    help = 'Fix duplicate monthly evaluation instances'

    def handle(self, *args, **options):
        self.stdout.write('=== FIXING MONTHLY EVALUATION INSTANCES ===')
        
        # Get monthly evaluations
        monthly_evals = Evaluation.objects.filter(duration='monthly', is_active=True)
        
        for evaluation in monthly_evals:
            self.stdout.write(f'Processing: {evaluation.title}')
            self.stdout.write(f'Start Date: {evaluation.start_date.strftime("%Y-%m-%d")}')
            
            # Get current instances
            instances = EvaluationInstance.objects.filter(evaluation=evaluation)
            self.stdout.write(f'Current instances: {instances.count()}')
            
            # Delete all instances
            deleted_count = instances.count()
            instances.delete()
            self.stdout.write(f'Deleted {deleted_count} instances')
            
            # Recreate instances
            from evaluation.utils import create_evaluation_instances
            created = create_evaluation_instances(evaluation)
            self.stdout.write(f'Created {created} new instances')
            
            # Show sample of new instances
            new_instances = EvaluationInstance.objects.filter(evaluation=evaluation).order_by('period_start')
            self.stdout.write('Sample new instances:')
            for instance in new_instances[:4]:
                self.stdout.write(f'  {instance.employee.username}: {instance.period_start.strftime("%B %Y")}')
            
            self.stdout.write('')
        
        self.stdout.write(self.style.SUCCESS('Monthly evaluation instances fixed!'))
