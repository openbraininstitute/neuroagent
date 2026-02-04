/**
 * Weather Tool - Test tool for filtering
 *
 * Simple tool that returns mock weather data for testing tool filtering.
 */

import { z } from 'zod';

import { BaseTool, type BaseContextVariables } from '../base-tool';

/**
 * Input schema for weather tool
 */
const WeatherToolInputSchema = z.object({
  location: z.string().describe('The city or location to get weather for'),
  units: z
    .enum(['celsius', 'fahrenheit'])
    .optional()
    .describe('Temperature units (default: celsius)'),
});

/**
 * Weather Tool
 *
 * Returns current weather information for a given location.
 */
export class WeatherTool extends BaseTool<typeof WeatherToolInputSchema, BaseContextVariables> {
  static readonly toolName = 'get_weather';
  static readonly toolNameFrontend = 'Weather';
  static readonly toolDescription =
    'Get current weather information for any location. Returns temperature, conditions, and forecast.';
  static readonly toolDescriptionFrontend = 'Get weather information for any city or location';
  static readonly toolUtterances = [
    'What is the weather in Paris?',
    'Tell me the temperature in New York',
    'Is it raining in London?',
    'What is the forecast for Tokyo?',
    'How hot is it in Dubai?',
  ];
  static readonly toolHil = false;

  override contextVariables: BaseContextVariables;
  override inputSchema = WeatherToolInputSchema;

  constructor(contextVariables: BaseContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  async execute(input: z.infer<typeof WeatherToolInputSchema>): Promise<unknown> {
    const { location, units = 'celsius' } = input;

    // Mock weather data
    const temp = units === 'celsius' ? 22 : 72;
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)];

    return {
      location,
      temperature: `${temp}°${units === 'celsius' ? 'C' : 'F'}`,
      conditions,
      humidity: '65%',
      wind: '10 km/h',
      forecast: 'Clear skies expected for the next 3 days',
    };
  }
}
