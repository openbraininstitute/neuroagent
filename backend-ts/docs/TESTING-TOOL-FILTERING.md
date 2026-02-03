# Testing Tool Filtering

This guide explains how to test the tool filtering and model selection feature using the test tools.

## Test Tools Available

Six simple test tools have been created for testing the filtering functionality:

1. **ExampleTool** (`example_tool`) - Example tool for demonstration
2. **CalculatorTool** (`calculator`) - Perform mathematical calculations
3. **WeatherTool** (`get_weather`) - Get weather information for any location
4. **TranslatorTool** (`translate_text`) - Translate text between languages
5. **TimeTool** (`get_time`) - Get current time in different timezones
6. **CurrencyTool** (`convert_currency`) - Convert between currencies

## Configuration

The minimum tool selection threshold is set to **3 tools** by default. This means:
- If you have **≤3 tools** available: No filtering occurs, all tools are used
- If you have **>3 tools** available: Filtering kicks in and selects relevant tools

With 6 tools registered, filtering will activate.

## Test Scenarios

### Scenario 1: Weather Query (Should select WeatherTool)

**Request:**
```json
POST /api/qa/chat_streamed/[thread_id]
{
  "content": "What's the weather like in Paris?",
  "model": "auto"
}
```

**Expected Behavior:**
- Tool filtering activates (6 tools > 3 threshold)
- LLM should select: `get_weather`, possibly `get_time`
- Model selection: Likely `gpt-5-nano` or `gpt-5-mini` (low complexity)
- Reasoning: `MINIMAL` or `LOW`

**Check Database:**
```sql
-- Get the last message
SELECT * FROM messages ORDER BY creation_date DESC LIMIT 1;

-- Check selected tools
SELECT * FROM tool_selection WHERE message_id = 'last_message_id';

-- Check complexity estimation
SELECT * FROM complexity_estimation WHERE message_id = 'last_message_id';

-- Check token consumption
SELECT * FROM token_consumption WHERE message_id = 'last_message_id' AND task = 'TOOL_SELECTION';
```

### Scenario 2: Math Query (Should select CalculatorTool)

**Request:**
```json
{
  "content": "Calculate 25 multiplied by 17",
  "model": "auto"
}
```

**Expected Behavior:**
- Tool filtering activates
- LLM should select: `calculator`
- Model selection: `gpt-5-nano` (very low complexity)
- Reasoning: `MINIMAL`

### Scenario 3: Translation Query (Should select TranslatorTool)

**Request:**
```json
{
  "content": "How do you say 'hello' in Spanish and French?",
  "model": "auto"
}
```

**Expected Behavior:**
- Tool filtering activates
- LLM should select: `translate_text`
- Model selection: `gpt-5-nano` or `gpt-5-mini`
- Reasoning: `MINIMAL` or `LOW`

### Scenario 4: Multi-Tool Query (Should select multiple tools)

**Request:**
```json
{
  "content": "What time is it in Tokyo and what's the weather there?",
  "model": "auto"
}
```

**Expected Behavior:**
- Tool filtering activates
- LLM should select: `get_time`, `get_weather`
- Model selection: `gpt-5-mini` (moderate complexity)
- Reasoning: `LOW` or `MEDIUM`

### Scenario 5: Complex Query (Should select higher model)

**Request:**
```json
{
  "content": "I need to convert 100 USD to EUR, then tell me what time it is in Paris, translate 'good morning' to French, and calculate the exchange rate difference if I convert to GBP instead",
  "model": "auto"
}
```

**Expected Behavior:**
- Tool filtering activates
- LLM should select: `convert_currency`, `get_time`, `translate_text`, `calculator`
- Model selection: `gpt-5-mini` or `gpt-5.1` (high complexity)
- Reasoning: `MEDIUM` or `HIGH`

### Scenario 6: Specific Model (Should skip model selection)

**Request:**
```json
{
  "content": "What's the weather in London?",
  "model": "openai/gpt-4"
}
```

**Expected Behavior:**
- Tool filtering activates (still happens)
- LLM should select: `get_weather`
- Model selection: **SKIPPED** (user specified model)
- Uses: `openai/gpt-4` as requested
- Reasoning: `null` (not determined)

