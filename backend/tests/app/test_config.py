"""Test config"""

from neuroagent.app.config import Settings


def test_required(monkeypatch):
    settings = Settings()

    assert (
        settings.tools.literature.url
        == "https://www.openbraininstitute.org/api/literature"
    )
    assert settings.llm.openai_token is None

    # make sure not case sensitive
    monkeypatch.setenv("neuroagent_tools__literature__URL", "https://new_fake_url")

    settings = Settings()
    assert settings.tools.literature.url == "https://new_fake_url"
