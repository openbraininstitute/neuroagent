"""Test config"""

from neuroagent.app.config import Settings


def test_required(monkeypatch):
    settings = Settings()

    assert settings.tools.literature.url == "https://fake_url"
    assert settings.llm.openai_token.get_secret_value() == "dummy"

    # make sure not case sensitive
    monkeypatch.delenv("NEUROAGENT_TOOLS__LITERATURE__URL")
    monkeypatch.setenv("neuroagent_tools__literature__URL", "https://new_fake_url")

    settings = Settings()
    assert settings.tools.literature.url == "https://new_fake_url"
