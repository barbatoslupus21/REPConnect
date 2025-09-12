#!/usr/bin/env python
"""
Test script to verify supervisor criteria fields are working properly
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'empconnect.settings')
django.setup()

from evaluation.models import EmployeeEvaluation
from evaluation.forms import SupervisorEvaluationForm

def test_supervisor_criteria():
    print("Testing Supervisor Criteria Implementation...")
    print("=" * 50)
    
    # Test 1: Check model fields exist
    print("1. Testing model fields...")
    field_names = [f.name for f in EmployeeEvaluation._meta.get_fields()]
    criteria_fields = [
        'cost_consciousness_rating', 'cost_consciousness_comments',
        'dependability_rating', 'dependability_comments',
        'communication_rating', 'communication_comments',
        'work_ethics_rating', 'work_ethics_comments',
        'attendance_rating', 'attendance_comments'
    ]
    
    for field in criteria_fields:
        if field in field_names:
            print(f"   ✓ {field} - Found")
        else:
            print(f"   ✗ {field} - Missing")
    
    # Test 2: Check form includes new fields
    print("\n2. Testing form fields...")
    form = SupervisorEvaluationForm()
    form_fields = list(form.fields.keys())
    
    for field in criteria_fields:
        if field in form_fields:
            print(f"   ✓ {field} - Found in form")
        else:
            print(f"   ✗ {field} - Missing from form")
    
    # Test 3: Test average calculation property
    print("\n3. Testing average calculation...")
    try:
        # Get a sample evaluation (if any exist)
        eval_count = EmployeeEvaluation.objects.count()
        print(f"   Found {eval_count} evaluations in database")
        
        if eval_count > 0:
            sample_eval = EmployeeEvaluation.objects.first()
            avg = sample_eval.average_supervisor_criteria_rating
            print(f"   ✓ Average supervisor criteria rating calculation works: {avg}")
        else:
            print("   No evaluations found to test average calculation")
            
    except Exception as e:
        print(f"   ✗ Error calculating average: {e}")
    
    # Test 4: Test form validation
    print("\n4. Testing form validation...")
    try:
        # Test form with missing required fields
        form_data = {
            'strengths': 'Test strengths',
            'weaknesses': 'Test weaknesses',
            # Missing supervisor criteria ratings
        }
        form = SupervisorEvaluationForm(data=form_data)
        is_valid = form.is_valid()
        print(f"   Form validation (missing criteria): {'Invalid' if not is_valid else 'Valid'}")
        
        if not is_valid:
            errors = [field for field in form.errors.keys() if 'rating' in field]
            print(f"   Missing required rating fields: {errors}")
        
    except Exception as e:
        print(f"   ✗ Error testing form validation: {e}")
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == "__main__":
    test_supervisor_criteria()
