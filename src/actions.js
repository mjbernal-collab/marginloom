export function reviewerRequest(text) {
  const request=String(text).trim();
  if (/^(?:how|why|what|when|where)\b/i.test(request)) return false;
  return /\b(?:create|make|generate|build|prepare|write)\b.{0,100}\b(?:reviewer|study guide|revision guide)\b/i.test(request);
}
