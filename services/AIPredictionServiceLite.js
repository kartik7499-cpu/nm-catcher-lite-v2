const axios = require('axios');
const FormData = require('form-data');
const Logger = require('../utils/logger');

class AIPredictionService {
  constructor(bot) {
    this.bot = bot;

    const baseUrl = process.env.PREDICTION_API_URL || null;
    this.apiKey = process.env.PREDICTION_API_KEY || null;

    this.apiUrl = baseUrl
      ? baseUrl.endsWith('/predict')
        ? baseUrl
        : `${baseUrl.replace(/\/$/, '')}/predict`
      : null;

    this.enabled = Boolean(this.apiUrl && this.apiKey);

    if (!baseUrl) Logger.warn('⚠️ PREDICTION_API_URL not set');
    if (!this.apiKey) Logger.warn('⚠️ PREDICTION_API_KEY not set');

    if (this.enabled) {
      Logger.success(`🧠 AI Prediction enabled → ${this.apiUrl}`);
    } else {
      Logger.warn('🧠 AI Prediction service disabled');
    }
  }

  isAvailable() {
    return this.enabled;
  }

  async predictPokemon(imageBuffer) {
    if (!this.enabled) {
      return { success: false, error: 'AI service disabled' };
    }

    try {
      const form = new FormData();
      form.append('image', imageBuffer, {
        filename: 'pokemon.jpg',
        contentType: 'image/jpeg'
      });

      const response = await axios.post(this.apiUrl, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.apiKey}`
        },
        timeout: 10000,
        validateStatus: () => true
      });

      const data = response.data || {};

      if (response.status === 429) {
        return {
          success: false,
          retry: false,
          error: 'quota_exhausted'
        };
      }

      if (response.status !== 200) {
        return {
          success: false,
          retry: data?.retry !== false,
          error: data?.error || 'prediction_rejected'
        };
      }

      if (!data.success || !data.pokemon) {
        return {
          success: false,
          retry: true,
          error: data?.error || 'prediction_failed'
        };
      }

      return {
        success: true,
        pokemon: String(data.pokemon).toLowerCase().trim(),
        confidence: Number(data.confidence) || 0,
        latency: data.latency_ms || 0,
        latency_ms: data.latency_ms || 0,
        quotaRemaining: data.quota_remaining
      };

    } catch (err) {
      return {
        success: false,
        retry: true,
        error: 'network_error'
      };
    }
  }
}

module.exports = AIPredictionService;
