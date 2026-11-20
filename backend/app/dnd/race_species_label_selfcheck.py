"""Run: PYTHONPATH=backend python -m app.dnd.race_species_label_selfcheck"""

from __future__ import annotations

from app.dnd.race_species_label import (
    race_species_label,
    race_species_label_title,
    race_species_section_title,
)
from app.models.character import RulesEdition


def main() -> None:
    assert race_species_label("2014") == "раса"
    assert race_species_label("2024") == "вид"
    assert race_species_label(None) == "раса"
    assert race_species_label(RulesEdition.edition_2014) == "раса"
    assert race_species_label(RulesEdition.edition_2024) == "вид"
    assert race_species_label_title("2014") == "Раса"
    assert race_species_label_title("2024") == "Вид"
    assert race_species_section_title("2014") == "Раса и прошлое"
    assert race_species_section_title("2024") == "Вид и прошлое"
    print("race_species_label selfcheck ok")


if __name__ == "__main__":
    main()
