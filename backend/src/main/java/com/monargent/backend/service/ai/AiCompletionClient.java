package com.monargent.backend.service.ai;

public interface AiCompletionClient {

    String complete(String systemPrompt, String userPrompt);

    String completeWithImage(String systemPrompt, String userPrompt, byte[] imageBytes, String mimeType);
}
