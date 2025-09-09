from django.utils import timezone
from datetime import datetime, timedelta
from userlogin.models import EmployeeLogin
from .models import Evaluation, EvaluationInstance
import logging

logger = logging.getLogger(__name__)

def create_evaluation_instances(evaluation):
    """Create evaluation instances for all eligible employees based on evaluation duration"""
    eligible_employees = EmployeeLogin.objects.filter(active=True)
    eligible_employees = [emp for emp in eligible_employees if evaluation.is_employee_eligible(emp)]
    
    now = timezone.now()
    instances_created = 0
    
    for employee in eligible_employees:
        instances_created += create_instances_for_employee(evaluation, employee, now)
    
    logger.info(f"Created {instances_created} evaluation instances for evaluation '{evaluation.title}'")
    return instances_created

def create_instances_for_employee(evaluation, employee, current_time=None):
    """Create evaluation instances for a specific employee based on evaluation duration"""
    if current_time is None:
        current_time = timezone.now()
    
    instances_created = 0
    
    # Start from evaluation creation date, not fiscal year start
    start_date = evaluation.start_date
    end_date = current_time  # Generate up to current date
    
    # Get existing instances for this employee and evaluation
    existing_instances = EvaluationInstance.objects.filter(
        evaluation=evaluation,
        employee=employee
    ).order_by('period_start')
    
    # For monthly, quarterly, and yearly evaluations, we need to check by period, not exact dates
    existing_periods = set()
    
    if evaluation.duration == 'monthly':
        # Create a set of existing months (YYYY-MM format)
        existing_periods = set(
            f"{instance.period_start.year:04d}-{instance.period_start.month:02d}" 
            for instance in existing_instances
        )
    elif evaluation.duration == 'quarterly':
        # Create a set of existing quarters (YYYY-Q format)
        existing_periods = set(
            f"{instance.period_start.year:04d}-Q{((instance.period_start.month - 1) // 3) + 1}" 
            for instance in existing_instances
        )
    elif evaluation.duration == 'yearly':
        # Create a set of existing years
        existing_periods = set(
            str(instance.period_start.year) 
            for instance in existing_instances
        )
    else:
        # For daily, use exact dates
        existing_periods = set(
            instance.period_start.date() for instance in existing_instances
        )
    
    # Generate periods based on duration
    if evaluation.duration == 'monthly':
        # Start from the month of the start_date
        current_month = start_date.replace(day=1)
        current_end_month = current_time.replace(day=1)
        
        while current_month <= current_end_month:
            period_key = f"{current_month.year:04d}-{current_month.month:02d}"
            
            if period_key not in existing_periods:
                period_start = current_month
                period_end = get_period_end(evaluation, period_start)
                
                # For current month, don't go beyond current time
                if current_month.year == current_time.year and current_month.month == current_time.month:
                    if period_end > current_time:
                        period_end = current_time
                
                # Calculate due date (end of period + grace period)
                due_date = period_end + timedelta(days=7)
                
                instance = EvaluationInstance.objects.create(
                    evaluation=evaluation,
                    employee=employee,
                    period_start=period_start,
                    period_end=period_end,
                    due_date=due_date,
                    status='pending'
                )
                instances_created += 1
                logger.debug(f"Created monthly evaluation instance for {employee.username}: {period_start.strftime('%Y-%m-%d')} to {period_end.strftime('%Y-%m-%d')}")
            
            # Move to next month
            if current_month.month == 12:
                current_month = current_month.replace(year=current_month.year + 1, month=1)
            else:
                current_month = current_month.replace(month=current_month.month + 1)
    
    elif evaluation.duration == 'quarterly':
        # Start from the quarter of the start_date
        start_quarter = ((start_date.month - 1) // 3) * 3 + 1
        current_quarter_start = start_date.replace(month=start_quarter, day=1)
        
        while current_quarter_start <= end_date:
            quarter_num = ((current_quarter_start.month - 1) // 3) + 1
            period_key = f"{current_quarter_start.year:04d}-Q{quarter_num}"
            
            if period_key not in existing_periods:
                period_start = current_quarter_start
                period_end = get_period_end(evaluation, period_start)
                
                # Don't go beyond current time
                if period_end > current_time:
                    period_end = current_time
                
                due_date = period_end + timedelta(days=7)
                
                instance = EvaluationInstance.objects.create(
                    evaluation=evaluation,
                    employee=employee,
                    period_start=period_start,
                    period_end=period_end,
                    due_date=due_date,
                    status='pending'
                )
                instances_created += 1
                logger.debug(f"Created quarterly evaluation instance for {employee.username}: {period_start.strftime('%Y-%m-%d')} to {period_end.strftime('%Y-%m-%d')}")
            
            # Move to next quarter
            month = ((current_quarter_start.month - 1) // 3 + 1) * 3 + 1
            year = current_quarter_start.year
            if month > 12:
                month = 1
                year += 1
            current_quarter_start = current_quarter_start.replace(year=year, month=month)
    
    elif evaluation.duration == 'yearly':
        # Start from the year of the start_date
        current_year_start = start_date.replace(month=1, day=1)
        
        while current_year_start <= end_date:
            period_key = str(current_year_start.year)
            
            if period_key not in existing_periods:
                period_start = current_year_start
                period_end = get_period_end(evaluation, period_start)
                
                # Don't go beyond current time
                if period_end > current_time:
                    period_end = current_time
                
                due_date = period_end + timedelta(days=7)
                
                instance = EvaluationInstance.objects.create(
                    evaluation=evaluation,
                    employee=employee,
                    period_start=period_start,
                    period_end=period_end,
                    due_date=due_date,
                    status='pending'
                )
                instances_created += 1
                logger.debug(f"Created yearly evaluation instance for {employee.username}: {period_start.strftime('%Y-%m-%d')} to {period_end.strftime('%Y-%m-%d')}")
            
            # Move to next year
            current_year_start = current_year_start.replace(year=current_year_start.year + 1)
    
    else:
        # Daily evaluation logic (existing logic)
        current_period_start = start_date
        
        while current_period_start <= end_date:
            period_start = current_period_start
            period_end = get_period_end(evaluation, period_start)
            
            # Ensure we don't go beyond current time for period_end
            if period_end > current_time:
                period_end = current_time
            
            # Check if this instance already exists (compare by date only)
            if period_start.date() not in existing_periods:
                # Calculate due date (end of period + grace period)
                due_date = period_end + timedelta(days=7)  # 7 days grace period
                
                instance = EvaluationInstance.objects.create(
                    evaluation=evaluation,
                    employee=employee,
                    period_start=period_start,
                    period_end=period_end,
                    due_date=due_date,
                    status='pending'
                )
                instances_created += 1
                logger.debug(f"Created daily evaluation instance for {employee.username}: {period_start.strftime('%Y-%m-%d')} to {period_end.strftime('%Y-%m-%d')}")
            
            # Move to next day
            current_period_start = current_period_start + timedelta(days=1)
    
    return instances_created

def get_period_end(evaluation, period_start):
    """Calculate the end date for an evaluation period"""
    if evaluation.duration == 'daily':
        # For daily evaluations, period ends at the end of the same day
        return period_start.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif evaluation.duration == 'monthly':
        # Last day of the month
        if period_start.month == 12:
            next_month = period_start.replace(year=period_start.year + 1, month=1, day=1)
        else:
            next_month = period_start.replace(month=period_start.month + 1, day=1)
        return next_month - timedelta(seconds=1)
    elif evaluation.duration == 'quarterly':
        # Last day of the quarter
        month = ((period_start.month - 1) // 3 + 1) * 3
        year = period_start.year
        if month == 12:
            next_quarter = period_start.replace(year=year + 1, month=1, day=1)
        else:
            next_quarter = period_start.replace(month=month + 1, day=1)
        return next_quarter - timedelta(seconds=1)
    elif evaluation.duration == 'yearly':
        # Last day of the year (fiscal year end)
        next_year = period_start.replace(year=period_start.year + 1)
        return next_year - timedelta(seconds=1)
    
    return period_start

def update_overdue_instances():
    """Update status of overdue evaluation instances"""
    overdue_instances = EvaluationInstance.objects.filter(
        due_date__lt=timezone.now(),
        status__in=['pending', 'in_progress']
    )
    
    updated_count = 0
    for instance in overdue_instances:
        instance.status = 'overdue'
        instance.save(update_fields=['status'])
        updated_count += 1
    
    logger.info(f"Updated {updated_count} overdue evaluation instances")
    return updated_count

def create_missing_instances():
    """Create missing evaluation instances for all active evaluations"""
    
    # Get active evaluations that are currently within their fiscal year
    active_evaluations = Evaluation.objects.filter(
        is_active=True,
        start_date__lte=timezone.now()
    )
    
    total_created = 0
    for evaluation in active_evaluations:
        created = create_evaluation_instances(evaluation)
        total_created += created
    
    logger.info(f"Created {total_created} total evaluation instances across all evaluations")
    return total_created

def generate_recurring_instances_for_evaluation(evaluation_id):
    """Generate recurring instances for a specific evaluation up to current date"""
    try:
        evaluation = Evaluation.objects.get(id=evaluation_id, is_active=True)
        created = create_evaluation_instances(evaluation)
        logger.info(f"Generated {created} recurring instances for evaluation '{evaluation.title}'")
        return created
    except Evaluation.DoesNotExist:
        logger.error(f"Evaluation with ID {evaluation_id} not found or inactive")
        return 0
