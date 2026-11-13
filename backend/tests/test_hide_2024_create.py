"""FIX-hide2024: POST /characters with rules_edition=2024 is refused."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.character import RulesEdition
from app.schemas.character import CharacterCreateRequest
from app.services.character import CharacterService


def test_create_rejects_rules_edition_2024():
    user = SimpleNamespace(id=uuid4())
    svc = CharacterService(db=SimpleNamespace())  # type: ignore[arg-type]
    with pytest.raises(AppError) as exc:
        svc.create(
            user,  # type: ignore[arg-type]
            CharacterCreateRequest(rules_edition=RulesEdition.edition_2024),
        )
    assert exc.value.code == "rules_edition_closed"
    assert "2024" in exc.value.message
    assert exc.value.status_code == 400
