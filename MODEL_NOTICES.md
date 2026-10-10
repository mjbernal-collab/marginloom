# Models and dependency notices

Qwen2.5-0.5B-Instruct and Qwen2.5-1.5B-Instruct use Apache-2.0. Qwen2.5-3B-Instruct uses the Qwen Research License. Inspect the exact model card and license before redistributing or using a model outside the hackathon. The Detailed profile is optional; Balanced is the default.

- https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct
- https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct
- https://huggingface.co/Qwen/Qwen2.5-3B-Instruct
- https://huggingface.co/Xenova/all-MiniLM-L6-v2
- https://huggingface.co/Xenova/whisper-tiny.en
- https://github.com/openai/whisper
- https://github.com/mlc-ai/web-llm
- https://github.com/huggingface/transformers.js
- https://github.com/mozilla/pdf.js

All-MiniLM-L6-v2 is published under Apache-2.0. Third-party dependency notices and licenses are present in installed packages. Model files are downloaded by their local runtime on explicit setup; model weights are not included in this source repository.

Optional English speech recognition uses quantized ONNX Whisper Tiny (`Xenova/whisper-tiny.en`) through Transformers.js/ONNX Runtime on CPU. Speech weights download only when the student explicitly sets up voice; subsequent turns restore from cache without remote fetches. Responses can use an installed operating-system English voice exposed by browser speech synthesis with `localService=true`. No cloud speech API is used. Include this model, browser audio APIs, and local speech synthesis in the hackathon disclosure alongside the existing LLM and embedding models.

Optional natural speech uses `onnx-community/Kokoro-82M-v1.0-ONNX` (q8, CPU/WASM), `kokoro-js` 1.2.1, and its `phonemizer` dependency, which uses eSpeak NG text-to-phoneme processing. Kokoro model weights and kokoro-js are published under Apache-2.0; dependency license files remain in installed packages. Four voice style binaries (Heart, Bella, Puck, Emma) ship with the app. Neural model files download only during explicit natural-voice setup. All subsequent synthesis is local, and the model worker is released after each response. Disclose these tools alongside Whisper and the tutor models.

- https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
- https://github.com/hexgrad/kokoro/tree/main/kokoro.js
- https://github.com/xenova/phonemizer.js
