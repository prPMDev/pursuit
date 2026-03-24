#!/usr/bin/env python3
"""
Pursuit Scanner — Job Listing Formatter

Takes messy job listings from any source and outputs standardized
markdown batch format for the Scanner prompt.

Usage:
    python formatter.py --file listings.txt
    python formatter.py --stdin < listings.txt
    cat listings.txt | python formatter.py --stdin
    python formatter.py --clipboard

Output goes to stdout. Redirect to a file if you want to save it:
    python formatter.py --file listings.txt > batch.md
"""

import argparse
import re
import subprocess
import sys
from datetime import datetime


def read_clipboard():
    """Read text from system clipboard."""
    commands = [
        ["pbpaste"],                    # macOS
        ["xclip", "-selection", "clipboard", "-o"],  # Linux (xclip)
        ["xsel", "--clipboard", "--output"],          # Linux (xsel)
        ["powershell.exe", "-command", "Get-Clipboard"],  # WSL/Windows
    ]
    for cmd in commands:
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                return result.stdout
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    print("Error: Could not read clipboard. Install xclip/xsel or use --file/--stdin.", file=sys.stderr)
    sys.exit(1)


def split_listings(text):
    """Split raw text into individual job listing blocks.

    Tries multiple strategies:
    1. Separator lines (---, ===, blank lines between blocks)
    2. Numbered listings (1. ..., 2. ..., #1, #2)
    3. Repeated structural patterns (Title:, Company:, Location:)
    """
    text = text.strip()
    if not text:
        return []

    # Strategy 1: Split on horizontal rules or multiple blank lines
    blocks = re.split(r'\n\s*(?:---+|===+)\s*\n', text)
    if len(blocks) > 1:
        return [b.strip() for b in blocks if b.strip()]

    # Strategy 2: Split on numbered patterns like "1." or "#1" or "Job 1"
    numbered = re.split(r'\n(?=(?:\d+[\.\)]\s|#\d+\s|Job\s+\d+))', text)
    if len(numbered) > 1:
        return [b.strip() for b in numbered if b.strip()]

    # Strategy 3: Split on double blank lines
    double_blank = re.split(r'\n\s*\n\s*\n', text)
    if len(double_blank) > 1:
        return [b.strip() for b in double_blank if b.strip()]

    # Strategy 4: Split on single blank lines if blocks look structured
    single_blank = re.split(r'\n\s*\n', text)
    if len(single_blank) > 1:
        # Check if blocks look like individual listings (have title-like first lines)
        structured = [b.strip() for b in single_blank if b.strip()]
        if len(structured) >= 2:
            return structured

    # Fallback: treat entire text as one listing
    return [text]


def parse_listing(block):
    """Extract job fields from a text block using heuristics.

    Returns a dict with: title, company, location, posted, source, summary, link
    """
    fields = {
        "title": "",
        "company": "",
        "location": "",
        "posted": "Unknown",
        "source": "Unknown",
        "summary": "",
        "link": "",
    }

    lines = block.strip().split("\n")

    # Extract URL if present
    urls = re.findall(r'https?://\S+', block)
    if urls:
        fields["link"] = urls[0]
        # Guess source from URL
        url_lower = urls[0].lower()
        if "linkedin" in url_lower:
            fields["source"] = "LinkedIn"
        elif "indeed" in url_lower:
            fields["source"] = "Indeed"
        elif "glassdoor" in url_lower:
            fields["source"] = "Glassdoor"
        elif "lever.co" in url_lower or "greenhouse" in url_lower:
            fields["source"] = "Company Career Page"

    # Try to extract labeled fields (Title: ..., Company: ..., etc.)
    labeled_keys = {
        "title": r'(?:title|role|position|job)\s*:\s*(.+)',
        "company": r'(?:company|employer|org|organization)\s*:\s*(.+)',
        "location": r'(?:location|where|city|office)\s*:\s*(.+)',
        "posted": r'(?:posted|date|when|listed)\s*:\s*(.+)',
        "source": r'(?:source|from|via|found on)\s*:\s*(.+)',
    }

    remaining_lines = []
    for line in lines:
        matched = False
        for field, pattern in labeled_keys.items():
            m = re.match(pattern, line.strip(), re.IGNORECASE)
            if m:
                value = m.group(1).strip().strip("*_")
                if value and not fields[field]:
                    fields[field] = value
                matched = True
                break
        if not matched:
            # Skip lines that are just URLs (already captured)
            if not re.match(r'^\s*https?://\S+\s*$', line):
                remaining_lines.append(line.strip())

    # If no labeled title found, use first non-empty line as title
    if not fields["title"] and remaining_lines:
        first = remaining_lines[0].strip().strip("#*_- ")
        # Remove numbering prefix
        first = re.sub(r'^\d+[\.\)]\s*', '', first)
        if len(first) < 120:  # Reasonable title length
            fields["title"] = first
            remaining_lines = remaining_lines[1:]

    # If no company and title has "at" or "@", split on the LAST occurrence
    # to avoid splitting "Integrations at HealthCo" into "Integrations" + "HealthCo"
    if not fields["company"] and fields["title"]:
        # Try " at " split — use last occurrence (company name is usually after the last "at")
        at_match = re.match(r'(.+)\s+(?:at|@)\s+(.+)', fields["title"])
        if at_match:
            fields["title"] = at_match.group(1).strip()
            fields["company"] = at_match.group(2).strip()
        else:
            # Try " - " split (e.g., "Senior PM - TechCorp")
            dash_match = re.match(r'(.+?)\s+-\s+(.+)', fields["title"])
            if dash_match:
                fields["title"] = dash_match.group(1).strip()
                fields["company"] = dash_match.group(2).strip()

    # Remaining lines become the summary
    summary_lines = [l for l in remaining_lines if l and l != fields["title"]]
    if summary_lines:
        # Take first 5 meaningful lines
        fields["summary"] = "\n".join(summary_lines[:5])

    return fields


