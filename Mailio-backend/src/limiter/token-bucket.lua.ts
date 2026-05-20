export const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local max = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])

if tokens == nil then
  tokens = max
  lastRefill = now
end

local elapsed = now - lastRefill
if elapsed > 0 then
  local refill = (elapsed / window) * max
  tokens = math.min(max, tokens + refill)
  lastRefill = now
end

if tokens >= cost then
  tokens = tokens - cost
  redis.call('HMSET', key, 'tokens', tostring(tokens), 'lastRefill', lastRefill)
  redis.call('PEXPIRE', key, window * 2)
  return {1, 0}
else
  local missing = cost - tokens
  local retryMs = math.ceil((missing / max) * window)
  if retryMs < 1 then retryMs = 1 end
  redis.call('HMSET', key, 'tokens', tostring(tokens), 'lastRefill', lastRefill)
  redis.call('PEXPIRE', key, window * 2)
  return {0, retryMs}
end
`;
