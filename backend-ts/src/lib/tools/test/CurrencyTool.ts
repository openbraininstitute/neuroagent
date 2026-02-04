/**
 * Currency Tool - Test tool for filtering
 */

import { z } from 'zod';

import { BaseTool, type BaseContextVariables } from '../base-tool';

const CurrencyToolInputSchema = z.object({
  amount: z.number().describe('The amount to convert'),
  from_currency: z.string().describe('Source currency code (e.g., USD, EUR, GBP)'),
  to_currency: z.string().describe('Target currency code (e.g., USD, EUR, GBP)'),
});

export class CurrencyTool extends BaseTool<typeof CurrencyToolInputSchema, BaseContextVariables> {
  static readonly toolName = 'convert_currency';
  static readonly toolNameFrontend = 'Currency Converter';
  static readonly toolDescription =
    'Convert amounts between different currencies. Supports major world currencies including USD, EUR, GBP, JPY, CNY, and more.';
  static readonly toolDescriptionFrontend = 'Convert between currencies';
  static readonly toolUtterances = [
    'Convert 100 USD to EUR',
    'How much is 50 pounds in dollars?',
    'What is 1000 yen in euros?',
    'Convert 200 euros to British pounds',
    'Exchange rate from USD to JPY',
  ];
  static readonly toolHil = false;

  override contextVariables: BaseContextVariables;
  override inputSchema = CurrencyToolInputSchema;

  constructor(contextVariables: BaseContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  async execute(input: z.infer<typeof CurrencyToolInputSchema>): Promise<unknown> {
    const { amount, from_currency, to_currency } = input;
    const exchangeRates: Record<string, number> = {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.5,
      CNY: 7.24,
      AUD: 1.53,
      CAD: 1.36,
      CHF: 0.88,
      INR: 83.12,
    };
    const fromRate = exchangeRates[from_currency.toUpperCase()];
    const toRate = exchangeRates[to_currency.toUpperCase()];
    if (!fromRate || !toRate) {
      return {
        error: 'Unsupported currency code',
        supported_currencies: Object.keys(exchangeRates),
      };
    }
    const usdAmount = amount / fromRate;
    const convertedAmount = usdAmount * toRate;
    return {
      original_amount: amount,
      original_currency: from_currency.toUpperCase(),
      converted_amount: Math.round(convertedAmount * 100) / 100,
      converted_currency: to_currency.toUpperCase(),
      exchange_rate: Math.round((toRate / fromRate) * 10000) / 10000,
      timestamp: new Date().toISOString(),
    };
  }
}
