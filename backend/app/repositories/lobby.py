from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.character import Character
from app.models.journal import CampaignJournalEntry
from app.models.lobby import (
    LOBBY_ROLE_LEAD_TODAY,
    Lobby,
    LobbyMember,
    LobbyRole,
    PlaySession,
    SessionSeat,
    Setting,
    generate_invite_code,
)
from app.models.session_event import SessionEvent


class LobbyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, lobby_id: UUID) -> Lobby | None:
        return self.db.scalar(
            select(Lobby)
            .where(Lobby.id == lobby_id)
            .options(
                selectinload(Lobby.members),
                selectinload(Lobby.roles),
                selectinload(Lobby.settings),
                selectinload(Lobby.sessions).selectinload(PlaySession.seats),
                selectinload(Lobby.sessions).selectinload(PlaySession.setting),
            )
        )

    def get_by_invite_code(self, code: str) -> Lobby | None:
        return self.db.scalar(
            select(Lobby)
            .where(Lobby.invite_code == code.upper())
            .options(
                selectinload(Lobby.members),
                selectinload(Lobby.roles),
            )
        )

    def list_for_user(self, user_id: UUID) -> list[Lobby]:
        member_lobby_ids = select(LobbyMember.lobby_id).where(LobbyMember.user_id == user_id)
        role_lobby_ids = select(LobbyRole.lobby_id).where(LobbyRole.user_id == user_id)
        return list(
            self.db.scalars(
                select(Lobby)
                .where(
                    or_(
                        Lobby.owner_id == user_id,
                        Lobby.id.in_(member_lobby_ids),
                        Lobby.id.in_(role_lobby_ids),
                    )
                )
                .options(
                    selectinload(Lobby.members),
                    selectinload(Lobby.roles),
                    selectinload(Lobby.sessions),
                )
                .order_by(Lobby.updated_at.desc())
            ).all()
        )

    def create(self, *, owner_id: UUID, name: str) -> Lobby:
        code = generate_invite_code()
        # редкий коллизионный ретрай
        for _ in range(8):
            exists = self.db.scalar(select(Lobby.id).where(Lobby.invite_code == code))
            if exists is None:
                break
            code = generate_invite_code()
        lobby = Lobby(owner_id=owner_id, name=name, invite_code=code)
        self.db.add(lobby)
        self.db.flush()
        return lobby

    def allocate_invite_code(self, *, exclude_lobby_id: UUID | None = None) -> str:
        """Новый уникальный код (ретрай коллизий, как при create)."""
        code = generate_invite_code()
        for _ in range(8):
            q = select(Lobby.id).where(Lobby.invite_code == code)
            if exclude_lobby_id is not None:
                q = q.where(Lobby.id != exclude_lobby_id)
            exists = self.db.scalar(q)
            if exists is None:
                return code
            code = generate_invite_code()
        return code

    def get_member(self, lobby_id: UUID, character_id: UUID) -> LobbyMember | None:
        return self.db.scalar(
            select(LobbyMember).where(
                LobbyMember.lobby_id == lobby_id,
                LobbyMember.character_id == character_id,
            )
        )

    def get_membership_by_character(self, character_id: UUID) -> LobbyMember | None:
        """L-04: персонаж не более чем в одном лобби."""
        return self.db.scalar(
            select(LobbyMember)
            .where(LobbyMember.character_id == character_id)
            .options(selectinload(LobbyMember.lobby))
        )

    def get_lobby_name(self, lobby_id: UUID) -> str | None:
        return self.db.scalar(select(Lobby.name).where(Lobby.id == lobby_id))

    def get_invite_row(self, code: str) -> Lobby | None:
        """Только код и имя — без состава (метаданные до входа)."""
        return self.db.scalar(
            select(Lobby).where(Lobby.invite_code == code.upper())
        )

    def is_owner_of_character_lobby(self, *, owner_id: UUID, character_id: UUID) -> bool:
        """Мастер хотя бы одного лобби, где этот персонаж в составе."""
        lobby_id = self.db.scalar(
            select(Lobby.id)
            .join(LobbyMember, LobbyMember.lobby_id == Lobby.id)
            .where(
                Lobby.owner_id == owner_id,
                LobbyMember.character_id == character_id,
            )
            .limit(1)
        )
        return lobby_id is not None

    def share_lobby_ids(self, a: UUID, b: UUID) -> bool:
        """True if both characters sit in at least one common lobby (Р25)."""
        a_lobbies = select(LobbyMember.lobby_id).where(LobbyMember.character_id == a)
        shared = self.db.scalar(
            select(LobbyMember.lobby_id)
            .where(
                LobbyMember.character_id == b,
                LobbyMember.lobby_id.in_(a_lobbies),
            )
            .limit(1)
        )
        return shared is not None

    def add_member(
        self,
        *,
        lobby_id: UUID,
        character_id: UUID,
        user_id: UUID,
    ) -> LobbyMember:
        member = LobbyMember(
            lobby_id=lobby_id,
            character_id=character_id,
            user_id=user_id,
        )
        self.db.add(member)
        self.db.flush()
        return member

    def remove_member(self, member: LobbyMember) -> None:
        self.db.delete(member)
        self.db.flush()

    def get_setting(self, setting_id: UUID) -> Setting | None:
        return self.db.scalar(
            select(Setting)
            .where(Setting.id == setting_id)
            .options(selectinload(Setting.pages))
        )

    def create_setting(self, *, lobby_id: UUID, name: str, world_notes: str) -> Setting:
        from app.models.setting_page import SettingPage

        setting = Setting(lobby_id=lobby_id, name=name, world_notes=world_notes)
        self.db.add(setting)
        self.db.flush()
        # C1: сразу корневая страница «Мир»
        self.db.add(
            SettingPage(
                setting_id=setting.id,
                parent_id=None,
                title="Мир",
                body=world_notes or "",
                sort_order=0,
            )
        )
        self.db.flush()
        return setting

    def list_setting_pages(self, setting_id: UUID) -> list:
        from app.models.setting_page import SettingPage

        return list(
            self.db.scalars(
                select(SettingPage)
                .where(SettingPage.setting_id == setting_id)
                .order_by(SettingPage.sort_order.asc(), SettingPage.created_at.asc())
            ).all()
        )

    def get_setting_page(self, page_id: UUID):
        from app.models.setting_page import SettingPage

        return self.db.get(SettingPage, page_id)

    def create_setting_page(
        self,
        *,
        setting_id: UUID,
        title: str,
        body: str,
        parent_id: UUID | None,
        sort_order: int,
        page_kind: str = "note",
        template_id: UUID | None = None,
        fields: dict | None = None,
        quest_status: str | None = None,
        gm_body: str = "",
        tags: list[str] | None = None,
    ):
        from app.models.setting_page import SettingPage

        page = SettingPage(
            setting_id=setting_id,
            parent_id=parent_id,
            title=title,
            body=body,
            gm_body=gm_body or "",
            sort_order=sort_order,
            page_kind=page_kind,
            template_id=template_id,
            fields=fields if fields is not None else {},
            quest_status=quest_status,
            tags=list(tags) if tags is not None else [],
        )
        self.db.add(page)
        self.db.flush()
        return page

    def list_setting_page_templates(self, setting_id: UUID | None = None) -> list:
        """Системные (setting_id IS NULL) + шаблоны этого сеттинга."""
        from app.models.setting_page_template import SettingPageTemplate

        stmt = select(SettingPageTemplate).where(SettingPageTemplate.enabled.is_(True))
        if setting_id is None:
            stmt = stmt.where(SettingPageTemplate.setting_id.is_(None))
        else:
            stmt = stmt.where(
                (SettingPageTemplate.setting_id.is_(None))
                | (SettingPageTemplate.setting_id == setting_id)
            )
        return list(
            self.db.scalars(
                stmt.order_by(
                    SettingPageTemplate.page_kind.asc(),
                    SettingPageTemplate.name.asc(),
                )
            ).all()
        )

    def get_setting_page_template(self, template_id: UUID):
        from app.models.setting_page_template import SettingPageTemplate

        return self.db.get(SettingPageTemplate, template_id)

    def delete_setting_page(self, page) -> None:
        self.db.delete(page)
        self.db.flush()

    def list_setting_page_links(self, setting_id: UUID) -> list:
        from app.models.setting_page import SettingPage
        from app.models.setting_page_link import SettingPageLink

        return list(
            self.db.scalars(
                select(SettingPageLink)
                .join(SettingPage, SettingPageLink.from_page_id == SettingPage.id)
                .where(SettingPage.setting_id == setting_id)
                .order_by(SettingPageLink.created_at.asc())
            ).all()
        )

    def get_setting_page_link(self, link_id: UUID):
        from app.models.setting_page_link import SettingPageLink

        return self.db.get(SettingPageLink, link_id)

    def create_setting_page_link(
        self,
        *,
        from_page_id: UUID,
        to_page_id: UUID,
        label: str,
        kind: str = "semantic",
        visibility: str = "all",
    ):
        from app.models.setting_page_link import SettingPageLink

        link = SettingPageLink(
            from_page_id=from_page_id,
            to_page_id=to_page_id,
            label=label,
            kind=kind,
            visibility=visibility if visibility in ("all", "gm") else "all",
        )
        self.db.add(link)
        self.db.flush()
        return link

    def delete_setting_page_links_of_kind(self, *, from_page_id: UUID, kind: str) -> int:
        from app.models.setting_page_link import SettingPageLink

        links = list(
            self.db.scalars(
                select(SettingPageLink).where(
                    SettingPageLink.from_page_id == from_page_id,
                    SettingPageLink.kind == kind,
                )
            ).all()
        )
        for link in links:
            self.db.delete(link)
        if links:
            self.db.flush()
        return len(links)

    def delete_setting_page_link(self, link) -> None:
        self.db.delete(link)
        self.db.flush()

    def list_setting_artifacts(self, setting_id: UUID) -> list:
        from app.models.setting_artifact import SettingArtifact

        return list(
            self.db.scalars(
                select(SettingArtifact)
                .where(SettingArtifact.setting_id == setting_id)
                .order_by(SettingArtifact.sort_order.asc(), SettingArtifact.created_at.asc())
            ).all()
        )

    def get_setting_artifact(self, artifact_id: UUID):
        from app.models.setting_artifact import SettingArtifact

        return self.db.get(SettingArtifact, artifact_id)

    def create_setting_artifact(self, **kwargs):
        from app.models.setting_artifact import SettingArtifact

        row = SettingArtifact(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def delete_setting_artifact(self, artifact) -> None:
        self.db.delete(artifact)
        self.db.flush()

    def delete_setting(self, setting: Setting) -> None:
        self.db.delete(setting)
        self.db.flush()

    def get_session(self, session_id: UUID) -> PlaySession | None:
        return self.db.scalar(
            select(PlaySession)
            .where(PlaySession.id == session_id)
            .options(
                selectinload(PlaySession.seats),
                selectinload(PlaySession.setting),
                selectinload(PlaySession.lobby).selectinload(Lobby.members),
                selectinload(PlaySession.lobby).selectinload(Lobby.roles),
            )
        )

    def list_roles(self, lobby_id: UUID) -> list[LobbyRole]:
        return list(
            self.db.scalars(
                select(LobbyRole)
                .where(LobbyRole.lobby_id == lobby_id)
                .order_by(LobbyRole.created_at.asc())
            ).all()
        )

    def get_role(
        self,
        lobby_id: UUID,
        user_id: UUID,
        role: str,
        *,
        session_id: UUID | None = None,
    ) -> LobbyRole | None:
        stmt = select(LobbyRole).where(
            LobbyRole.lobby_id == lobby_id,
            LobbyRole.user_id == user_id,
            LobbyRole.role == role,
        )
        if role == LOBBY_ROLE_LEAD_TODAY:
            if session_id is None:
                return None
            stmt = stmt.where(LobbyRole.session_id == session_id)
        else:
            stmt = stmt.where(LobbyRole.session_id.is_(None))
        return self.db.scalar(stmt.limit(1))

    def get_lead_today_for_session(self, session_id: UUID) -> LobbyRole | None:
        return self.db.scalar(
            select(LobbyRole)
            .where(
                LobbyRole.session_id == session_id,
                LobbyRole.role == LOBBY_ROLE_LEAD_TODAY,
            )
            .limit(1)
        )

    def add_role(
        self,
        *,
        lobby_id: UUID,
        user_id: UUID,
        role: str,
        assigned_by: UUID | None,
        session_id: UUID | None = None,
        character_fate: str | None = None,
        character_id: UUID | None = None,
    ) -> LobbyRole:
        row = LobbyRole(
            lobby_id=lobby_id,
            user_id=user_id,
            role=role,
            assigned_by=assigned_by,
            session_id=session_id,
            character_fate=character_fate,
            character_id=character_id,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def remove_role(self, role: LobbyRole) -> None:
        self.db.delete(role)
        self.db.flush()

    def remove_roles_for_user(
        self,
        lobby_id: UUID,
        user_id: UUID,
        *,
        roles: set[str] | None = None,
    ) -> int:
        stmt = select(LobbyRole).where(
            LobbyRole.lobby_id == lobby_id,
            LobbyRole.user_id == user_id,
        )
        if roles is not None:
            stmt = stmt.where(LobbyRole.role.in_(roles))
        rows = list(self.db.scalars(stmt).all())
        for row in rows:
            self.db.delete(row)
        if rows:
            self.db.flush()
        return len(rows)

    def clear_lead_today_for_session(self, session_id: UUID) -> LobbyRole | None:
        row = self.get_lead_today_for_session(session_id)
        if row is not None:
            self.db.delete(row)
            self.db.flush()
        return row

    def list_member_user_ids(self, lobby_id: UUID) -> set[UUID]:
        return set(
            self.db.scalars(
                select(LobbyMember.user_id).where(LobbyMember.lobby_id == lobby_id)
            ).all()
        )

    def create_session(
        self,
        *,
        lobby_id: UUID,
        name: str,
        setting_id: UUID | None,
    ) -> PlaySession:
        session = PlaySession(lobby_id=lobby_id, name=name, setting_id=setting_id)
        self.db.add(session)
        self.db.flush()
        return session

    def delete_session(self, session: PlaySession) -> None:
        self.db.delete(session)
        self.db.flush()

    def get_seat(self, session_id: UUID, character_id: UUID) -> SessionSeat | None:
        return self.db.scalar(
            select(SessionSeat).where(
                SessionSeat.session_id == session_id,
                SessionSeat.character_id == character_id,
            )
        )

    def list_open_session_ids_for_character(self, character_id: UUID) -> list[UUID]:
        """Открытые сессии, где персонаж сидит за столом (L08)."""
        rows = self.db.scalars(
            select(SessionSeat.session_id)
            .join(PlaySession, PlaySession.id == SessionSeat.session_id)
            .where(
                SessionSeat.character_id == character_id,
                PlaySession.closed_at.is_(None),
            )
        ).all()
        return list(rows)

    def add_seat(self, *, session_id: UUID, character_id: UUID) -> SessionSeat:
        seat = SessionSeat(session_id=session_id, character_id=character_id)
        self.db.add(seat)
        self.db.flush()
        return seat

    def remove_seat(self, seat: SessionSeat) -> None:
        self.db.delete(seat)
        self.db.flush()

    def list_retained_seats(self, session_id: UUID) -> list[SessionSeat]:
        return list(
            self.db.scalars(
                select(SessionSeat).where(
                    SessionSeat.session_id == session_id,
                    SessionSeat.retained_after_kick.is_not(None),
                )
            ).all()
        )

    def purge_retained_seats_for_session(self, session_id: UUID) -> int:
        """Снять места, оставленные после кика (конец боя / закрытие сессии)."""
        seats = self.list_retained_seats(session_id)
        for seat in seats:
            self.db.delete(seat)
        if seats:
            self.db.flush()
        return len(seats)

    def get_characters_map(self, character_ids: list[UUID]) -> dict[UUID, Character]:
        if not character_ids:
            return {}
        rows = self.db.scalars(
            select(Character).where(
                Character.id.in_(character_ids),
                Character.deleted_at.is_(None),
            )
        ).all()
        return {row.id: row for row in rows}

    def list_session_events(
        self,
        session_id: UUID,
        *,
        rolls_only: bool = False,
        limit: int = 100,
    ) -> list[SessionEvent]:
        stmt = select(SessionEvent).where(SessionEvent.session_id == session_id)
        if rolls_only:
            stmt = stmt.where(SessionEvent.event_type == "roll")
        stmt = stmt.order_by(SessionEvent.created_at.desc()).limit(limit)
        return list(self.db.scalars(stmt).all())

    def add_session_event(self, event: SessionEvent) -> SessionEvent:
        self.db.add(event)
        self.db.flush()
        return event

    def count_journal_entries(self, lobby_id: UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(CampaignJournalEntry)
                .where(CampaignJournalEntry.lobby_id == lobby_id)
            )
            or 0
        )

    def list_journal_entries(
        self,
        lobby_id: UUID,
        *,
        offset: int = 0,
        limit: int = 20,
    ) -> list[CampaignJournalEntry]:
        stmt = (
            select(CampaignJournalEntry)
            .where(CampaignJournalEntry.lobby_id == lobby_id)
            .order_by(CampaignJournalEntry.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_journal_entry(self, entry_id: UUID) -> CampaignJournalEntry | None:
        return self.db.scalar(
            select(CampaignJournalEntry).where(CampaignJournalEntry.id == entry_id)
        )

    def add_journal_entry(self, entry: CampaignJournalEntry) -> CampaignJournalEntry:
        self.db.add(entry)
        self.db.flush()
        return entry

    def delete_journal_entry(self, entry: CampaignJournalEntry) -> None:
        self.db.delete(entry)
        self.db.flush()

    def delete_lobby(self, lobby: Lobby) -> None:
        self.db.delete(lobby)
        self.db.flush()
