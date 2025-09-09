from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from datetime import datetime
from django.db import IntegrityError
from .models import Department, Line, Position
from finance.models import LoanType, AllowanceType, OJTRate
from leaverequest.models import LeaveType, LeaveReason, SundayException
from ticketing.models import DeviceType, TicketCategory

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

# Leave API Views

# LeaveType API Views
@require_http_methods(["GET", "POST"])
def api_leavetypes(request):
    if request.method == 'GET':
        leavetypes = LeaveType.objects.all().order_by('name')
        data = [{
            "id": lt.id, 
            "name": lt.name,
            "code": lt.code,
            "go_to_clinic": lt.go_to_clinic,
            "is_active": lt.is_active
        } for lt in leavetypes]
        return JsonResponse({"leavetypes": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            leavetype = LeaveType.objects.create(
                name=data['name'],
                code=data['code'],
                go_to_clinic=data.get('go_to_clinic', False),
                is_active=data.get('is_active', True)
            )
            return JsonResponse({
                "success": True,
                "leavetype": {
                    "id": leavetype.id,
                    "name": leavetype.name,
                    "code": leavetype.code,
                    "go_to_clinic": leavetype.go_to_clinic,
                    "is_active": leavetype.is_active
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["PUT", "DELETE"])
def api_leavetype_detail(request, leavetype_id):
    leavetype = get_object_or_404(LeaveType, id=leavetype_id)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            leavetype.name = data['name']
            leavetype.code = data['code']
            leavetype.go_to_clinic = data.get('go_to_clinic', False)
            leavetype.is_active = data.get('is_active', True)
            leavetype.save()
            return JsonResponse({
                "success": True,
                "leavetype": {
                    "id": leavetype.id,
                    "name": leavetype.name,
                    "code": leavetype.code,
                    "go_to_clinic": leavetype.go_to_clinic,
                    "is_active": leavetype.is_active
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    
    elif request.method == 'DELETE':
        try:
            leavetype.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

# SundayException API Views
@require_http_methods(["GET", "POST"])
def api_sundayexceptions(request):
    if request.method == 'GET':
        sundayexceptions = SundayException.objects.all().order_by('date')
        data = [{
            "id": se.id, 
            "date": se.date.strftime('%Y-%m-%d'),
            "description": se.description
        } for se in sundayexceptions]
        return JsonResponse({"sundayexceptions": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            date_str = data.get('date')
            description = data.get('description', '')
            
            if not date_str:
                return JsonResponse({"success": False, "error": "Date is required"})
            
            # Parse the date string to ensure it's valid
            try:
                parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return JsonResponse({"success": False, "error": "Invalid date format. Use YYYY-MM-DD"})
            
            # Check if date already exists
            if SundayException.objects.filter(date=parsed_date).exists():
                return JsonResponse({"success": False, "error": "A Sunday exception for this date already exists"})
            
            sundayexception = SundayException.objects.create(
                date=parsed_date,
                description=description
            )
            return JsonResponse({
                "success": True,
                "sundayexception": {
                    "id": sundayexception.id,
                    "date": sundayexception.date.strftime('%Y-%m-%d'),
                    "description": sundayexception.description
                }
            })
        except IntegrityError as e:
            return JsonResponse({"success": False, "error": "A Sunday exception for this date already exists"})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["PUT", "DELETE"])
def api_sundayexception_detail(request, sundayexception_id):
    sundayexception = get_object_or_404(SundayException, id=sundayexception_id)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            date_str = data.get('date')
            description = data.get('description', '')
            
            if not date_str:
                return JsonResponse({"success": False, "error": "Date is required"})
            
            # Parse the date string to ensure it's valid
            try:
                parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return JsonResponse({"success": False, "error": "Invalid date format. Use YYYY-MM-DD"})
            
            # Check if date already exists (excluding current record)
            if SundayException.objects.filter(date=parsed_date).exclude(id=sundayexception_id).exists():
                return JsonResponse({"success": False, "error": "A Sunday exception for this date already exists"})
            
            sundayexception.date = parsed_date
            sundayexception.description = description
            sundayexception.save()
            return JsonResponse({
                "success": True,
                "sundayexception": {
                    "id": sundayexception.id,
                    "date": sundayexception.date.strftime('%Y-%m-%d'),
                    "description": sundayexception.description
                }
            })
        except IntegrityError as e:
            return JsonResponse({"success": False, "error": "A Sunday exception for this date already exists"})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    
    elif request.method == 'DELETE':
        try:
            sundayexception.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

# LeaveReason API Views (for specific leave type)
@require_http_methods(["GET", "POST"])
def api_leavetype_reasons(request, leavetype_id):
    leavetype = get_object_or_404(LeaveType, id=leavetype_id)
    
    if request.method == 'GET':
        reasons = leavetype.reasons.all().order_by('reason_text')
        data = [{
            "id": lr.id,
            "reason_text": lr.reason_text,
            "is_active": lr.is_active
        } for lr in reasons]
        return JsonResponse({"success": True, "reasons": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            reason = LeaveReason.objects.create(
                leave_type=leavetype,
                reason_text=data['reason_text'],
                is_active=data.get('is_active', True)
            )
            return JsonResponse({
                "success": True,
                "reason": {
                    "id": reason.id,
                    "reason_text": reason.reason_text,
                    "is_active": reason.is_active
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["PUT", "DELETE"])
def api_leavetype_reason_detail(request, leavetype_id, reason_id):
    leavetype = get_object_or_404(LeaveType, id=leavetype_id)
    reason = get_object_or_404(LeaveReason, id=reason_id, leave_type=leavetype)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            reason.reason_text = data['reason_text']
            reason.is_active = data.get('is_active', True)
            reason.save()
            return JsonResponse({
                "success": True,
                "reason": {
                    "id": reason.id,
                    "reason_text": reason.reason_text,
                    "is_active": reason.is_active
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    
    elif request.method == 'DELETE':
        try:
            reason.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

# DeviceType API Views
@csrf_exempt
def api_devicetypes(request):
    if request.method == 'GET':
        devicetypes = DeviceType.objects.all().order_by('name')
        data = [{
            "id": dt.id, 
            "name": dt.name,
            "description": dt.description or ""
        } for dt in devicetypes]
        return JsonResponse({"devicetypes": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name', '').strip()
            description = data.get('description', '').strip()
            
            if not name:
                return JsonResponse({"success": False, "error": "Device type name is required"})
            
            devicetype = DeviceType.objects.create(
                name=name,
                description=description
            )
            return JsonResponse({
                "success": True,
                "devicetype": {
                    "id": devicetype.id,
                    "name": devicetype.name,
                    "description": devicetype.description or ""
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["PUT", "DELETE"])
def api_devicetype_detail(request, devicetype_id):
    devicetype = get_object_or_404(DeviceType, id=devicetype_id)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            name = data.get('name', '').strip()
            description = data.get('description', '').strip()
            
            if not name:
                return JsonResponse({"success": False, "error": "Device type name is required"})
            
            devicetype.name = name
            devicetype.description = description
            devicetype.save()
            return JsonResponse({
                "success": True,
                "devicetype": {
                    "id": devicetype.id,
                    "name": devicetype.name,
                    "description": devicetype.description or ""
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    
    elif request.method == 'DELETE':
        try:
            devicetype.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

# TicketCategory API Views
@csrf_exempt
def api_ticketcategories(request):
    if request.method == 'GET':
        ticketcategories = TicketCategory.objects.all().order_by('name')
        data = [{
            "id": tc.id, 
            "name": tc.name,
            "description": tc.description or ""
        } for tc in ticketcategories]
        return JsonResponse({"ticketcategories": data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name', '').strip()
            description = data.get('description', '').strip()
            
            if not name:
                return JsonResponse({"success": False, "error": "Ticket category name is required"})
            
            ticketcategory = TicketCategory.objects.create(
                name=name,
                description=description
            )
            return JsonResponse({
                "success": True,
                "ticketcategory": {
                    "id": ticketcategory.id,
                    "name": ticketcategory.name,
                    "description": ticketcategory.description or ""
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

@require_http_methods(["PUT", "DELETE"])
def api_ticketcategory_detail(request, ticketcategory_id):
    ticketcategory = get_object_or_404(TicketCategory, id=ticketcategory_id)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            name = data.get('name', '').strip()
            description = data.get('description', '').strip()
            
            if not name:
                return JsonResponse({"success": False, "error": "Ticket category name is required"})
            
            ticketcategory.name = name
            ticketcategory.description = description
            ticketcategory.save()
            return JsonResponse({
                "success": True,
                "ticketcategory": {
                    "id": ticketcategory.id,
                    "name": ticketcategory.name,
                    "description": ticketcategory.description or ""
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    
    elif request.method == 'DELETE':
        try:
            ticketcategory.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})