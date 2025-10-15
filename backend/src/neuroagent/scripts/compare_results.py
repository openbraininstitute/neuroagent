#!/usr/bin/env python3
"""Compare evaluation results between two versions."""

import argparse
import json
from pathlib import Path
from typing import Any

import pandas as pd
from colorama import Fore, Style, init

# Initialize colorama for cross-platform color support
# Force colors even in non-TTY environments (like GitHub Actions)
init(autoreset=True, strip=False)


def get_score_color(score: float) -> str:
    """Get color for a score value (0=red, 1=green, spectrum in between)."""
    if score == 0:
        return Fore.RED
    elif score == 1:
        return Fore.GREEN
    elif score >= 0.8:
        return Fore.LIGHTGREEN_EX
    elif score >= 0.6:
        return Fore.YELLOW
    elif score >= 0.4:
        return Fore.LIGHTYELLOW_EX
    elif score >= 0.2:
        return Fore.LIGHTRED_EX
    else:
        return Fore.RED


def get_diff_color(diff: float) -> str:
    """Get color for a difference value (positive=green, negative=red)."""
    if diff > 0:
        return Fore.GREEN
    elif diff < 0:
        return Fore.RED
    else:
        return Fore.WHITE


def format_score_with_color(score: float, precision: int = 3) -> str:
    """Format score with color based on value."""
    color = get_score_color(score)
    return f"{color}{score:.{precision}f}{Style.RESET_ALL}"


def format_diff_with_color(
    old_score: float, new_score: float, precision: int = 3
) -> str:
    """Format difference with color based on improvement/regression."""
    diff = new_score - old_score
    diff_color = get_diff_color(diff)

    if diff > 0:
        diff_str = f"+{diff:.{precision}f}"
    elif diff < 0:
        diff_str = f"{diff:.{precision}f}"
    else:
        diff_str = f"±{diff:.{precision}f}"

    return f"{diff_color}{diff_str}{Style.RESET_ALL}"


