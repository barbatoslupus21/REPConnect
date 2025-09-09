#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'empconnect.settings')
django.setup()

from training.models import Training, TrainingEvaluation
from userlogin.models import EmployeeLogin
from datetime import datetime, timedelta

def create_test_data():
    print("Creating test data...")
    
    # Create some sample training evaluations if they don't exist
    trainings = Training.objects.all()
    print(f"Found {trainings.count()} trainings")
    
    if trainings.exists():
        # Create some sample evaluations
        users = EmployeeLogin.objects.filter(active=True)[:5]
        print(f"Found {users.count()} users")
        
        for training in trainings[:2]:  # Just first 2 trainings
            for user in users[:3]:  # Just first 3 users
                eval_obj, created = TrainingEvaluation.objects.get_or_create(
                    training=training,
                    participant=user,
                    defaults={
                        'is_submitted': True,
                        'status': 'submitted',
                        'submitted_at': datetime.now(),
                        'content_related_to_job': 4,
                        'content_explained_clearly': 5,
                        'content_suitable_for_topic': 4,
                        'program_clear_goals': 4,
                        'program_met_goals': 4,
                        'program_easy_to_follow': 5,
                        'program_easy_to_understand': 4,
                        'speaker_knowledge': 5,
                        'speaker_clear_communication': 4,
                        'speaker_answered_questions': 4,
                        'training_organization': 4,
                        'suitable_facilities': 4,
                        'helpful_materials': 4,
                    }
                )
                if created:
                    print(f"Created evaluation for {user.full_name} - {training.title}")
    
    # Print stats
    total_evals = TrainingEvaluation.objects.count()
    submitted_evals = TrainingEvaluation.objects.filter(status='submitted').count()
    print(f"Total evaluations: {total_evals}")
    print(f"Submitted evaluations: {submitted_evals}")

if __name__ == '__main__':
    create_test_data()
