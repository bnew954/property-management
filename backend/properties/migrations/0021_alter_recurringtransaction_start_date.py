from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0020_recurringtransaction_amount_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="recurringtransaction",
            name="start_date",
            field=models.DateField(),
        ),
    ]
