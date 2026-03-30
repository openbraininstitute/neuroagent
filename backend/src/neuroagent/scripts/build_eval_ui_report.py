"""Build a self-contained static eval UI report.

The generated report is meant to be downloaded as a GitHub artifact and opened
directly in a browser (similar to Playwright HTML reports), without needing a
local HTTP server.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path


JQUERY_CDN_TAG_RE = re.compile(
    r'<script\s+src="https://code\.jquery\.com/jquery-3\.7\.1\.min\.js"[^>]*></script>'
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build self-contained eval UI report")
    parser.add_argument(
        "--detailed-json",
        type=Path,
        default=Path("backend/eval/output/detailed.json"),
        help="Path to detailed.json",
    )
    parser.add_argument(
        "--ui-dir",
        type=Path,
        default=Path("backend/eval/ui"),
        help="Path to eval UI directory",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("backend/eval/output/ui-report"),
        help="Output directory for packaged report",
    )
    parser.add_argument(
        "--jquery-file",
        type=Path,
        default=None,
        help="Optional local jquery.min.js to bundle and reference",
    )
    return parser.parse_args()


def _make_embedded_data_script(data: object) -> str:
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    payload = payload.replace("</", "<\\/")
    return f"<script>\nwindow.__EVAL_DATA__ = {payload};\n</script>\n"


def _patch_html(html_text: str, embedded_data_script: str, bundle_local_jquery: bool) -> str:
    patched = html_text
    if bundle_local_jquery:
        patched = JQUERY_CDN_TAG_RE.sub(
            '<script src="./jquery-3.7.1.min.js"></script>', patched
        )

    app_script = '<script src="./app.js"></script>'
    if app_script in patched:
        patched = patched.replace(app_script, embedded_data_script + app_script, 1)

    return patched


def build_report(
    detailed_json_path: Path,
    ui_dir: Path,
    output_dir: Path,
    jquery_file: Path | None,
) -> None:
    if not detailed_json_path.exists():
        raise FileNotFoundError(f"Missing detailed.json: {detailed_json_path}")
    if not ui_dir.exists():
        raise FileNotFoundError(f"Missing UI directory: {ui_dir}")

    data = json.loads(detailed_json_path.read_text(encoding="utf-8"))

    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    report_ui_dir = output_dir / "ui"
    shutil.copytree(ui_dir, report_ui_dir)

    report_output_dir = output_dir / "output"
    report_output_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(detailed_json_path, report_output_dir / "detailed.json")

    bundle_local_jquery = bool(jquery_file and jquery_file.exists())
    if bundle_local_jquery and jquery_file is not None:
        shutil.copy2(jquery_file, report_ui_dir / "jquery-3.7.1.min.js")

    embedded_data_script = _make_embedded_data_script(data)
    for html_file in report_ui_dir.glob("*.html"):
        original = html_file.read_text(encoding="utf-8")
        patched = _patch_html(original, embedded_data_script, bundle_local_jquery)
        html_file.write_text(patched, encoding="utf-8")

    readme = output_dir / "README.txt"
    readme.write_text(
        "\n".join(
            [
                "Neuroagent Eval UI Report",
                "",
                "How to view:",
                "1) Open ui/index.html directly in your browser.",
                "2) Or open ui/products.html for product aggregation.",
                "",
                "Notes:",
                "- This report embeds detailed.json into the HTML, so no local server is required.",
                "- A copy of the raw data is available in output/detailed.json.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> None:
    args = parse_args()
    build_report(
        detailed_json_path=args.detailed_json,
        ui_dir=args.ui_dir,
        output_dir=args.output_dir,
        jquery_file=args.jquery_file,
    )


if __name__ == "__main__":
    main()
