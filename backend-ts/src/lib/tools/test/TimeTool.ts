/**
 * Time Tool - Test tool for filtering
 */

import { z } from 'zod';
import { BaseTool, BaseContextVariables } from '../base-tool';

const TimeToolInputSchema = z.object({
  timezone: z.string().describe('Timezone name'),
  format: z.enum(['12h', '24h']).optional().describe('Time format'),
});

export class TimeTool extends BaseTool<typeof TimeToolInputSchema, BaseContextVariables> {
  static readonly toolName = 'get_time';
  static readonly toolNameFrontend = 'Time';
  static readonly toolDescription = 'Get current time in any timezone';
  static readonly toolDescriptionFrontend = 'Get time in timezones';
  static readonly toolUtterances = [
    'What time is it in New York?',
    'Current time in Tokyo',
    'Show me the time in Paris',
  ];
  static readonly toolHil = false;

  override contextVariables: BaseContextVariables;
  override inputSchema = TimeToolInputSchema;

  constructor(contextVariables: BaseContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  async execute(input: z.infer<typeof TimeToolInputSchema>): Promise<unknown> {
    const { timezone, format = '24h' } = input;
    const now = new Date();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes().toString().padStart(2, '0');
    const timeString = format === '12h'
      ? `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`
      : `${hours.toString().padStart(2, '0')}:${minutes}`;

    return {
      timezone,
      current_time: timeString,
      date: now.toISOString().split('T')[0],
    };
  }
}