def format_batch(listings, max_count=20):
    """Format parsed listings into the scanner prompt's expected markdown format."""
    if len(listings) > max_count:
        print(
            f"Warning: {len(listings)} listings found, capping at {max_count}. "
            f"Quality > volume.",
            file=sys.stderr
        )
        listings = listings[:max_count]

    output = []
    output.append(f"# Job Listings Batch — {datetime.now().strftime('%Y-%m-%d')}")
    output.append(f"\n**{len(listings)} listings** to scan.\n")

    for i, fields in enumerate(listings, 1):
        output.append("---")
        output.append(f"**Job {i}**")
        output.append(f"Title: {fields['title'] or 'Unknown'}")
        output.append(f"Company: {fields['company'] or 'Unknown'}")
        output.append(f"Location: {fields['location'] or 'Unknown'}")
        output.append(f"Posted: {fields['posted']}")
        output.append(f"Source: {fields['source']}")
        if fields["summary"]:
            output.append(f"Summary: {fields['summary']}")
        if fields["link"]:
            output.append(f"Link: {fields['link']}")
        output.append("")

    output.append("---")
    return "\n".join(output)


def main():
    parser = argparse.ArgumentParser(
        description="Format job listings into standardized batch for the Scanner prompt.",
        epilog="Example: python formatter.py --file listings.txt > batch.md",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--file", "-f", help="Read listings from a file")
    group.add_argument("--stdin", "-s", action="store_true", help="Read from stdin")
    group.add_argument("--clipboard", "-c", action="store_true", help="Read from clipboard")
    parser.add_argument(
        "--max", "-m", type=int, default=20,
        help="Max listings per batch (default: 20)"
    )

    args = parser.parse_args()

    # Read input
    if args.file:
        try:
            with open(args.file, "r") as f:
                raw_text = f.read()
        except FileNotFoundError:
            print(f"Error: File not found: {args.file}", file=sys.stderr)
            sys.exit(1)
    elif args.stdin:
        raw_text = sys.stdin.read()
    else:
        raw_text = read_clipboard()

    if not raw_text.strip():
        print("Error: No input text found.", file=sys.stderr)
        sys.exit(1)

    # Process
    blocks = split_listings(raw_text)
    if not blocks:
        print("Error: Could not identify any job listings in the input.", file=sys.stderr)
        sys.exit(1)

    listings = [parse_listing(block) for block in blocks]

    # Filter out empty listings (no title AND no company)
    listings = [l for l in listings if l["title"] or l["company"]]

    if not listings:
        print("Error: Could not parse any job listings from the input.", file=sys.stderr)
        sys.exit(1)

    # Format and output
    print(format_batch(listings, max_count=args.max))
    print(f"\nFormatted {len(listings)} listings.", file=sys.stderr)


if __name__ == "__main__":
    main()
