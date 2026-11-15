"""W-API-09: валидация публичных git-URL и защита от SSRF."""

from __future__ import annotations

import ipaddress
from unittest.mock import MagicMock

import httpx
import pytest

from app.core.exceptions import AppError
from app.services.world_import_git import (
    ALLOWED_GIT_HOSTS,
    MAX_GIT_ARCHIVE_BYTES,
    download_git_archive,
    validate_git_url,
)


def test_github_who_url_accepted():
    parsed = validate_git_url("https://github.com/igorpogulaev485-code/Who")
    assert parsed.provider == "github"
    assert parsed.owner_or_path == "igorpogulaev485-code"
    assert parsed.repo == "Who"
    assert parsed.ref == "main"
    assert "codeload.github.com" in parsed.archive_url
    assert "igorpogulaev485-code/Who" in parsed.archive_url


def test_github_url_with_git_suffix_and_tree():
    parsed = validate_git_url(
        "https://github.com/igorpogulaev485-code/Who.git"
    )
    assert parsed.repo == "Who"
    parsed2 = validate_git_url(
        "https://github.com/owner/repo/tree/develop"
    )
    assert parsed2.ref == "develop"
    assert "refs/heads/develop" in parsed2.archive_url


def test_gitlab_url_accepted():
    parsed = validate_git_url("https://gitlab.com/group/my-world")
    assert parsed.provider == "gitlab"
    assert parsed.repo == "my-world"
    assert "/-/archive/main/" in parsed.archive_url


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "http://127.0.0.1/repo",
        "https://127.0.0.1/",
        "http://localhost/x",
        "https://localhost/x",
        "file:///etc/passwd",
        "https://169.254.169.254/",
        "https://169.254.169.254/latest/meta-data",
        "https://10.0.0.1/secret",
        "https://192.168.1.1/x",
        "ftp://github.com/owner/repo",
        "https://evil.example.com/owner/repo",
        "https://raw.githubusercontent.com/owner/repo/main/x.md",
        "",
        "   ",
    ],
)
def test_rejected_urls(url: str):
    with pytest.raises(AppError) as ei:
        validate_git_url(url)
    assert ei.value.code == "git_url_rejected"


def test_allowed_hosts_include_codeload():
    assert "github.com" in ALLOWED_GIT_HOSTS
    assert "codeload.github.com" in ALLOWED_GIT_HOSTS
    assert "gitlab.com" in ALLOWED_GIT_HOSTS


def test_redirect_to_private_ip_rejected():
    parsed = validate_git_url("https://github.com/igorpogulaev485-code/Who")

    def resolve_ok(host: str) -> None:
        # первая цель (codeload) — ок; редирект проверит Location
        return None

    # Мок httpx: первый ответ — редирект на metadata IP.
    req = httpx.Request("GET", parsed.archive_url)
    redirect = httpx.Response(
        302,
        headers={"location": "https://169.254.169.254/latest/meta-data"},
        request=req,
    )

    class FakeStream:
        def __init__(self, response):
            self._response = response

        def __enter__(self):
            return self._response

        def __exit__(self, *args):
            return False

    client = MagicMock()
    client.stream = MagicMock(return_value=FakeStream(redirect))

    with pytest.raises(AppError) as ei:
        download_git_archive(parsed, client=client, resolve_host=resolve_ok)
    assert ei.value.code == "git_url_rejected"
    assert "белый список" in (ei.value.message + str(ei.value.data)).lower() or (
        "редирект" in ei.value.message.lower()
    )


def test_redirect_to_http_rejected():
    parsed = validate_git_url("https://github.com/owner/repo")
    req = httpx.Request("GET", parsed.archive_url)
    redirect = httpx.Response(
        302,
        headers={"location": "http://github.com/owner/repo"},
        request=req,
    )

    class FakeStream:
        def __enter__(self):
            return redirect

        def __exit__(self, *args):
            return False

    client = MagicMock()
    client.stream = MagicMock(return_value=FakeStream())

    with pytest.raises(AppError) as ei:
        download_git_archive(parsed, client=client, resolve_host=lambda h: None)
    assert ei.value.code == "git_url_rejected"


def test_oversized_content_length_rejected():
    parsed = validate_git_url("https://github.com/owner/repo")
    req = httpx.Request("GET", parsed.archive_url)
    too_big = MAX_GIT_ARCHIVE_BYTES + 1
    resp = httpx.Response(
        200,
        headers={"content-length": str(too_big)},
        request=req,
    )

    # iter_bytes не должен вызываться — отказ по Content-Length
    class FakeStream:
        def __enter__(self):
            return resp

        def __exit__(self, *args):
            return False

    client = MagicMock()
    client.stream = MagicMock(return_value=FakeStream())

    with pytest.raises(AppError) as ei:
        download_git_archive(parsed, client=client, resolve_host=lambda h: None)
    assert ei.value.code == "file_too_large"


def test_assert_host_blocks_resolved_private(monkeypatch):
    import socket

    from app.services import world_import_git as mod

    def fake_getaddrinfo(host, port):
        return [(2, 1, 6, "", ("10.1.2.3", 0))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    with pytest.raises(AppError) as ei:
        mod.assert_host_resolves_public("github.com")
    assert ei.value.code == "git_url_rejected"
    assert "10.1.2.3" in str(ei.value.data)


def test_ip_literal_helpers():
    assert ipaddress.ip_address("127.0.0.1").is_loopback
    assert ipaddress.ip_address("169.254.169.254").is_link_local
