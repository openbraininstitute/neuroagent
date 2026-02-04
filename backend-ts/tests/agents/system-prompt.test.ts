/**
 * Unit tests for system prompt assembly
 *
 * Tests the system prompt assembly function that reads MDC rule files,
 * strips YAML frontmatter, and concatenates them with timestamp context.
 *
 * Requirements: 17.2, 17.4, 17.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { getSystemPrompt, clearSystemPromptCache } from '../../src/lib/agents/system-prompt';

describe('System Prompt Assembly', () => {
  const testRulesDir = join(process.cwd(), 'test-rules-temp');

  beforeEach(async () => {
    // Clear cache before each test
    clearSystemPromptCache();

    // Create test rules directory
    await mkdir(testRulesDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testRulesDir, { recursive: true, force: true });
  });

  it('should assemble prompt with multiple rule files', async () => {
    // Create mock MDC files
    const rule1Content = `---
description: Basic guidelines for neuroscience AI assistant
---

# Rule 1: Basic Guidelines

This is the first rule file with some basic guidelines.
It should be included in the system prompt.

## Subsection
- Point 1
- Point 2`;

    const rule2Content = `---
description: Advanced guidelines for tool usage
---

# Rule 2: Advanced Guidelines

This rule has YAML frontmatter that should be removed.
Only the content after the frontmatter should be included.

## Features
- Feature A
- Feature B`;

    await writeFile(join(testRulesDir, '1_rule1.mdc'), rule1Content, 'utf-8');
    await writeFile(join(testRulesDir, '2_rule2.mdc'), rule2Content, 'utf-8');

    // Get system prompt
    const result = await getSystemPrompt(testRulesDir, false);

    // Verify base instructions are present
    expect(result).toContain('# NEUROSCIENCE AI ASSISTANT');
    expect(result).toContain('You are a neuroscience AI assistant for the Open Brain Platform.');

    // Verify rule 1 content is present (without frontmatter)
    expect(result).toContain('# Rule 1: Basic Guidelines');
    expect(result).toContain('This is the first rule file with some basic guidelines.');
    expect(result).toContain('## Subsection');
    expect(result).toContain('- Point 1');
    expect(result).toContain('- Point 2');

    // Verify rule 2 content is present (without frontmatter)
    expect(result).toContain('# Rule 2: Advanced Guidelines');
    expect(result).toContain('This rule has YAML frontmatter that should be removed.');
    expect(result).toContain('## Features');
    expect(result).toContain('- Feature A');
    expect(result).toContain('- Feature B');

    // Verify frontmatter is NOT present
    expect(result).not.toContain('description: Basic guidelines');
    expect(result).not.toContain('description: Advanced guidelines');

    // Verify timestamp context is present
    expect(result).toContain('# CURRENT CONTEXT');
    expect(result).toContain('Current time:');

    // Verify files are in alphabetical order (rule1 before rule2)
    const rule1Index = result.indexOf('# Rule 1: Basic Guidelines');
    const rule2Index = result.indexOf('# Rule 2: Advanced Guidelines');
    expect(rule1Index).toBeLessThan(rule2Index);
  });

  it('should strip YAML frontmatter correctly', async () => {
    const ruleContent = `---
description: Test rule
author: Test Author
version: 1.0
---

# Test Rule

This content should be included.`;

    await writeFile(join(testRulesDir, 'test.mdc'), ruleContent, 'utf-8');

    const result = await getSystemPrompt(testRulesDir, false);

    // Verify content is present
    expect(result).toContain('# Test Rule');
    expect(result).toContain('This content should be included.');

    // Verify frontmatter is NOT present
    expect(result).not.toContain('description: Test rule');
    expect(result).not.toContain('author: Test Author');
    expect(result).not.toContain('version: 1.0');
  });

  it('should handle files without frontmatter', async () => {
    const ruleContent = `# Simple Rule

This rule has no frontmatter.
It should still be included.`;

    await writeFile(join(testRulesDir, 'simple.mdc'), ruleContent, 'utf-8');

    const result = await getSystemPrompt(testRulesDir, false);

    // Verify content is present
    expect(result).toContain('# Simple Rule');
    expect(result).toContain('This rule has no frontmatter.');
    expect(result).toContain('It should still be included.');
  });

  it('should sort files alphabetically', async () => {
    await writeFile(join(testRulesDir, '3_third.mdc'), '# Third Rule', 'utf-8');
    await writeFile(join(testRulesDir, '1_first.mdc'), '# First Rule', 'utf-8');
    await writeFile(join(testRulesDir, '2_second.mdc'), '# Second Rule', 'utf-8');

    const result = await getSystemPrompt(testRulesDir, false);

    // Verify order
    const firstIndex = result.indexOf('# First Rule');
    const secondIndex = result.indexOf('# Second Rule');
    const thirdIndex = result.indexOf('# Third Rule');

    expect(firstIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
  });

  it('should handle empty MDC files', async () => {
    await writeFile(join(testRulesDir, 'empty.mdc'), '', 'utf-8');
    await writeFile(join(testRulesDir, 'valid.mdc'), '# Valid Rule', 'utf-8');

    const result = await getSystemPrompt(testRulesDir, false);

    // Should still work and include valid rule
    expect(result).toContain('# Valid Rule');
    expect(result).toContain('# NEUROSCIENCE AI ASSISTANT');
  });

  it('should handle non-existent rules directory', async () => {
    const nonExistentDir = join(process.cwd(), 'non-existent-rules');

    const result = await getSystemPrompt(nonExistentDir, false);

    // Should return base prompt with timestamp
    expect(result).toContain('# NEUROSCIENCE AI ASSISTANT');
    expect(result).toContain('# CURRENT CONTEXT');
    expect(result).toContain('Current time:');
  });

  it('should cache the system prompt', async () => {
    await writeFile(join(testRulesDir, 'test.mdc'), '# Test Rule', 'utf-8');

    // First call - should read from disk
    const result1 = await getSystemPrompt(testRulesDir, true);
    const timestamp1 = result1.match(/Current time: (.+)$/)?.[1];

    // Wait a bit to ensure timestamp would be different
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Second call - should use cache (same timestamp)
    const result2 = await getSystemPrompt(testRulesDir, true);
    const timestamp2 = result2.match(/Current time: (.+)$/)?.[1];

    // Timestamps should be the same (cached)
    expect(timestamp1).toBe(timestamp2);

    // Clear cache
    clearSystemPromptCache();

    // Third call - should read from disk again (different timestamp)
    const result3 = await getSystemPrompt(testRulesDir, true);
    const timestamp3 = result3.match(/Current time: (.+)$/)?.[1];

    // Timestamp should be different after cache clear
    expect(timestamp3).not.toBe(timestamp1);
  });

  it('should handle frontmatter with multiple --- markers', async () => {
    const ruleContent = `---
description: Test rule
---

# Test Rule

Some content here.

---

This is not frontmatter, it's a horizontal rule in markdown.`;

    await writeFile(join(testRulesDir, 'test.mdc'), ruleContent, 'utf-8');

    const result = await getSystemPrompt(testRulesDir, false);

    // Verify content is present
    expect(result).toContain('# Test Rule');
    expect(result).toContain('Some content here.');
    expect(result).toContain("This is not frontmatter, it's a horizontal rule in markdown.");

    // Verify frontmatter is NOT present
    expect(result).not.toContain('description: Test rule');
  });

  it('should include timestamp in ISO format', async () => {
    await writeFile(join(testRulesDir, 'test.mdc'), '# Test Rule', 'utf-8');

    const result = await getSystemPrompt(testRulesDir, false);

    // Verify timestamp is in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
    const timestampMatch = result.match(/Current time: (.+)$/);
    expect(timestampMatch).toBeTruthy();

    const timestamp = timestampMatch?.[1];
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
