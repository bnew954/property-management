from __future__ import annotations

import logging
from typing import Iterable, Optional

from django.core.mail import EmailMultiAlternatives


logger = logging.getLogger(__name__)


def build_email_html(subject, heading, body_paragraphs: Iterable[str], cta_text=None, cta_link=None):
    body_items = "".join(f"<p>{paragraph}</p>" for paragraph in body_paragraphs if paragraph)
    cta_html = ""
    if cta_text and cta_link:
        cta_html = f"""
        <p>
          <a href=\"{cta_link}\" style=\"display:inline-block;background:#7c5cfc;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;\">
            {cta_text}
          </a>
        </p>
        """

    return f"""
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:#f5f5f5;">
        <table role=\"presentation\" width=\"100%\" style=\"background:#f5f5f5;padding:24px 0;\">
          <tr>
            <td align=\"center\">
              <table role=\"presentation\" width=\"100%\" style=\"max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-family:Arial, Helvetica, sans-serif;color:#111827;\">
                <tr>
                  <td style=\"background:#0a0a0a;padding:18px 24px;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.08em;\">
                    ONYX PM
                  </td>
                </tr>
                <tr>
                  <td style=\"padding:24px;\">
                    <h2 style=\"margin:0 0 12px 0;color:#111827;font-size:24px;line-height:1.35;\">{heading}</h2>
                    <div style=\"color:#374151;line-height:1.65;font-size:15px;\">{body_items}</div>
                    {cta_html}
                    <p style=\"margin-top:20px;color:#6b7280;font-size:12px;line-height:1.6;\">
                      This email was sent by Onyx PM. Please do not reply directly to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


def _send_email(subject, recipient_email, heading, body_lines, cta_text=None, cta_link=None):
    if not recipient_email:
        return False

    html = build_email_html(
        subject=subject,
        heading=heading,
        body_paragraphs=body_lines,
        cta_text=cta_text,
        cta_link=cta_link,
    )
    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body="\n\n".join(body_lines),
            to=[recipient_email],
        )
        message.attach_alternative(html, "text/html")
        message.send(fail_silently=True)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", recipient_email)
        return False


def _format_currency(amount):
    try:
        return f"${amount:,.2f}"
    except Exception:
        return str(amount)


def send_application_received(applicant_email, applicant_name, property_name, unit_number):
    return _send_email(
        subject=f"Application Received - {property_name}",
        recipient_email=applicant_email,
        heading="Application Received",
        body_lines=[
            f"Hi {applicant_name},",
            f"Thank you for applying to {property_name}, Unit {unit_number}. "
            "We've received your application and will review it shortly. "
            "You'll hear back within 24-48 hours.",
        ],
    )


def send_application_status_update(applicant_email, applicant_name, property_name, status):
    status_lines = {
        "approved": "Congratulations! Your application has been approved.",
        "denied": "We're sorry, your application was not approved at this time.",
        "under_review": "Your application is currently under review.",
    }
    message = status_lines.get(status, f"Your application status has changed to {status}.")
    return _send_email(
        subject=f"Application Update - {property_name}",
        recipient_email=applicant_email,
        heading="Application Update",
        body_lines=[
            f"Hi {applicant_name},",
            message,
            f"Property: {property_name}",
        ],
    )


def send_screening_consent_request(
    tenant_email, tenant_name, property_name, landlord_name, consent_link
):
    return _send_email(
        subject=f"Screening Authorization Required - {property_name}",
        recipient_email=tenant_email,
        heading="Tenant Screening Authorization Required",
        body_lines=[
            f"Hi {tenant_name},",
            f"{landlord_name} has requested a background and credit check.",
            "Please review and authorize your screening using the link below:",
            consent_link,
        ],
        cta_text="Review and Authorize",
        cta_link=consent_link,
    )


def send_lease_signing_request(
    tenant_email, tenant_name, property_name, landlord_name, signing_link
):
    return _send_email(
        subject=f"Lease Ready for Signature - {property_name}",
        recipient_email=tenant_email,
        heading="Lease Ready for Signature",
        body_lines=[
            f"Hi {tenant_name},",
            f"{landlord_name} has sent a lease agreement for {property_name}.",
            "Please review and sign electronically using the secure link below:",
            signing_link,
        ],
        cta_text="Review and Sign Lease",
        cta_link=signing_link,
    )


def send_lease_signed_confirmation(tenant_email, tenant_name, property_name):
    return _send_email(
        subject=f"Lease Signed - {property_name}",
        recipient_email=tenant_email,
        heading="Lease Signed",
        body_lines=[
            f"Hi {tenant_name},",
            "You've successfully signed your lease. "
            f"Your lease for {property_name} is now awaiting counter-signature if required.",
        ],
    )


def send_lease_fully_executed(
    tenant_email,
    tenant_name,
    property_name,
    landlord_email,
    landlord_name,
):
    shared_lines = [
        f"The lease for {property_name} has been signed by all parties and is now active.",
        "If you have questions, contact the Onyx PM dashboard.",
    ]
    if tenant_email:
        _send_email(
            subject=f"Lease Fully Executed - {property_name}",
            recipient_email=tenant_email,
            heading="Lease Fully Executed",
            body_lines=[f"Hi {tenant_name},"] + shared_lines,
        )
    if landlord_email:
        _send_email(
            subject=f"Lease Fully Executed - {property_name}",
            recipient_email=landlord_email,
            heading="Lease Fully Executed",
            body_lines=[f"Hi {landlord_name},"] + shared_lines,
        )
    return True


def send_payment_confirmation(
    tenant_email,
    tenant_name,
    amount,
    property_name,
    unit_number,
    confirmation_id,
):
    return _send_email(
        subject=f"Payment Confirmed - {_format_currency(amount)}",
        recipient_email=tenant_email,
        heading="Payment Confirmed",
        body_lines=[
            f"Hi {tenant_name},",
            f"Your rent payment of {_format_currency(amount)} for {property_name} Unit {unit_number} "
            f"has been processed.",
            f"Confirmation: {confirmation_id}",
        ],
    )


def send_payment_received_landlord(
    landlord_email,
    landlord_name,
    tenant_name,
    amount,
    property_name,
    unit_number,
):
    return _send_email(
        subject=f"Payment Received - {tenant_name} - {_format_currency(amount)}",
        recipient_email=landlord_email,
        heading="Payment Received",
        body_lines=[
            f"Hi {landlord_name},",
            f"{tenant_name} has paid {_format_currency(amount)} for {property_name} Unit {unit_number}.",
        ],
    )


def send_maintenance_request_submitted(
    landlord_email,
    landlord_name,
    tenant_name,
    property_name,
    unit_number,
    request_title,
):
    return _send_email(
        subject=f"New Maintenance Request - {property_name}",
        recipient_email=landlord_email,
        heading="New Maintenance Request",
        body_lines=[
            f"Hi {landlord_name},",
            f"{tenant_name} submitted a maintenance request: {request_title}",
            f"Property: {property_name}, Unit: {unit_number}",
        ],
    )


def send_maintenance_status_update(
    tenant_email,
    tenant_name,
    request_title,
    new_status,
):
    return _send_email(
        subject=f"Maintenance Update - {request_title}",
        recipient_email=tenant_email,
        heading="Maintenance Request Update",
        body_lines=[
            f"Hi {tenant_name},",
            f"Your maintenance request '{request_title}' has been updated to: {new_status}.",
        ],
    )
