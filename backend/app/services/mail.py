from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


class MailError(Exception):
    """Raised when an email cannot be sent."""


def smtp_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def send_email(*, to: str, subject: str, text_body: str) -> None:
    """Send a plain-text email via SMTP. Raises MailError on failure."""
    if settings.auth_email_stub or not smtp_configured():
        raise MailError("SMTP не настроен или включён режим заглушки")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from or settings.smtp_user
    message["To"] = to
    message.set_content(text_body)

    try:
        if settings.smtp_use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                context=context,
                timeout=12,
            ) as smtp:
                smtp.login(settings.smtp_user, settings.smtp_password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=12) as smtp:
                smtp.ehlo()
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
                smtp.login(settings.smtp_user, settings.smtp_password)
                smtp.send_message(message)
    except Exception as exc:  # noqa: BLE001 — surface as MailError to callers
        logger.exception("Failed to send email to %s", to)
        raise MailError("Не удалось отправить письмо") from exc

    logger.info("Email sent to %s subject=%s", to, subject)


def send_password_reset_email(*, to: str, reset_url: str) -> None:
    send_email(
        to=to,
        subject="Dvarf — восстановление пароля",
        text_body=(
            "Вы запросили восстановление пароля в Dvarf.\n\n"
            f"Перейдите по ссылке (действует ограниченное время):\n{reset_url}\n\n"
            "Если это были не вы — просто проигнорируйте письмо.\n"
        ),
    )


def send_email_change_confirm(*, to: str, new_email: str, confirm_url: str) -> None:
    send_email(
        to=to,
        subject="Dvarf — подтверждение смены email",
        text_body=(
            "Вы запросили смену email в Dvarf.\n\n"
            f"Новый адрес: {new_email}\n\n"
            "Email сменится только после перехода по ссылке "
            f"(письмо отправлено на текущую почту):\n{confirm_url}\n\n"
            "Если это были не вы — проигнорируйте письмо, адрес не изменится.\n"
        ),
    )


def send_registration_verify_email(*, to: str, verify_url: str) -> None:
    send_email(
        to=to,
        subject="Dvarf — подтверждение регистрации",
        text_body=(
            "Добро пожаловать в Dvarf!\n\n"
            "Чтобы завершить регистрацию, подтвердите email по ссылке "
            f"(действует ограниченное время):\n{verify_url}\n\n"
            "Если вы не регистрировались — просто проигнорируйте письмо.\n"
        ),
    )
