<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;

class SaraAiService
{
    public function chat(array $messages, int $maxTokens = 400): ?string
    {
        $key = env('GROQ_API_KEY');
        if (!$key) {
            return null;
        }
        try {
            $r = Http::timeout(25)->withToken($key)
                ->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model'      => env('SARA_AI_MODEL', 'llama-3.3-70b-versatile'),
                    'messages'   => $messages,
                    'max_tokens' => $maxTokens,
                ]);
            return $r->successful() ? trim((string) $r->json('choices.0.message.content')) : null;
        } catch (\Throwable $e) {
            report($e);
            return null;
        }
    }

    public function proactiveAnalysis(): array
    {
        return [];
    }
}
