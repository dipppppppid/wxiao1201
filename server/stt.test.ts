import { describe, expect, it } from "vitest";
import { transcribeAudio } from "./_core/voiceTranscription";

describe("STT Voice Transcription", () => {
  it("should handle transcription service configuration", async () => {
    // Test with a non-existent URL to check error handling
    const result = await transcribeAudio({
      audioUrl: "https://example.com/nonexistent.mp3",
    });

    // Should return an error object
    expect(result).toHaveProperty("error");
    if ('error' in result) {
      expect(result.code).toBeDefined();
      expect(['INVALID_FORMAT', 'SERVICE_ERROR', 'TRANSCRIPTION_FAILED']).toContain(result.code);
    }
  });

  it("should validate audio URL format", async () => {
    const result = await transcribeAudio({
      audioUrl: "invalid-url",
    });

    expect(result).toHaveProperty("error");
    if ('error' in result) {
      expect(result.code).toBe("SERVICE_ERROR");
    }
  });
});
