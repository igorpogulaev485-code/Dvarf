from app.dnd.content_layer import layer_for_source

def main() -> None:
    assert layer_for_source("srd-5.1", kind="spell") == "srd"
    assert layer_for_source("phb-2014", kind="spell") == "community_ref"
    assert layer_for_source("phb", kind="race", slug="human") == "srd"
    assert layer_for_source("mpmm", kind="race", slug="aarakocra") == "community_ref"
    assert layer_for_source("homebrew", kind="spell") == "homebrew"
    assert layer_for_source(None, kind="race", slug="elf") == "srd"
    print("content_layer selfcheck ok")

if __name__ == "__main__":
    main()
