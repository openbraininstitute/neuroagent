"""Test config"""

from neuroagent.app.config import Settings


def test_required(monkeypatch):
    settings = Settings()

    assert settings.llm.openai_token is None

    # make sure not case sensitive
    monkeypatch.setenv("neuroagent__tools__entitycore__URL", "https://new_fake_url")

    settings = Settings()
    assert settings.tools.entitycore.url == "https://new_fake_url"
