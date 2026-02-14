from datetime import date

from django.utils import timezone


def _format_currency(value):
    try:
        return f"${float(value):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def _escape(value):
    return "" if value is None else str(value)


def generate_lease_document(lease):
    property_obj = lease.unit.property if lease.unit else None
    property_name = _escape(property_obj.name if property_obj else "")
    address_parts = [
        _escape(property_obj.address_line1 if property_obj else ""),
        _escape(property_obj.address_line2 if property_obj else ""),
        f"{_escape(property_obj.city) if property_obj else ''}, {_escape(property_obj.state) if property_obj else ''} {_escape(property_obj.zip_code) if property_obj else ''}".strip(),
    ]
    property_address = ", ".join(
        [part for part in address_parts if part and part.strip().strip(",").strip()]
    ) or "TBD"

    tenant_name = " ".join([_escape(lease.tenant.first_name), _escape(lease.tenant.last_name)]).strip() or "Tenant"
    landlord_name = "Property Management"
    if lease.organization:
        landlord_name = _escape(lease.organization.name)
    elif property_obj:
        landlord_name = _escape(getattr(property_obj, "owner", ""))

    landlord_name = landlord_name if landlord_name else "Property Management"

    start_display = lease.start_date.strftime("%B %d, %Y") if lease.start_date else ""
    end_display = lease.end_date.strftime("%B %d, %Y") if lease.end_date else ""
    generated_on = timezone.now().strftime("%B %d, %Y")
    today = date.today().strftime("%B %d, %Y")

    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Lease Agreement - {tenant_name}</title>
    <style>
      body {{ font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.45; }}
      .header {{ margin-bottom: 20px; }}
      .title {{ font-size: 24px; font-weight: 700; margin-bottom: 4px; }}
      .meta {{ color: #4b5563; }}
      h2 {{ font-size: 16px; margin-top: 22px; margin-bottom: 8px; }}
      p {{ margin: 0 0 10px 0; }}
      .section {{ margin-top: 16px; }}
      .row {{ margin-bottom: 6px; }}
      .label {{ font-weight: 700; }}
      ul {{ margin-top: 8px; }}
      li {{ margin-bottom: 6px; }}
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">Residential Lease Agreement</div>
      <div class="meta">Generated {generated_on}</div>
      <div class="meta">Generated for: {tenant_name} (Tenant)</div>
      <div class="meta">Landlord/Management: {landlord_name}</div>
      <div class="meta">Property: {property_name}</div>
      <div class="meta">Unit: { _escape(lease.unit.unit_number if lease.unit else "") }</div>
      <div class="meta">Address: {property_address}</div>
    </div>

    <div class="section">
      <h2>1) Lease Term</h2>
      <p>
        This lease begins on <strong>{start_display}</strong> and ends on <strong>{end_display}</strong>, subject to renewal by written notice.
      </p>
    </div>

    <div class="section">
      <h2>2) Rent</h2>
      <p>
        Tenant agrees to pay monthly rent of <strong>{_format_currency(lease.monthly_rent)}</strong> due on the 1st day of each month.
        Rent is payable to the landlord's payment address as specified by management.
      </p>
      <p>
        Late Fee: A late fee may be charged for late rent as permitted by law and lease terms, including accrued rent and any collection costs.
      </p>
    </div>

    <div class="section">
      <h2>3) Deposit</h2>
      <p>
        Security deposit is <strong>{_format_currency(lease.security_deposit)}</strong>. The deposit may be applied to unpaid rent, damages beyond normal wear and tear,
        and restoration of unit condition at lease termination.
      </p>
    </div>

    <div class="section">
      <h2>4) Tenant Responsibilities</h2>
      <ul>
        <li>Keep the unit clean and in good condition.</li>
        <li>Report maintenance issues promptly to landlord.</li>
        <li>Follow all property rules and community standards.</li>
      </ul>
    </div>

    <div class="section">
      <h2>5) Maintenance</h2>
      <p>
        Tenant must maintain safe use of premises and notify landlord of necessary repairs. Landlord/management is responsible for
        major structural repairs and systems outside normal tenant use.
      </p>
    </div>

    <div class="section">
      <h2>6) Utilities and Services</h2>
      <p>
        Tenant is responsible for utilities listed in the move-in paperwork. All applicable utility charges must be paid on time and in full.
      </p>
    </div>

    <div class="section">
      <h2>7) Termination</h2>
      <p>
        Either party may terminate with written notice as required by local law and this lease terms. Tenant must leave the unit
        in good condition and return all keys upon termination.
      </p>
    </div>

    <div class="section">
      <h2>8) Governing Terms</h2>
      <p>
        By signing, parties acknowledge that they have reviewed and accept this Lease Agreement and all clauses above, including rent
        obligations, late fees, and maintenance responsibilities. Generated on {today}.
      </p>
    </div>
  </body>
</html>"""
