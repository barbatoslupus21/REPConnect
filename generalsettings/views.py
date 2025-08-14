from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .models import Department, Line, Position
from finance.models import LoanType, AllowanceType, OJTRate

# Create your views here.

def settings_view(request):
    lines = Line.objects.all().order_by('line_name')
    context = {
        "lines": lines
    }
    return render(request, 'generalsettings/settings.html', context)

# Line API Views
@require_http_methods(["GET", "POST"])
def api_lines(request):
    if request.method == 'GET':
        lines = Line.objects.all().order_by('line_name')
        data = [{"id": l.id, "name": l.line_name} for l in lines]
        return JsonResponse({"lines": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            line = Line.objects.create(line_name=data['name'])
            return JsonResponse({
                "success": True,
                "line": {"id": line.id, "name": line.line_name}
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["PUT", "DELETE"])
def api_line_detail(request, line_id):
    line = get_object_or_404(Line, id=line_id)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            line.line_name = data['name']
            line.save()
            return JsonResponse({
                "success": True,
                "line": {"id": line.id, "name": line.line_name}
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    
    elif request.method == 'DELETE':
        try:
            line.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

# Department API Views
@require_http_methods(["GET", "POST"])
def api_departments(request):
    if request.method == 'GET':
        departments = Department.objects.all().order_by('department_name')
        data = [{"id": d.id, "name": d.department_name} for d in departments]
        return JsonResponse({"departments": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            department = Department.objects.create(department_name=data['name'])
            return JsonResponse({
                "success": True,
                "department": {"id": department.id, "name": department.department_name}
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["PUT", "DELETE"])
def api_department_detail(request, dept_id):
    department = get_object_or_404(Department, id=dept_id)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            department.department_name = data['name']
            department.save()
            return JsonResponse({
                "success": True,
                "department": {"id": department.id, "name": department.department_name}
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    
    elif request.method == 'DELETE':
        try:
            department.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

# Position API Views
@require_http_methods(["GET", "POST"])
def api_positions(request):
    if request.method == 'GET':
        positions = Position.objects.all().order_by('position')
        data = [{"id": p.id, "name": p.position, "level": p.level} for p in positions]
        return JsonResponse({"positions": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            position = Position.objects.create(
                position=data['name'],
                level=data['level']
            )
            return JsonResponse({
                "success": True,
                "position": {"id": position.id, "name": position.position, "level": position.level}
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["PUT", "DELETE"])
def api_position_detail(request, pos_id):
    position = get_object_or_404(Position, id=pos_id)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            position.position = data['name']
            position.level = data['level']
            position.save()
            return JsonResponse({
                "success": True,
                "position": {"id": position.id, "name": position.position, "level": position.level}
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    
    elif request.method == 'DELETE':
        try:
            position.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

# Department Lines API Views
@require_http_methods(["GET", "POST"])
def api_department_lines(request, dept_id):
    department = get_object_or_404(Department, id=dept_id)
    
    if request.method == 'GET':
        lines = department.lines.all().order_by('line_name')
        data = [{"id": l.id, "name": l.line_name} for l in lines]
        return JsonResponse({"success": True, "lines": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            line = get_object_or_404(Line, id=data['line_id'])
            
            if department.lines.filter(id=line.id).exists():
                return JsonResponse({"success": False, "error": "Line already assigned to this department"})
            
            department.lines.add(line)
            return JsonResponse({"success": True, "message": "Line added to department successfully"})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["DELETE"])
def api_department_line_detail(request, dept_id, line_id):
    department = get_object_or_404(Department, id=dept_id)
    line = get_object_or_404(Line, id=line_id)
    
    try:
        if not department.lines.filter(id=line.id).exists():
            return JsonResponse({"success": False, "error": "Line is not assigned to this department"})
        
        department.lines.remove(line)
        return JsonResponse({"success": True, "message": "Line removed from department successfully"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})

# Finance API Views

# LoanType API Views
@require_http_methods(["GET", "POST"])
def api_loantypes(request):
    if request.method == 'GET':
        loantypes = LoanType.objects.all().order_by('loan_type')
        data = [{"id": lt.id, "loan_type": lt.loan_type, "description": lt.description, "is_stackable": lt.is_stackable} for lt in loantypes]
        return JsonResponse({"loantypes": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            loantype = LoanType.objects.create(
                loan_type=data['loan_type'],
                description=data.get('description', ''),
                is_stackable=data.get('is_stackable', True)
            )
            return JsonResponse({
                "success": True,
                "loantype": {
                    "id": loantype.id, 
                    "loan_type": loantype.loan_type,
                    "description": loantype.description,
                    "is_stackable": loantype.is_stackable
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["PUT", "DELETE"])
def api_loantype_detail(request, loantype_id):
    loantype = get_object_or_404(LoanType, id=loantype_id)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            loantype.loan_type = data['loan_type']
            loantype.description = data.get('description', '')
            loantype.is_stackable = data.get('is_stackable', True)
            loantype.save()
            return JsonResponse({
                "success": True,
                "loantype": {
                    "id": loantype.id,
                    "loan_type": loantype.loan_type,
                    "description": loantype.description,
                    "is_stackable": loantype.is_stackable
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    
    elif request.method == 'DELETE':
        try:
            loantype.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

# AllowanceType API Views
@require_http_methods(["GET", "POST"])
def api_allowancetypes(request):
    if request.method == 'GET':
        allowancetypes = AllowanceType.objects.all().order_by('allowance_type')
        data = [{"id": at.id, "allowance_type": at.allowance_type} for at in allowancetypes]
        return JsonResponse({"allowancetypes": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            allowancetype = AllowanceType.objects.create(allowance_type=data['allowance_type'])
            return JsonResponse({
                "success": True,
                "allowancetype": {"id": allowancetype.id, "allowance_type": allowancetype.allowance_type}
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["PUT", "DELETE"])
def api_allowancetype_detail(request, allowancetype_id):
    allowancetype = get_object_or_404(AllowanceType, id=allowancetype_id)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            allowancetype.allowance_type = data['allowance_type']
            allowancetype.save()
            return JsonResponse({
                "success": True,
                "allowancetype": {"id": allowancetype.id, "allowance_type": allowancetype.allowance_type}
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    
    elif request.method == 'DELETE':
        try:
            allowancetype.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

# OJTRate API Views
@require_http_methods(["GET", "POST"])
def api_ojtrates(request):
    if request.method == 'GET':
        ojtrates = OJTRate.objects.all().order_by('site')
        data = [{
            "id": oj.id, 
            "site": oj.site,
            "allowance_day": str(oj.allowance_day),
            "reg_nd_rate": str(oj.reg_nd_rate),
            "reg_nd_ot_rate": str(oj.reg_nd_ot_rate),
            "reg_ot_rate": str(oj.reg_ot_rate),
            "rest_ot_rate": str(oj.rest_ot_rate),
            "legal_rate": str(oj.legal_rate),
            "sat_off_rate": str(oj.sat_off_rate)
        } for oj in ojtrates]
        return JsonResponse({"ojtrates": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            ojtrate = OJTRate.objects.create(
                site=data['site'],
                allowance_day=data.get('allowance_day', 0),
                reg_nd_rate=data.get('reg_nd_rate', 0),
                reg_nd_ot_rate=data.get('reg_nd_ot_rate', 0),
                reg_ot_rate=data.get('reg_ot_rate', 0),
                rest_ot_rate=data.get('rest_ot_rate', 0),
                legal_rate=data.get('legal_rate', 0),
                sat_off_rate=data.get('sat_off_rate', 0)
            )
            return JsonResponse({
                "success": True,
                "ojtrate": {
                    "id": ojtrate.id,
                    "site": ojtrate.site,
                    "allowance_day": str(ojtrate.allowance_day),
                    "reg_nd_rate": str(ojtrate.reg_nd_rate),
                    "reg_nd_ot_rate": str(ojtrate.reg_nd_ot_rate),
                    "reg_ot_rate": str(ojtrate.reg_ot_rate),
                    "rest_ot_rate": str(ojtrate.rest_ot_rate),
                    "legal_rate": str(ojtrate.legal_rate),
                    "sat_off_rate": str(ojtrate.sat_off_rate)
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["PUT", "DELETE"])
def api_ojtrate_detail(request, ojtrate_id):
    ojtrate = get_object_or_404(OJTRate, id=ojtrate_id)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            ojtrate.site = data['site']
            ojtrate.allowance_day = data.get('allowance_day', 0)
            ojtrate.reg_nd_rate = data.get('reg_nd_rate', 0)
            ojtrate.reg_nd_ot_rate = data.get('reg_nd_ot_rate', 0)
            ojtrate.reg_ot_rate = data.get('reg_ot_rate', 0)
            ojtrate.rest_ot_rate = data.get('rest_ot_rate', 0)
            ojtrate.legal_rate = data.get('legal_rate', 0)
            ojtrate.sat_off_rate = data.get('sat_off_rate', 0)
            ojtrate.save()
            return JsonResponse({
                "success": True,
                "ojtrate": {
                    "id": ojtrate.id,
                    "site": ojtrate.site,
                    "allowance_day": str(ojtrate.allowance_day),
                    "reg_nd_rate": str(ojtrate.reg_nd_rate),
                    "reg_nd_ot_rate": str(ojtrate.reg_nd_ot_rate),
                    "reg_ot_rate": str(ojtrate.reg_ot_rate),
                    "rest_ot_rate": str(ojtrate.rest_ot_rate),
                    "legal_rate": str(ojtrate.legal_rate),
                    "sat_off_rate": str(ojtrate.sat_off_rate)
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    
    elif request.method == 'DELETE':
        try:
            ojtrate.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

# OJTRate specific rates API
@require_http_methods(["GET", "PUT"])
def api_ojtrate_rates(request, ojtrate_id):
    ojtrate = get_object_or_404(OJTRate, id=ojtrate_id)
    
    if request.method == 'GET':
        return JsonResponse({
            "success": True,
            "rates": {
                "allowance_day": str(ojtrate.allowance_day),
                "reg_nd_rate": str(ojtrate.reg_nd_rate),
                "reg_nd_ot_rate": str(ojtrate.reg_nd_ot_rate),
                "reg_ot_rate": str(ojtrate.reg_ot_rate),
                "rest_ot_rate": str(ojtrate.rest_ot_rate),
                "legal_rate": str(ojtrate.legal_rate),
                "sat_off_rate": str(ojtrate.sat_off_rate)
            }
        })
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            ojtrate.allowance_day = data.get('allowance_day', ojtrate.allowance_day)
            ojtrate.reg_nd_rate = data.get('reg_nd_rate', ojtrate.reg_nd_rate)
            ojtrate.reg_nd_ot_rate = data.get('reg_nd_ot_rate', ojtrate.reg_nd_ot_rate)
            ojtrate.reg_ot_rate = data.get('reg_ot_rate', ojtrate.reg_ot_rate)
            ojtrate.rest_ot_rate = data.get('rest_ot_rate', ojtrate.rest_ot_rate)
            ojtrate.legal_rate = data.get('legal_rate', ojtrate.legal_rate)
            ojtrate.sat_off_rate = data.get('sat_off_rate', ojtrate.sat_off_rate)
            ojtrate.save()
            return JsonResponse({
                "success": True,
                "message": "Rates updated successfully"
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})