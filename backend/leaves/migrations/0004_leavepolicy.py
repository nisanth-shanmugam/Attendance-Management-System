from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('leaves', '0003_leavebalance'),
    ]

    operations = [
        migrations.CreateModel(
            name='LeavePolicy',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('leave_type', models.CharField(
                    choices=[
                        ('CL', 'Casual Leave (CL)'), ('SL', 'Sick Leave (SL)'),
                        ('EL', 'Earned Leave (EL)'), ('LOP', 'Loss of Pay (LOP)'),
                        ('ML', 'Maternity Leave'), ('PL', 'Paternity Leave'),
                        ('CO', 'Compensatory Off (Comp-Off)'), ('BL', 'Bereavement Leave'),
                        ('MAL', 'Marriage Leave'), ('WFH', 'Work From Home (WFH)'),
                    ],
                    max_length=10, unique=True,
                )),
                ('entitled', models.IntegerField(default=0)),
            ],
        ),
    ]
