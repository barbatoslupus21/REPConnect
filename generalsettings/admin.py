from django.contrib import admin
from .models import Line, Department, Position

@admin.register(Line)
class LineAdmin(admin.ModelAdmin):
    list_display = ('id', 'line_name')
    search_fields = ('line_name',)
    ordering = ('line_name',)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'department_name', 'get_lines')
    search_fields = ('department_name',)
    ordering = ('department_name',)
    filter_horizontal = ('lines',)

    def get_lines(self, obj):
        return ", ".join([line.line_name for line in obj.lines.all()])
    get_lines.short_description = 'Lines'

admin.site.register(Position)
