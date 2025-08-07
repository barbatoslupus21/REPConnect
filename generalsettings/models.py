from django.db import models

class Line(models.Model):
    line_name = models.CharField(max_length=100, unique=True, verbose_name="Line Name")

    class Meta:
        ordering = ['line_name']
        verbose_name = "Production Line"
        verbose_name_plural = "Production Lines"

    def __str__(self):
        return self.line_name


class Department(models.Model):
    department_name = models.CharField(max_length=100, unique=True, verbose_name="Department Name")
    lines = models.ManyToManyField(Line, related_name='departments')

    class Meta:
        ordering = ['department_name']
        verbose_name = "Department"
        verbose_name_plural = "Departments"

    def __str__(self):
        return self.department_name


class Position(models.Model):
    level_choice=[
        ('1', 'level-1'),
        ('2', 'level-2'),
        ('3', 'level-3'),   
    ]
    position = models.CharField(max_length=200, null=True, unique=True)
    level = models.CharField(max_length=1, choices=level_choice, default='1')

    def __str__(self):
        return self.position
