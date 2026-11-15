"""W-API-06: извлечение предложений из прозы после детерминированного разбора.

Пишет только пункты черновика (ai_suggestion / setting_item / setting_creature /
quest / artifact_set). В канон и confirm не лезет. Должности к людям не
привязывает автоматически.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.services.world_import_ai_provider import (
    ExtractIssue,
    ExtractResult,
    WorldImportAiProvider,
    get_world_import_ai_provider,
)
from app.services.world_vault_parse import ParsedVaultItem, VaultParseResult


@dataclass
class EnrichResult:
    items: list[ParsedVaultItem]
    skipped: list[dict[str, str]] = field(default_factory=list)
    extract_mode: str = "none"
    extract_message: str = ""
    extract_errors: list[ExtractIssue] = field(default_factory=list)
    extract_warnings: list[str] = field(default_factory=list)


def enrich_parsed_with_ai(
    parsed: VaultParseResult,
    *,
    rules_edition: str = "2014",
    provider: WorldImportAiProvider | None = None,
) -> EnrichResult:
    """После parse_vault_files: добавить предложения извлечения, исходные пункты сохранить."""
    prov = provider or get_world_import_ai_provider()
    try:
        result: ExtractResult = prov.extract(parsed.items, rules_edition=rules_edition)
    except Exception as exc:  # noqa: BLE001 — провайдер не должен валить импорт
        return EnrichResult(
            items=list(parsed.items),
            skipped=list(parsed.skipped),
            extract_mode="error",
            extract_message="Провайдер извлечения сбойнул — черновик без ИИ-предложений",
            extract_errors=[
                ExtractIssue(
                    code="ai_provider_error",
                    message=f"Сбой извлечения: {exc.__class__.__name__}",
                    hint="Канон не изменён; повторите позже или работайте без ИИ",
                )
            ],
        )

    existing_keys = {it.source_key for it in parsed.items}
    merged = list(parsed.items)
    for extra in result.items:
        if extra.source_key in existing_keys:
            continue
        existing_keys.add(extra.source_key)
        # Пометим режим на каждом предложении — видно в черновике/diff.
        prop = dict(extra.proposal or {})
        prop.setdefault("extract_mode", result.mode)
        prop.setdefault("extract_message", result.message)
        extra.proposal = prop
        merged.append(extra)

    skipped = list(parsed.skipped)
    for err in result.errors:
        skipped.append(
            {
                "path": err.path or "__ai_extract__",
                "reason": err.code,
                "message": err.message,
                "hint": err.hint,
            }
        )

    return EnrichResult(
        items=merged,
        skipped=skipped,
        extract_mode=result.mode,
        extract_message=result.message,
        extract_errors=list(result.errors),
        extract_warnings=list(result.warnings),
    )
