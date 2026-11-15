"""W-API-09: импорт мира по публичной HTTPS git-ссылке.

В образе бэкенда нет бинарника git (только curl) — не добавляем тяжёлые
зависимости. Вместо клона скачиваем zip-архив ветки с белого списка хостов
(codeload.github.com / gitlab.com archive) с проверками SSRF и потолком размера.
"""

from __future__ import annotations

import ipaddress
import logging
import re
import socket
from dataclasses import dataclass
from typing import Callable
from urllib.parse import urlparse, urlunparse

import httpx

from app.core.exceptions import AppError
from app.services.world_vault_parse import VaultFile, extract_zip_to_files

logger = logging.getLogger(__name__)

# Who целиком ~446 МБ — такой репозиторий отклоняем понятной ошибкой.
MAX_GIT_ARCHIVE_BYTES = 100 * 1024 * 1024
GIT_FETCH_TIMEOUT_SEC = 60.0
GIT_MAX_REDIRECTS = 5

# Хосты, с которых разрешено начинать и куда можно уйти по редиректу.
ALLOWED_GIT_HOSTS = frozenset(
    {
        "github.com",
        "www.github.com",
        "codeload.github.com",
        "gitlab.com",
        "www.gitlab.com",
    }
)

_GITHUB_REPO_RE = re.compile(
    r"^/(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+?)(?:\.git)?(?:/(?:tree|blob)/(?P<ref>[^/]+))?(?:/.*)?$"
)
_GITLAB_REPO_RE = re.compile(
    r"^/(?P<path>[A-Za-z0-9_.\-]+(?:/[A-Za-z0-9_.\-]+)+)"
    r"(?:\.git)?(?:/-/tree/(?P<ref>[^/]+))?(?:/.*)?$"
)


@dataclass(frozen=True)
class ParsedGitUrl:
    """Разобранная публичная ссылка на репозиторий."""

    original_url: str
    host: str
    provider: str  # github | gitlab
    owner_or_path: str
    repo: str
    ref: str
    archive_url: str


def _reject(message: str, *, hint: str = "", **extra: object) -> None:
    data: dict = {"hint": hint or "Укажите публичный HTTPS URL github.com или gitlab.com"}
    data.update(extra)
    raise AppError(
        message,
        code="git_url_rejected",
        status_code=400,
        data=data,
    )


def _host_allowed(host: str) -> bool:
    return (host or "").lower().rstrip(".") in ALLOWED_GIT_HOSTS


