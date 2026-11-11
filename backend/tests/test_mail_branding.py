"""Mail copy must brand as КриD20 (not legacy Dvarf)."""

from __future__ import annotations

import inspect

from app.services import mail


def test_transactional_mail_subjects_use_creed20_brand():
    for fn in (
        mail.send_password_reset_email,
        mail.send_email_change_confirm,
        mail.send_registration_verify_email,
    ):
        src = inspect.getsource(fn)
        assert "КриD20" in src
        assert "Dvarf" not in src
