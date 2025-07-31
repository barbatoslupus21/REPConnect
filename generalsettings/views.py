from django.shortcuts import render
from django.http import JsonResponse
from .models import Department, Line, Position

# Create your views here.

def api_departments(request):
    departments = Department.objects.all().order_by('department_name')
    data = [{"id": d.id, "name": d.department_name} for d in departments]
    return JsonResponse({"departments": data})

def api_lines(request):
    department_id = request.GET.get('department_id')
    if department_id:
        try:
            department = Department.objects.get(id=department_id)
            lines = department.lines.all().order_by('line_name')
        except Department.DoesNotExist:
            lines = []
    else:
        lines = Line.objects.none()
    data = [{"id": l.id, "name": l.line_name} for l in lines]
    return JsonResponse({"lines": data})

def api_positions(request):
    positions = Position.objects.all().order_by('position')
    data = [{"id": p.id, "name": p.position} for p in positions]
    return JsonResponse({"positions": data})
