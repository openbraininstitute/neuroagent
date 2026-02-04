import { readdir, readFile } from "fs/promises";
import { join } from "path";

/**
 * Cache for the assembled system prompt to avoid re-reading files on every request
 */
let cachedSystemPrompt: string | null = null;
let lastCacheTime: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Strip YAML frontmatter from MDC file content.
 * Frontmatter is content between --- markers at the start of the file.
 *
 * @param content - The raw file content
 * @returns Content with frontmatter removed
 */
function stripFrontmatter(content: string): string {
  const lines = content.split("\n");
  const filteredLines: string[] = [];
  let inFrontmatter = false;
  let frontmatterStarted = false;

  for (const line of lines) {
    if (line.trim() === "---") {
      if (!frontmatterStarted) {
        // First --- marker - start of frontmatter
        inFrontmatter = true;
        frontmatterStarted = true;
        continue;
      } else if (inFrontmatter) {
        // Second --- marker - end of frontmatter
        inFrontmatter = false;
        continue;
      } else {
        // Subsequent --- markers are not frontmatter (e.g., markdown horizontal rules)
        filteredLines.push(line);
      }
    } else if (!inFrontmatter) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join("\n").trim();
}

/**
 * Assemble the system prompt from all .mdc files in the rules directory.
 * Files are sorted alphabetically for consistent ordering.
 * YAML frontmatter is stripped from each file.
 * Current timestamp is appended to the prompt.
 *
 * @param rulesDir - Path to the directory containing .mdc rule files
 * @param useCache - Whether to use cached prompt (default: true)
 * @returns The assembled system prompt
 */
export async function getSystemPrompt(
  rulesDir: string = join(process.cwd(), "src", "lib", "rules"),
  useCache: boolean = true
): Promise<string> {
  // Check cache
  const now = Date.now();
  if (useCache && cachedSystemPrompt && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedSystemPrompt;
  }

  // Initialize the system prompt with base instructions
  let systemPrompt = `# NEUROSCIENCE AI ASSISTANT

You are a neuroscience AI assistant for the Open Brain Platform.

---

`;

  try {
    // Find all .mdc files in the rules directory
    const files = await readdir(rulesDir);
    const mdcFiles = files
      .filter((file) => file.endsWith(".mdc"))
      .sort(); // Sort alphabetically for consistent ordering

    // Read and concatenate all rule files
    for (const mdcFile of mdcFiles) {
      try {
        const filePath = join(rulesDir, mdcFile);
        const content = await readFile(filePath, "utf-8");
        const trimmedContent = content.trim();

        if (trimmedContent) {
          // Remove YAML frontmatter
          const cleanContent = stripFrontmatter(trimmedContent);

          if (cleanContent) {
            // Add the content with a clear boundary
            systemPrompt += `\n${cleanContent}\n\n`;
          }
        }
      } catch (error) {
        throw new Error(
          `Failed to read rule file ${mdcFile}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  } catch (error) {
    // If rules directory doesn't exist or can't be read, continue with base prompt
    console.warn(
      `Could not read rules directory: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Append current timestamp context
  systemPrompt += `
# CURRENT CONTEXT

Current time: ${new Date().toISOString()}`;

  // Update cache
  cachedSystemPrompt = systemPrompt;
  lastCacheTime = now;

  return systemPrompt;
}

/**
 * Clear the cached system prompt.
 * Useful for testing or when rules are updated.
 */
export function clearSystemPromptCache(): void {
  cachedSystemPrompt = null;
  lastCacheTime = 0;
}