def load_results(file_path: Path) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Load results from JSON file and return DataFrame and metadata."""
    with open(file_path, "r") as f:
        data = json.load(f)

    # Extract metadata
    metadata = {
        "total_tests": data.get("total_tests", 0),
        "created_at": data.get("created_at", "Unknown"),
    }

    # Load DataFrame from metrics_df
    metrics_data = data.get("metrics_df", [])
    if metrics_data:
        df = pd.DataFrame(metrics_data)
        # Ensure test_name is the index for easier merging
        df = df.set_index("test_name")
    else:
        df = pd.DataFrame()

    return df, metadata


def format_score(score: float, precision: int = 3) -> str:
    """Format score with specified precision."""
    return f"{score:.{precision}f}"


def format_diff(old_score: float, new_score: float, precision: int = 3) -> str:
    """Format difference between scores with + or - prefix."""
    diff = new_score - old_score
    if diff > 0:
        return f"+{diff:.{precision}f}"
    elif diff < 0:
        return f"{diff:.{precision}f}"
    else:
        return f"±{diff:.{precision}f}"


def print_table(df: pd.DataFrame, title: str, show_averages: bool = True) -> None:
    """Print a formatted table."""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")

    if df.empty:
        print("No data available.")
        return

    # Format the DataFrame for display
    display_df = df.copy()

    # Format numeric columns with colors
    for col in display_df.columns:
        if pd.api.types.is_numeric_dtype(display_df[col]):
            display_df[col] = display_df[col].apply(
                lambda x: format_score_with_color(x)
            )

    # Print the table using markdown format
    print(display_df.to_markdown(tablefmt="grid"))

    if show_averages:
        print(f"\n{'─'*60}")
        print("AVERAGES:")
        avg_row = {}
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                avg_row[col] = format_score_with_color(df[col].mean())
            else:
                avg_row[col] = "N/A"

        avg_df = pd.DataFrame([avg_row])
        print(avg_df.to_markdown(tablefmt="grid", index=False))


def print_comparison_table(
    old_df: pd.DataFrame, new_df: pd.DataFrame, title: str
) -> None:
    """Print a comparison table showing differences."""
    print(f"\n{'='*80}")
    print(f"{title}")
    print(f"{'='*80}")

    if old_df.empty and new_df.empty:
        print("No data available for comparison.")
        return

    # Perform outer join to include all test cases
    combined_df = old_df.join(new_df, how="outer", rsuffix="_new", lsuffix="_old")
    # Don't fill NaN with 0 - we want to distinguish between missing values and actual 0 scores

    # Create comparison DataFrame
    comparison_data = []

    for test_name in combined_df.index:
        row_data = {"test_name": test_name}

        # Get all unique metric names (remove suffixes)
        metric_cols = [col for col in combined_df.columns if col != "test_name"]
        metric_names = set()
        for col in metric_cols:
            if col.endswith("_old") or col.endswith("_new"):
                metric_names.add(col.rsplit("_", 1)[0])
            else:
                metric_names.add(col)

        # Add comparison for each metric
        for metric_name in metric_names:
            old_col = (
                f"{metric_name}_old"
                if f"{metric_name}_old" in combined_df.columns
                else metric_name
            )
            new_col = (
                f"{metric_name}_new"
                if f"{metric_name}_new" in combined_df.columns
                else metric_name
            )

            # Check if scores exist in the data
            old_exists = old_col in combined_df.columns and not pd.isna(
                combined_df.loc[test_name, old_col]
            )
            new_exists = new_col in combined_df.columns and not pd.isna(
                combined_df.loc[test_name, new_col]
            )

            old_score = combined_df.loc[test_name, old_col] if old_exists else None
            new_score = combined_df.loc[test_name, new_col] if new_exists else None

            # Format the comparison with colors
            if not old_exists and not new_exists:
                row_data[metric_name] = f"{Fore.WHITE}null → null{Style.RESET_ALL}"
            elif not old_exists:
                row_data[metric_name] = (
                    f"{Fore.WHITE}null → {format_score_with_color(new_score)}{Style.RESET_ALL}"
                )
            elif not new_exists:
                row_data[metric_name] = (
                    f"{format_score_with_color(old_score)} → {Fore.WHITE}null{Style.RESET_ALL}"
                )
            elif old_score == 0 and new_score == 0:
                row_data[metric_name] = (
                    f"{format_score_with_color(old_score)} → {format_score_with_color(new_score)} ({Fore.WHITE}±0.000{Style.RESET_ALL})"
                )
            else:
                diff_str = format_diff_with_color(old_score, new_score)
                row_data[metric_name] = (
                    f"{format_score_with_color(old_score)} → {format_score_with_color(new_score)} ({diff_str})"
                )

        comparison_data.append(row_data)

    comparison_df = pd.DataFrame(comparison_data)
    comparison_df = comparison_df.set_index("test_name")

    print(comparison_df.to_markdown(tablefmt="grid"))

    # Print averages comparison
    print(f"\n{'─'*80}")
    print("AVERAGE COMPARISON:")

    avg_comparison = {}
    for metric_name in metric_names:
        old_col = (
            f"{metric_name}_old"
            if f"{metric_name}_old" in combined_df.columns
            else metric_name
        )
        new_col = (
            f"{metric_name}_new"
            if f"{metric_name}_new" in combined_df.columns
            else metric_name
        )

        # Calculate averages, handling missing columns
        old_avg = None
        new_avg = None

        if old_col in combined_df.columns:
            old_data = combined_df[old_col].dropna()
            old_avg = old_data.mean() if len(old_data) > 0 else None

        if new_col in combined_df.columns:
            new_data = combined_df[new_col].dropna()
            new_avg = new_data.mean() if len(new_data) > 0 else None

        if old_avg is None and new_avg is None:
            avg_comparison[metric_name] = f"{Fore.WHITE}null → null{Style.RESET_ALL}"
        elif old_avg is None:
            avg_comparison[metric_name] = (
                f"{Fore.WHITE}null → {format_score_with_color(new_avg or 0.0)}{Style.RESET_ALL}"
            )
        elif new_avg is None:
            avg_comparison[metric_name] = (
                f"{format_score_with_color(old_avg)} → {Fore.WHITE}null{Style.RESET_ALL}"
            )
        elif old_avg == 0 and new_avg == 0:
            avg_comparison[metric_name] = (
                f"{format_score_with_color(old_avg)} → {format_score_with_color(new_avg)} ({Fore.WHITE}±0.000{Style.RESET_ALL})"
            )
        else:
            diff_str = format_diff_with_color(old_avg, new_avg)
            avg_comparison[metric_name] = (
                f"{format_score_with_color(old_avg)} → {format_score_with_color(new_avg)} ({diff_str})"
            )

    avg_df = pd.DataFrame([avg_comparison])
    print(avg_df.to_markdown(tablefmt="grid", index=False))


def main() -> int:
    """Run main function."""
    parser = argparse.ArgumentParser(
        description="Compare evaluation results between two versions",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "file1", type=Path, help="First overall_results.json file to compare"
    )
    parser.add_argument(
        "file2",
        type=Path,
        nargs="?",
        help="Second overall_results.json file to compare (optional)",
    )
    parser.add_argument(
        "--precision",
        "-p",
        type=int,
        default=3,
        help="Number of decimal places to show for scores",
    )

    args = parser.parse_args()

    # Load first file
    if not args.file1.exists():
        print(f"Error: File {args.file1} does not exist.")
        return 1

    df1, metadata1 = load_results(args.file1)

    print(f"Loaded results from: {args.file1}")
    print(f"Total tests: {metadata1['total_tests']}")
    print(f"Created at: {metadata1['created_at']}")

    if args.file2 is None:
        # Single file mode - just show the table
        print_table(df1, f"EVALUATION RESULTS: {args.file1.name}")
    else:
        # Two file comparison mode
        if not args.file2.exists():
            print(f"Error: File {args.file2} does not exist.")
            return 1

        df2, metadata2 = load_results(args.file2)

        print(f"\nLoaded results from: {args.file2}")
        print(f"Total tests: {metadata2['total_tests']}")
        print(f"Created at: {metadata2['created_at']}")

        # Show only comparison table (skip individual tables)
        print_comparison_table(
            df1, df2, f"COMPARISON: {args.file1.name} vs {args.file2.name}"
        )

    return 0


if __name__ == "__main__":
    exit(main())
