# What are rules?

The rule logic is basically a copy of the same concept in Cursor - https://docs.cursor.com/context/rules


# How to write rules

Create a new `.mdc` file inside the `rules/` directory. The file name should be the name of the rule, and the content should be in Markdown format
with a frontmatter header that contains the rule's metadata.



```markdown
---
description: "A brief description of the rule."
---
# Rule Title
This is the content of the rule. You can use Markdown syntax to format it.
```

Conventions to follow:
* The file name should be in lowercase and use hyphens to separate words (e.g., `my-rule.mdc`).
* Neither the file name nor the contents of the frontmatter header will make it into the system prompt - it is purely for organization and metadata purposes.
* Make sure to have proper sections in the content, using headings (`#`, `##`, etc.) to structure the rule. Each rule should start with a top-level heading (`# Rule Title`).