## Monitoring Logs

Watch the console output for filtering logs:

```
[filterToolsAndModelByConversation] Starting: { threadId, toolCount, needToolSelection, needModelSelection }
[filterToolsAndModelByConversation] Loaded N messages
[filterToolsAndModelByConversation] Calling LLM for filtering...
[filterToolsAndModelByConversation] Query complexity: X / 10, selected model gpt-5-mini with reasoning effort LOW  #TOOLS: 2, SELECTED TOOLS: [get_weather, get_time] in 1.23 s
```

## Verifying Results

### 1. Check Console Logs

Look for these log entries:
- `[chat_streamed] Tool filtering complete:` - Shows filtering results
- `[filterToolsAndModelByConversation] Query complexity:` - Shows complexity score and model selection

### 2. Check Database

```sql
-- View tool selections for a thread
SELECT
  m.creation_date,
  m.entity,
  m.content::json->>'content' as message_content,
  ts.tool_name
FROM messages m
LEFT JOIN tool_selection ts ON ts.message_id = m.id
WHERE m.thread_id = 'your_thread_id'
ORDER BY m.creation_date DESC;

-- View complexity estimations
SELECT
  m.creation_date,
  m.content::json->>'content' as message_content,
  ce.complexity,
  ce.model,
  ce.reasoning
FROM messages m
LEFT JOIN complexity_estimation ce ON ce.message_id = m.id
WHERE m.thread_id = 'your_thread_id'
ORDER BY m.creation_date DESC;

-- View token consumption for filtering
SELECT
  m.creation_date,
  tc.type,
  tc.task,
  tc.count,
  tc.model
FROM messages m
JOIN token_consumption tc ON tc.message_id = m.id
WHERE m.thread_id = 'your_thread_id'
  AND tc.task = 'TOOL_SELECTION'
ORDER BY m.creation_date DESC;
```

### 3. Check API Response

The streaming response should use the filtered tools and selected model.

## Adjusting Threshold

To test with different thresholds, set the environment variable:

```bash
# Disable filtering (set very high)
export NEUROAGENT_TOOLS__MIN_TOOL_SELECTION=100

# Enable filtering with 2 tools
export NEUROAGENT_TOOLS__MIN_TOOL_SELECTION=2

# Default (3 tools)
export NEUROAGENT_TOOLS__MIN_TOOL_SELECTION=3
```

## Troubleshooting

### Filtering Not Activating

**Problem:** All tools are being used, no filtering occurs

**Solutions:**
1. Check tool count: `console.log('[chat_streamed] Registered', toolClasses.length, 'tool classes');`
2. Verify threshold: Should be less than tool count
3. Check OpenRouter token: Filtering requires `NEUROAGENT_LLM__OPENROUTER_TOKEN`

### Wrong Tools Selected

**Problem:** LLM selects irrelevant tools

**Solutions:**
1. Check tool descriptions and utterances - make them more specific
2. Review system prompt in `tool-filtering.ts`
3. Check conversation history - previous messages affect selection

### Model Selection Issues

**Problem:** Wrong model or reasoning level selected

**Solutions:**
1. Check complexity score in logs
2. Verify `complexityToModelAndReasoning()` mapping
3. Review complexity ranking criteria in system prompt

### Database Errors

**Problem:** Prisma validation errors for reasoning enum

**Solutions:**
1. Ensure reasoning values are uppercase: `MINIMAL`, `LOW`, `MEDIUM`, `HIGH`, `NONE`
2. Check Prisma schema enum matches: `enum reasoninglevels`
3. Verify database enum is created correctly

## Expected Performance

- **Filtering Time:** 1-3 seconds
- **Token Usage:** ~500-2000 tokens per filtering operation
- **Model Used:** `google/gemini-2.5-flash` (fast and cheap)

## Success Criteria

✅ Tool filtering activates when tool count > threshold
✅ Relevant tools are selected based on query
✅ Complexity score is reasonable (0-10 scale)
✅ Appropriate model is selected based on complexity
✅ Reasoning level matches complexity
✅ Database records are created correctly
✅ Token consumption is tracked
✅ Agent uses filtered tools successfully