def _is_ip_literal(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def _ip_is_blocked(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return bool(
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def assert_host_resolves_public(host: str) -> None:
    """DNS → отказ, если любой адрес частный / loopback / link-local."""
    if _is_ip_literal(host):
        _reject(
            "Ссылка на IP-адрес не допускается",
            hint="Используйте имя хоста из белого списка (github.com, gitlab.com)",
            host=host,
        )
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        _reject(
            "Не удалось разрешить хост git-ссылки",
            hint="Проверьте URL и доступность репозитория",
            host=host,
            detail=str(exc),
        )
    if not infos:
        _reject("Хост git-ссылки не резолвится", host=host)
    for info in infos:
        sockaddr = info[4]
        if not sockaddr:
            continue
        try:
            ip = ipaddress.ip_address(sockaddr[0])
        except ValueError:
            continue
        if _ip_is_blocked(ip):
            _reject(
                "Хост указывает на внутренний или служебный адрес",
                hint="Запрещены loopback, частные сети и link-local (в т.ч. metadata)",
                host=host,
                ip=str(ip),
            )


def validate_git_url(url: str) -> ParsedGitUrl:
    """Валидация URL и хоста до любого сетевого вызова (кроме опционального DNS)."""
    raw = (url or "").strip()
    if not raw:
        _reject("Пустая git-ссылка", hint="Передайте url публичного репозитория")

    parsed = urlparse(raw)
    scheme = (parsed.scheme or "").lower()
    if scheme == "file":
        _reject("Схема file:// запрещена", hint="Только https://github.com/… или gitlab.com")
    if scheme != "https":
        _reject(
            "Разрешён только HTTPS",
            hint="Ссылка должна начинаться с https://",
            scheme=scheme or "(нет)",
        )

    host = (parsed.hostname or "").lower().rstrip(".")
    if not host:
        _reject("В ссылке нет хоста")
    if _is_ip_literal(host):
        _reject(
            "Ссылка на IP-адрес не допускается",
            hint="Используйте github.com или gitlab.com",
            host=host,
        )
    if host in {"localhost", "localhost.localdomain"}:
        _reject("localhost запрещён", host=host)
    if not _host_allowed(host):
        _reject(
            "Хост не в белом списке",
            hint="Допустимы github.com и gitlab.com",
            host=host,
        )

    path = parsed.path or "/"
    # Нормализуем www.
    canon_host = host.removeprefix("www.")

    if canon_host == "github.com" or canon_host == "codeload.github.com":
        return _parse_github(raw, host, path)
    if canon_host == "gitlab.com":
        return _parse_gitlab(raw, host, path)
    _reject("Хост не поддерживается", host=host)
    raise AssertionError("unreachable")  # pragma: no cover


def _parse_github(original: str, host: str, path: str) -> ParsedGitUrl:
    if host == "codeload.github.com":
        # Уже архив: /owner/repo/zip/refs/heads/main или /owner/repo/zip/main
        parts = [p for p in path.split("/") if p]
        if len(parts) < 3 or parts[2] != "zip":
            _reject(
                "Непонятный URL архива GitHub",
                hint="Ожидается https://github.com/owner/repo",
            )
        owner, repo = parts[0], parts[1]
        ref = "main"
        if len(parts) >= 4:
            rest = parts[3:]
            if rest[:2] == ["refs", "heads"] and len(rest) >= 3:
                ref = "/".join(rest[2:])
            else:
                ref = "/".join(rest)
        archive = f"https://codeload.github.com/{owner}/{repo}/zip/refs/heads/{ref}"
        return ParsedGitUrl(
            original_url=original,
            host=host,
            provider="github",
            owner_or_path=owner,
            repo=repo,
            ref=ref,
            archive_url=archive,
        )

    m = _GITHUB_REPO_RE.match(path)
    if not m:
        _reject(
            "Не удалось разобрать ссылку GitHub",
            hint="Формат: https://github.com/owner/repo или …/tree/ветка",
        )
    owner = m.group("owner")
    repo = m.group("repo")
    ref = m.group("ref") or "main"
    archive = f"https://codeload.github.com/{owner}/{repo}/zip/refs/heads/{ref}"
    return ParsedGitUrl(
        original_url=original,
        host=host,
        provider="github",
        owner_or_path=owner,
        repo=repo,
        ref=ref,
        archive_url=archive,
    )


def _parse_gitlab(original: str, host: str, path: str) -> ParsedGitUrl:
    m = _GITLAB_REPO_RE.match(path)
    if not m:
        _reject(
            "Не удалось разобрать ссылку GitLab",
            hint="Формат: https://gitlab.com/group/repo",
        )
    full_path = m.group("path").strip("/")
    if not full_path or "/" not in full_path:
        # gitlab.com/user/project минимум два сегмента
        if not full_path:
            _reject("В ссылке GitLab нет пути репозитория")
        # один сегмент — всё равно отвергнем как неполный
        _reject(
            "Укажите полный путь group/project на GitLab",
            hint="Пример: https://gitlab.com/group/my-world",
        )
    ref = m.group("ref") or "main"
    repo_name = full_path.rsplit("/", 1)[-1]
    # GitLab archive: /group/repo/-/archive/ref/repo-ref.zip
    archive = (
        f"https://gitlab.com/{full_path}/-/archive/{ref}/{repo_name}-{ref}.zip"
    )
    return ParsedGitUrl(
        original_url=original,
        host=host,
        provider="gitlab",
        owner_or_path=full_path,
        repo=repo_name,
        ref=ref,
        archive_url=archive,
    )


def _validate_redirect_target(location: str) -> str:
    """Проверяет Location редиректа: https + белый список + не частный IP."""
    if not location:
        _reject("Пустой Location при редиректе")
    # Относительный Location — соберём позже вызывающим; здесь только абсолютные.
    parsed = urlparse(location)
    if not parsed.scheme:
        return location  # relative — caller joins
    if parsed.scheme.lower() != "https":
        _reject(
            "Редирект на не-HTTPS запрещён",
            hint="Источник не должен уводить на http:// или file://",
            location=location,
        )
    host = (parsed.hostname or "").lower().rstrip(".")
    if not host or not _host_allowed(host):
        _reject(
            "Редирект на хост вне белого списка",
            host=host or "(нет)",
            location=location,
        )
    assert_host_resolves_public(host)
    return location


def _join_redirect(base: str, location: str) -> str:
    if location.startswith("http://") or location.startswith("https://"):
        return location
    base_p = urlparse(base)
    if location.startswith("/"):
        return urlunparse((base_p.scheme, base_p.netloc, location, "", "", ""))
    # relative path
    base_dir = base_p.path.rsplit("/", 1)[0] + "/"
    return urlunparse(
        (base_p.scheme, base_p.netloc, base_dir + location, "", "", "")
    )


def download_git_archive(
    parsed: ParsedGitUrl,
    *,
    client: httpx.Client | None = None,
    resolve_host: Callable[[str], None] = assert_host_resolves_public,
) -> bytes:
    """Скачивает zip-архив ветки с потолком размера и без follow на частные IP."""
    resolve_host(urlparse(parsed.archive_url).hostname or "")

    own_client = client is None
    http = client or httpx.Client(
        timeout=GIT_FETCH_TIMEOUT_SEC,
        follow_redirects=False,
        trust_env=False,
    )
    url = parsed.archive_url
    try:
        for _ in range(GIT_MAX_REDIRECTS + 1):
            try:
                with http.stream("GET", url) as resp:
                    if resp.status_code in {301, 302, 303, 307, 308}:
                        loc = resp.headers.get("location") or ""
                        joined = _join_redirect(url, loc)
                        checked = _validate_redirect_target(joined)
                        # relative already joined; absolute re-checked
                        if checked.startswith("http"):
                            next_url = checked
                        else:
                            next_url = joined
                            _validate_redirect_target(next_url)
                        host = urlparse(next_url).hostname or ""
                        resolve_host(host)
                        url = next_url
                        continue

                    if resp.status_code == 404:
                        raise AppError(
                            "Репозиторий или ветка не найдены",
                            code="git_url_rejected",
                            status_code=400,
                            data={
                                "hint": "Проверьте, что репозиторий публичный и ветка существует",
                                "url": parsed.original_url,
                                "ref": parsed.ref,
                            },
                        )
                    if resp.status_code >= 400:
                        raise AppError(
                            "Не удалось скачать архив репозитория",
                            code="git_url_rejected",
                            status_code=400,
                            data={
                                "hint": "Проверьте URL и доступность репозитория",
                                "status_code": resp.status_code,
                            },
                        )

                    cl = resp.headers.get("content-length")
                    if cl is not None:
                        try:
                            if int(cl) > MAX_GIT_ARCHIVE_BYTES:
                                raise AppError(
                                    "Архив репозитория слишком большой",
                                    code="file_too_large",
                                    status_code=400,
                                    data={
                                        "hint": (
                                            f"Потолок архива git — {MAX_GIT_ARCHIVE_BYTES} байт "
                                            f"(~{MAX_GIT_ARCHIVE_BYTES // (1024 * 1024)} МБ). "
                                            "Полный Who (~446 МБ) не принимаем — залейте урезанный zip "
                                            "или публичный репозиторий без тяжёлых бинарников."
                                        ),
                                        "content_length": int(cl),
                                    },
                                )
                        except ValueError:
                            pass

                    chunks: list[bytes] = []
                    total = 0
                    for chunk in resp.iter_bytes():
                        if not chunk:
                            continue
                        total += len(chunk)
                        if total > MAX_GIT_ARCHIVE_BYTES:
                            raise AppError(
                                "Архив репозитория слишком большой",
                                code="file_too_large",
                                status_code=400,
                                data={
                                    "hint": (
                                        f"Потолок архива git — {MAX_GIT_ARCHIVE_BYTES} байт. "
                                        "Сократите репозиторий или используйте zip/папку."
                                    ),
                                },
                            )
                        chunks.append(chunk)
                    data = b"".join(chunks)
                    if not data:
                        raise AppError(
                            "Пустой ответ при скачивании архива",
                            code="git_url_rejected",
                            status_code=400,
                            data={"hint": "Проверьте URL репозитория"},
                        )
                    # Не логируем URL с query/token — только провайдер и размер.
                    logger.info(
                        "world_import_git archive fetched provider=%s bytes=%s",
                        parsed.provider,
                        len(data),
                    )
                    return data
            except httpx.TimeoutException as exc:
                raise AppError(
                    "Таймаут при скачивании git-архива",
                    code="git_url_rejected",
                    status_code=400,
                    data={
                        "hint": f"Превышен лимит {int(GIT_FETCH_TIMEOUT_SEC)} с",
                    },
                ) from exc
            except httpx.HTTPError as exc:
                raise AppError(
                    "Ошибка сети при скачивании git-архива",
                    code="git_url_rejected",
                    status_code=400,
                    data={"hint": "Проверьте доступность репозитория", "detail": str(exc)},
                ) from exc

        raise AppError(
            "Слишком много редиректов при скачивании архива",
            code="git_url_rejected",
            status_code=400,
            data={"hint": "Проверьте URL репозитория"},
        )
    finally:
        if own_client:
            http.close()


def _common_top_prefix(names: list[str]) -> str | None:
    """Если все пути начинаются с одного сегмента (Who-main/), вернуть его."""
    tops: set[str] = set()
    for name in names:
        parts = [p for p in name.replace("\\", "/").split("/") if p]
        if not parts:
            continue
        if len(parts) == 1:
            # файл в корне — общего префикса-папки нет
            return None
        tops.add(parts[0])
        if len(tops) > 1:
            return None
    if len(tops) == 1:
        return next(iter(tops))
    return None


def extract_git_archive_to_files(data: bytes) -> list[VaultFile]:
    """Распаковывает zip-архив git (с корневой папкой репо) в файлы хранилища."""
    import io
    import zipfile
    from pathlib import PurePosixPath

    from app.services.world_vault_parse import normalize_vault_path

    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise AppError(
            "Скачанный архив не является zip",
            code="bad_zip",
            status_code=400,
            data={"hint": "Ожидался zip ветки с github/gitlab"},
        ) from exc

    names = [
        info.filename
        for info in zf.infolist()
        if not info.is_dir()
        and not PurePosixPath(info.filename).name.startswith(".")
        and not info.filename.startswith("__MACOSX/")
    ]
    prefix = _common_top_prefix(names)

    # Переписываем пути: снимаем Who-main/ → затем обычный extract_zip_to_files.
    if prefix:
        out = io.BytesIO()
        with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as dst:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                name = info.filename.replace("\\", "/")
                if name.startswith("__MACOSX/"):
                    continue
                parts = [p for p in name.split("/") if p]
                if not parts:
                    continue
                if parts[0] != prefix:
                    continue
                rel = "/".join(parts[1:])
                if not rel:
                    continue
                try:
                    rel = normalize_vault_path(rel)
                except AppError:
                    continue
                dst.writestr(rel, zf.read(info))
        zf.close()
        return extract_zip_to_files(out.getvalue())

    zf.close()
    return extract_zip_to_files(data)


def fetch_vault_files_from_git_url(
    url: str,
    *,
    client: httpx.Client | None = None,
    resolve_host: Callable[[str], None] | None = None,
) -> tuple[ParsedGitUrl, list[VaultFile]]:
    """Валидация → скачивание архива → разбор в VaultFile (без записи в БД)."""
    parsed = validate_git_url(url)
    kwargs: dict = {"client": client}
    if resolve_host is not None:
        kwargs["resolve_host"] = resolve_host
    data = download_git_archive(parsed, **kwargs)
    files = extract_git_archive_to_files(data)
    return parsed, files
