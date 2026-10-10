// Library cache lookups still work; restoration cannot silently redownload.
export function installCacheMode() {
  let cacheOnly = false;
  const fetchRemote = self.fetch.bind(self);
  self.fetch = (input, options) => {
    const url = new URL(input instanceof Request ? input.url : String(input), self.location.href);
    if (cacheOnly && /^https?:$/.test(url.protocol) && url.origin !== self.location.origin) {
      return Promise.reject(new Error('A saved AI file is missing. Reconnect and repair the AI download in Settings.'));
    }
    return fetchRemote(input, options);
  };
  return value => { cacheOnly = !!value; };
}
